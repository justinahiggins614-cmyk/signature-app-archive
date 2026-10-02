#!/usr/bin/env python3
"""Seed / drip The Signature App Archive.

Generates N new apps per category via the deterministic JS generator
(node code/appgen.js batch), appends compact rows to gz chunks, and
rebuilds manifest + index + sitemap + api.json.

Usage: python3 code/seed.py --per-cat 50
"""
import argparse, gzip, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHUNKS = os.path.join(DATA, "chunks")
CHUNK_SIZE = 100

def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise RuntimeError("node failed: " + r.stderr[:500])
    return r.stdout

def families():
    return json.loads(sh(["node", "code/appgen.js", "families"]))

def load_state():
    p = os.path.join(DATA, "state.json")
    if os.path.exists(p):
        return json.load(open(p))
    return {"next_seed": {}}

def iter_rows(chunks):
    for c in chunks:
        with gzip.open(os.path.join(CHUNKS, c), "rt") as fh:
            for l in fh:
                if l.strip():
                    yield json.loads(l)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-cat", type=int, default=50)
    a = ap.parse_args()
    os.makedirs(CHUNKS, exist_ok=True)

    fams = families()
    state = load_state()
    ns = state.setdefault("next_seed", {})

    manifest_p = os.path.join(DATA, "manifest.json")
    manifest = json.load(open(manifest_p)) if os.path.exists(manifest_p) else {"chunks": [], "count": 0}
    base_index = manifest.get("count", 0)

    new_rows = []
    for f in fams:
        key = f["key"]
        start = ns.get(key, 1)
        raw = sh(["node", "code/appgen.js", "batch", key, str(start), str(a.per_cat), str(base_index + len(new_rows))])
        outs = json.loads(raw)
        new_rows.extend(outs)
        ns[key] = start + a.per_cat
        print("  %s: seeds %d..%d" % (key, start, start + a.per_cat - 1), flush=True)

    chunks = manifest["chunks"]
    buf = []
    if chunks:
        last = chunks[-1]
        with gzip.open(os.path.join(CHUNKS, last), "rt") as fh:
            buf = [json.loads(l) for l in fh if l.strip()]
        if len(buf) < CHUNK_SIZE:
            os.remove(os.path.join(CHUNKS, last))
            chunks.pop()
        else:
            buf = []
    for row in new_rows:
        buf.append(row)
        if len(buf) >= CHUNK_SIZE:
            name = "app-c%05d.json.gz" % len(chunks)
            with gzip.open(os.path.join(CHUNKS, name), "wt") as fh:
                for r in buf:
                    fh.write(json.dumps(r, separators=(",", ":")) + "\n")
            chunks.append(name)
            buf = []
    if buf:
        name = "app-c%05d.json.gz" % len(chunks)
        with gzip.open(os.path.join(CHUNKS, name), "wt") as fh:
            for r in buf:
                fh.write(json.dumps(r, separators=(",", ":")) + "\n")
        chunks.append(name)

    manifest["chunks"] = chunks
    manifest["count"] = base_index + len(new_rows)
    manifest["per_cat"] = {k: v - 1 for k, v in ns.items()}
    json.dump(manifest, open(manifest_p, "w"), indent=1)
    json.dump(state, open(os.path.join(DATA, "state.json"), "w"), indent=1)

    with gzip.open(os.path.join(DATA, "index.json.gz"), "wt") as fh:
        for r in iter_rows(chunks):
            fh.write(json.dumps(r, separators=(",", ":")) + "\n")

    api = {
        "site": "The Signature App Archive",
        "apps": manifest["count"],
        "goal": 1000000,
        "categories": [{"key": f["key"], "name": f["name"], "icon": f["icon"], "blurb": f["blurb"]} for f in fams],
        "manifest": "data/manifest.json",
        "index": "data/index.json.gz",
    }
    json.dump(api, open(os.path.join(ROOT, "api.json"), "w"), indent=1)
    print("TOTAL apps:", manifest["count"])

if __name__ == "__main__":
    main()
