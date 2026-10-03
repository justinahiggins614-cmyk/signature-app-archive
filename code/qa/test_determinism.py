#!/usr/bin/env python3
"""Determinism regression for the Signature app engine.

Same (family, seed) must always solve to the same record — across repeated
runs and across a sample of every category. Also verifies batch() ID
assignment is contiguous and solveFull() honors the given ID.
Exit 1 on ANY failure.
"""
import json, subprocess, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
fails = []


def node(args, stdin_text=None):
    r = subprocess.run(["node"] + args, capture_output=True, text=True,
                       cwd=ROOT, input=stdin_text)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:300])
    return r.stdout


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" — " + detail) if detail and not cond else ""))
    if not cond:
        fails.append(name)


fams = json.loads(node(["code/appgen.js", "families"]))
fam_keys = [f["key"] for f in fams]

# 1. repeated solve -> identical record, for a sample of categories
sample = fam_keys[:10] + fam_keys[-5:]
for key in sample:
    a = node(["code/appgen.js", "solve", key, "42", "JAH-APP-000042"])
    b = node(["code/appgen.js", "solve", key, "42", "JAH-APP-000042"])
    check("deterministic solve: " + key, a == b)
    o = json.loads(a)
    check("solve honors ID: " + key, o["id"] == "JAH-APP-000042")
    check("solve has full record: " + key,
          all(k in o for k in ["name", "description", "features", "how_to",
                               "versions", "requirements", "demo", "lineage"]))

# 2. different seeds -> different names (engine actually varies)
a = json.loads(node(["code/appgen.js", "solve", "word", "1", "JAH-APP-000001"]))
b = json.loads(node(["code/appgen.js", "solve", "word", "2", "JAH-APP-000002"]))
check("seed varies output", a["name"] != b["name"] or a["features"] != b["features"])

# 3. batch() IDs contiguous and rows well-formed
out = node(["code/appgen.js", "batch", "word", "1", "5", "100"])
rows = json.loads(out)
check("batch row count", len(rows) == 5)
check("batch IDs contiguous", [r[0] for r in rows] ==
      ["JAH-APP-000101", "JAH-APP-000102", "JAH-APP-000103", "JAH-APP-000104", "JAH-APP-000105"])
check("batch rows are [id,cat,seed,name,tagline]",
      all(len(r) == 5 and r[1] == "word" for r in rows))

# 4. solve_batch.js (used by build_sitemap) agrees with appgen.js
inp = "word|7|JAH-APP-000007\nsheet|9|JAH-APP-000009\n"
out = node(["code/solve_batch.js"], stdin_text=inp)
recs = [json.loads(l) for l in out.split("\n") if l.strip()]
check("solve_batch row count", len(recs) == 2, "got %d" % len(recs))
direct = json.loads(node(["code/appgen.js", "solve", "word", "7", "JAH-APP-000007"]))
check("solve_batch agrees with appgen.js", recs[0] == direct)

# 5. unknown category raises, never silently invents
r = subprocess.run(["node", "code/appgen.js", "solve", "nope", "1", "JAH-APP-000001"],
                   capture_output=True, text=True, cwd=ROOT)
check("unknown category errors loudly", r.returncode != 0 or "error" in r.stdout.lower() + r.stderr.lower())

print()
if fails:
    print("DETERMINISM FAILED: %s" % "; ".join(fails))
    sys.exit(1)
print("ALL DETERMINISM TESTS PASS")
