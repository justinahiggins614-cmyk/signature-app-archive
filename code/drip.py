#!/usr/bin/env python3
"""2h drip for The Signature App Archive: +~1,000 apps/run toward 1,000,000.

Silent run: generates apps, rebuilds index/sitemap/api, commits + pushes.
800MB repo-size guard: if data/ exceeds the guard, do NOT push; report.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
GUARD = 800 * 1024 * 1024
PER_CAT = 34  # 30 categories x 34 = 1,020 apps/run

def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd), r.stderr[:800], file=sys.stderr)
        sys.exit(1)
    return r

def dir_size(p):
    total = 0
    for dp, _, fns in os.walk(p):
        for f in fns:
            total += os.path.getsize(os.path.join(dp, f))
    return total

def main():
    n_before = 0
    mp = os.path.join(DATA, "manifest.json")
    if os.path.exists(mp):
        n_before = json.load(open(mp)).get("count", 0)

    run([sys.executable, "code/seed.py", "--per-cat", str(PER_CAT)])
    run([sys.executable, "code/build_sitemap.py"])
    run([sys.executable, "code/build_browse.py"])  # AFTER index rebuild: fresh count, never one run behind
    run([sys.executable, "code/qa/checks.py"])

    size = dir_size(DATA)
    print("data dir: %.1f MB (guard 800 MB)" % (size / 1048576))

    n_after = json.load(open(mp)).get("count", 0)
    run(["git", "add", "-A"])
    r = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if r.returncode != 0:
        run(["git", "-c", "user.name=JAH System", "-c", "user.email=jah@apps.local",
             "commit", "-qm", "App drip: +%d apps (%d total)" % (n_after - n_before, n_after)])
        if size > GUARD:
            print("GUARD TRIPPED: data %.1f MB > 800 MB — NOT pushing" % (size / 1048576))
            print("STATUS: guard tripped, %d apps staged locally, push held" % n_after)
            return
        run(["git", "push", "-q", "origin", "main"])
    print("STATUS: +%d apps, %d total" % (n_after - n_before, n_after))

if __name__ == "__main__":
    main()
