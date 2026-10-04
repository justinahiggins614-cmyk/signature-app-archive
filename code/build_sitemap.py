#!/usr/bin/env python3
"""Build web assets for The Signature App Archive (run by the 2h drip after seed.py):

1. sitemap.xml          - sitemap INDEX -> sitemap-main.xml + sitemap-apps-N.xml batches
2. sitemap-main.xml     - home + the 30 ?cat= category pages
3. sitemap-apps-N.xml   - ?app= deep links, 1,000 URLs per file (modular batches)
4. apps-catalog.json    - standardized machine-readable feed: id, name, category,
                          platforms, tagline, description, deep link (full solve per app)
5. catalog/<cat>.html   - pre-rendered static HTML tables (ID, name, description)
                          for non-JS crawlers + catalog/index.html hub
"""
import datetime, gzip, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/signature-app-archive/"
TODAY = datetime.date.today().isoformat()
BATCH = 1000
CREATOR = "Justin Addam Higgins"


def esc(u):
    return u.replace("&", "&amp;")


def sh(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:500])
    return r.stdout


def families():
    return json.loads(sh(["node", "code/appgen.js", "families"]))


def solve(cat, seed, appid):
    return json.loads(sh(["node", "code/appgen.js", "solve", cat, str(seed), appid]))


def iter_rows():
    manifest = json.load(open(os.path.join(ROOT, "data", "manifest.json")))
    for c in manifest["chunks"]:
        with gzip.open(os.path.join(ROOT, "data", "chunks", c), "rt") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    yield json.loads(line)


