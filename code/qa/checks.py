#!/usr/bin/env python3
"""Build gates for The Signature App Archive. Exit 1 on ANY failure.

1. manifest.count == index rows == chunk rows == api.json apps == apps-catalog count
2. sitemap ?app= URL count == manifest.count; all sitemap XML valid
3. IDs unique, contiguous JAH-APP-000001..NNNNNN, zero-padded 6
4. every row's category is one of the families; every family has >=1 app
5. every family's demo key(s) exist in the DEMOS registry (code/demos.js)
6. every demo key has a Python template (code/pytmpl.json)
7. chunk files are valid gzip with valid JSONL rows
8. api.json + data/manifest.json parse and carry the required authority fields
9. index.html static count line matches the manifest (no stale hard-coded count)
10. no license field in JSON-LD blocks
11. every inline <script> block in index.html: no unescaped </script inside the
    block (the 2026-10-05 Profiles-v2 leak: a literal </script inside a JS string
    closed the block early and spilled code as page text) and node --check clean
"""
import gzip, json, os, re, subprocess, sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")
BASE = "https://justinahiggins614-cmyk.github.io/signature-app-archive/"
fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" — " + detail) if detail and not cond else ""))
    if not cond:
        fails.append(name)


def node_json(args):
    r = subprocess.run(["node"] + args, capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:300])
    return json.loads(r.stdout)


fams = node_json(["code/appgen.js", "families"])
fam_keys = [f["key"] for f in fams]
NFAM = len(fams)
check("families present (>=31)", NFAM >= 31, "got %d" % NFAM)

manifest = json.load(open(os.path.join(DATA, "manifest.json")))
for f in ["count", "per_cat", "earliest_id", "latest_id", "schema_version",
          "index_sha256", "app_engine_version", "generated_at", "chunks"]:
    check("manifest has " + f, f in manifest)

chunks = manifest["chunks"]
rows = []
for c in chunks:
    p = os.path.join(DATA, "chunks", c)
    try:
        with gzip.open(p, "rt") as fh:
            for line in fh:
                if line.strip():
                    rows.append(json.loads(line))
    except Exception as e:
        check("chunk gzip valid: " + c, False, str(e)[:100])
check("all chunks gzip-valid", True)

idx_rows = []
with gzip.open(os.path.join(DATA, "index.json.gz"), "rt") as fh:
    for line in fh:
        if line.strip():
            idx_rows.append(json.loads(line))

n = manifest["count"]
check("manifest.count == index rows", n == len(idx_rows), "%d vs %d" % (n, len(idx_rows)))
check("manifest.count == chunk rows", n == len(rows), "%d vs %d" % (n, len(rows)))
check("index rows == chunk rows (ids)", [r[0] for r in idx_rows] == [r[0] for r in rows])

ids = [r[0] for r in rows]
check("IDs unique", len(set(ids)) == len(ids), "dupes: %d" % (len(ids) - len(set(ids))))
expect = ["JAH-APP-%06d" % i for i in range(1, n + 1)]
check("IDs contiguous JAH-APP-000001..%06d" % n, ids == expect)
check("ID format", all(re.match(r"^JAH-APP-\d{6}$", i) for i in ids))
check("earliest/latest match", manifest["earliest_id"] == expect[0] and manifest["latest_id"] == expect[-1])

bad_cat = [r[0] for r in rows if r[1] not in fam_keys]
check("all rows reference real categories", not bad_cat, str(bad_cat[:3]))
per = {}
for r in rows:
    per[r[1]] = per.get(r[1], 0) + 1
check("every family has apps", all(k in per for k in fam_keys))
check("per_cat matches", manifest.get("per_cat") == {k: per.get(k, 0) for k in fam_keys} or
      all(manifest.get("per_cat", {}).get(k) == per.get(k, 0) for k in fam_keys),
      "manifest per_cat out of sync")

demos_src = open(os.path.join(ROOT, "code", "demos.js")).read()
demo_keys = set(re.findall(r"DEMOS\.([a-z]+)\s*=", demos_src))
fam_demos = {}
for f in fams:
    for d in f.get("demos") or [f["demo"]]:
        fam_demos.setdefault(f["key"], []).append(d)