def urlset(urls):
    parts = ['<?xml version="1.0" encoding="UTF-8"?>\n',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n']
    for u in urls:
        parts.append("<url><loc>%s</loc><lastmod>%s</lastmod></url>\n" % (esc(u), TODAY))
    parts.append("</urlset>\n")
    return "".join(parts)


def solve_all(rows):
    """Solve full records for every (appid, cat, seed) in ONE node process."""
    import subprocess as sp
    p = sp.Popen(["node", "code/solve_batch.js"], cwd=ROOT,
                 stdin=sp.PIPE, stdout=sp.PIPE, text=True)
    inp = "".join("%s|%d|%s\n" % (r[1], r[2], r[0]) for r in rows)
    out, _ = p.communicate(inp)
    recs = []
    for line in out.split("\n"):
        line = line.strip()
        if line:
            recs.append(json.loads(line))
    return recs


def main():
    fams = families()
    fmap = {f["key"]: f for f in fams}
    rows = list(iter_rows())
    app_urls = [BASE + "?app=" + r[0] for r in rows]
    solved = solve_all(rows)
    feed_apps = []
    by_cat = {}
    for r, o in zip(rows, solved):
        appid, cat = r[0], r[1]
        if "error" in o:
            raise RuntimeError("solve failed for %s: %s" % (appid, o["error"]))
        fm = fmap.get(cat, {})
        feed_apps.append({
            "id": appid,
            "name": o["name"],
            "category": fm.get("name", cat),
            "category_key": cat,
            "platforms": o.get("platforms", "Phone + PC"),
            "tagline": o.get("tagline", ""),
            "description": o.get("description", ""),
            "url": BASE + "?app=" + appid,
            "creator": CREATOR,
        })
        by_cat.setdefault(cat, []).append(feed_apps[-1])

    # --- sitemap-main.xml ---
    main_urls = [BASE, BASE + "browse.html"] + [BASE + "?cat=" + f["key"] for f in fams]
    open(os.path.join(ROOT, "sitemap-main.xml"), "w").write(urlset(main_urls))

    # --- sitemap-apps-N.xml batches ---
    batch_files = []
    for i in range(0, len(app_urls), BATCH):
        n = i // BATCH + 1
        fn = "sitemap-apps-%d.xml" % n
        open(os.path.join(ROOT, fn), "w").write(urlset(app_urls[i:i + BATCH]))
        batch_files.append(fn)

    # --- sitemap.xml as index ---
    parts = ['<?xml version="1.0" encoding="UTF-8"?>\n',
             '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/1.0">\n']
    for fn in ["sitemap-main.xml"] + batch_files:
        parts.append("<sitemap><loc>%s%s</loc><lastmod>%s</lastmod></sitemap>\n"
                     % (esc(BASE), fn, TODAY))
    parts.append("</sitemapindex>\n")
    open(os.path.join(ROOT, "sitemap.xml"), "w").write("".join(parts))

    # --- apps-catalog.json feed ---
    feed = {"site": "The Signature App Archive",
            "base": BASE,
            "updated": TODAY,
            "count": len(feed_apps),
            "goal": 1000000,
            "creator": CREATOR,
            "categories": [{"key": f["key"], "name": f["name"], "icon": f["icon"],
                            "blurb": f["blurb"]} for f in fams],
            "apps": feed_apps}
    open(os.path.join(ROOT, "apps-catalog.json"), "w").write(json.dumps(feed))

    # --- static catalog pages ---
    cdir = os.path.join(ROOT, "catalog")
    os.makedirs(cdir, exist_ok=True)

    def hesc(s):
        return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    for f in fams:
        key = f["key"]
        rows = by_cat.get(key, [])
        trs = []
        for a in rows:
            trs.append("<tr><td><a href=\"%s?app=%s\">%s</a></td><td>%s</td><td>%s</td></tr>"
                       % (BASE, hesc(a["id"]), hesc(a["id"]), hesc(a["name"]),
                          hesc(a["description"] or a["tagline"])))
        html = ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                "<title>%s apps — The Signature App Archive</title>"
                "<meta name=\"description\" content=\"Static catalog: every %s app in The Signature App Archive.\">"
                "<link rel=\"canonical\" href=\"%scatalog/%s.html\">"
                "<style>body{font-family:Arial,sans-serif;background:#070b16;color:#d7e3ff;"
                "max-width:1000px;margin:0 auto;padding:20px;line-height:1.55}"
                "h1{color:#c9a227}a{color:#9fc2ff}table{border-collapse:collapse;width:100%%}"
                "td,th{border:1px solid #2a3a5f;padding:6px 8px;text-align:left;vertical-align:top}"
                "th{color:#9aa4b2}</style></head><body>"
                "<p><a href=\"%s\">← The Signature App Archive</a> · <a href=\"%scatalog/\">All categories</a></p>"
                "<h1>%s %s — %d apps</h1>"
                "<p>Static catalog table for crawlers and readers. Every app also has a full page at its link.</p>"
                "<table><tr><th>App ID</th><th>Name</th><th>Description</th></tr>%s</table>"
                "<p>Original Signature-line apps by %s.</p></body></html>"
                % (hesc(f["name"]), hesc(f["name"]), BASE, key, BASE, BASE,
                   hesc(f["icon"]), hesc(f["name"]), len(rows), "".join(trs), hesc(CREATOR)))
        open(os.path.join(cdir, key + ".html"), "w").write(html)

    lis = "".join("<li><a href=\"%scatalog/%s.html\">%s %s</a> — %d apps</li>\n"
                  % (BASE, f["key"], hesc(f["icon"]), hesc(f["name"]), len(by_cat.get(f["key"], [])))
                  for f in fams)
    hub = ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
           "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
           "<title>Static app catalog — The Signature App Archive</title>"
           "<link rel=\"canonical\" href=\"%scatalog/\">"
           "<style>body{font-family:Arial,sans-serif;background:#070b16;color:#d7e3ff;"
           "max-width:800px;margin:0 auto;padding:20px;line-height:1.8}"
           "h1{color:#c9a227}a{color:#9fc2ff}</style></head><body>"
           "<p><a href=\"%s\">← The Signature App Archive</a></p>"
           "<h1>Static app catalog — %d apps, %d categories</h1>"
           "<p>Pre-rendered tables for crawlers; each row links to the app's full page.</p>"
           "<ul>%s</ul></body></html>"
           % (BASE, BASE, len(feed_apps), len(fams), lis))
    open(os.path.join(cdir, "index.html"), "w").write(hub)

    print("sitemap URLs: %d (main %d + app batches %d files)" %
          (len(main_urls) + len(app_urls), len(main_urls), len(batch_files)))
    print("feed apps:", len(feed_apps), "| static catalog pages:", len(fams) + 1)

    # --- re-stamp the static count line in index.html (never stale) ---
    ip = os.path.join(ROOT, "index.html")
    html = open(ip, encoding="utf-8").read()
    stamp = ('<p class="staticcount" id="staticcount">%s Signature apps on file across %d '
             'app categories, as of %s. Live count above.</p>' % (f"{len(feed_apps):,}", len(fams), TODAY))
    html2 = re.sub(r'<p class="staticcount"[^>]*>.*?</p>', stamp, html, flags=re.S)
    if html2 != html:
        open(ip, "w", encoding="utf-8").write(html2)
    print("static count stamped:", stamp[:100])

    # --- stamp the stats chips' initial content too (never boot as bare "...") ---
    # JS overwrites them live on every load; this is the no-JS / first-paint text.
    # Stable comment markers keep the replace robust against nested divs.
    stats_inner = ('<div class="stat"><b>%s</b><span>apps on file</span></div>'
                   '<div class="stat"><b>%d</b><span>app categories</span></div>'
                   '<div class="stat"><b>1,000,000</b><span>march goal</span></div>'
                   % (f"{len(feed_apps):,}", len(fams)))
    html = open(ip, encoding="utf-8").read()
    html3, n3 = re.subn(r'<!-- STATS-STAMP-START -->.*?<!-- STATS-STAMP-END -->',
                        '<!-- STATS-STAMP-START -->' + stats_inner + '<!-- STATS-STAMP-END -->',
                        html, flags=re.S, count=1)
    if n3 and html3 != html:
        if 'id="stats" data-stamped' not in html3:
            html3 = html3.replace('id="stats"', 'id="stats" data-stamped="%s"' % TODAY, 1)
        open(ip, "w", encoding="utf-8").write(html3)
    print("stats chips stamped (%d): %s" % (n3, stats_inner[:90]))


if __name__ == "__main__":
    main()