missing_demo = [(k, d) for k, ds in fam_demos.items() for d in ds if d not in demo_keys]
check("every family demo has a DEMOS renderer", not missing_demo, str(missing_demo))
pytmpl = json.load(open(os.path.join(ROOT, "code", "pytmpl.json")))
all_demo_keys = {d for ds in fam_demos.values() for d in ds}
missing_py = [d for d in all_demo_keys if d not in pytmpl]
check("every demo has a Python template", not missing_py, str(missing_py))

api = json.load(open(os.path.join(ROOT, "api.json")))
check("api.json apps == manifest", api.get("apps") == n, "%s vs %d" % (api.get("apps"), n))
check("api.json index_sha256 == manifest", api.get("index_sha256") == manifest.get("index_sha256"))

cat = json.load(open(os.path.join(ROOT, "apps-catalog.json")))
check("apps-catalog.json count == manifest", cat.get("count") == n, "%s vs %d" % (cat.get("count"), n))

app_urls = 0
for fn in sorted(os.listdir(ROOT)):
    if re.match(r"sitemap-apps-\d+\.xml$", fn):
        try:
            root = ET.parse(os.path.join(ROOT, fn)).getroot()
            ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
            locs = [u.find(ns + "loc").text for u in root]
            app_urls += len(locs)
            bad = [l for l in locs if not re.match(re.escape(BASE) + r"\?app=JAH-APP-\d{6}$", l)]
            check("sitemap URL shape: " + fn, not bad, str(bad[:2]))
        except Exception as e:
            check("sitemap XML valid: " + fn, False, str(e)[:100])
check("sitemap ?app= URLs == manifest", app_urls == n, "%d vs %d" % (app_urls, n))

html = open(os.path.join(ROOT, "index.html")).read()
m = re.search(r'<p class="staticcount"[^>]*>(.*?)</p>', html, re.S)
check("static count line present", bool(m))
if m:
    txt = m.group(1)
    check("static count matches manifest", ("%s Signature apps" % f"{n:,}" in txt) and
          (("%d app categories" % NFAM) in txt), txt[:90])
check("no stale 1,500 count", "1,500 Signature apps" not in html)
# stamped stats chips: initial raw-HTML content must carry the real count (never bare "...")
sm = re.search(r'<div class="stats" id="stats"[^>]*>(.*?)<!-- STATS-STAMP-END -->', html, re.S)
check("stamped stats chips present", bool(sm))
if sm:
    check("stamped stats count matches manifest",
          ('<b>%s</b>' % f"{n:,}") in sm.group(1) and ("<b>%d</b>" % NFAM) in sm.group(1), sm.group(1)[:80])
check("no bare ... stats boot", '<b>\u2026</b><span>loading</span>' not in html)
ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
check("no license field in JSON-LD", not any('"license"' in b for b in ld_blocks))

# gate 11: inline script blocks must not leak (2026-10-05 Profiles-v2 incident)
js_blocks = []
for m in re.finditer(r'<script(\s[^>]*)?>(.*?)</script>', html, re.S):
    attrs = m.group(1) or ""
    if "src=" in attrs or "application/ld+json" in attrs:
        continue
    js_blocks.append(m.group(2))
check("inline <script> blocks found", bool(js_blocks))
unesc = []
for i, b in enumerate(js_blocks):
    for mm in re.finditer(r"</script", b):
        if b[mm.start() - 1] != "\\":
            unesc.append(i)
            break
check("no unescaped </script inside inline scripts", not unesc, "blocks %s" % unesc)
try:
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as tf:
        tf.write("\n;\n".join(js_blocks))
        tpath = tf.name
    r = subprocess.run(["node", "--check", tpath],
                       capture_output=True, text=True, cwd=ROOT)
    os.unlink(tpath)
    check("inline scripts node --check clean", r.returncode == 0, r.stderr[:200])
except Exception as e:
    check("inline scripts node --check clean", False, str(e)[:100])

print()
if fails:
    print("GATES FAILED: %d — %s" % (len(fails), "; ".join(fails)))
    sys.exit(1)
print("ALL QA GATES PASS (%d apps)" % n)
