#!/usr/bin/env python3
"""Regenerate the authoritative manifest + api.json from existing data.

Recomputes every derived field (counts, per-category totals, ID range,
index hash, engine hash, timestamps) without adding apps. Safe to run
any time; the 2h drip calls seed.py which writes the same fields.
"""
import datetime, gzip, hashlib, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHUNKS = os.path.join(DATA, "chunks")
BASE = "https://justinahiggins614-cmyk.github.io/signature-app-archive/"
SCHEMA_VERSION = "JAH-APP-RECORD/1.0"


def main():
    mp = os.path.join(DATA, "manifest.json")
    manifest = json.load(open(mp)) if os.path.exists(mp) else {"chunks": [], "count": 0}
    chunks = manifest.get("chunks", [])

    count = 0
    per_cat = {}
    first_id = None
    last_id = None
    for c in chunks:
        with gzip.open(os.path.join(CHUNKS, c), "rt") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                r = json.loads(line)
                count += 1
                per_cat[r[1]] = per_cat.get(r[1], 0) + 1
                if first_id is None:
                    first_id = r[0]
                last_id = r[0]

    idx_path = os.path.join(DATA, "index.json.gz")
    idx_sha = hashlib.sha256(open(idx_path, "rb").read()).hexdigest() if os.path.exists(idx_path) else None
    idx_bytes = os.path.getsize(idx_path) if os.path.exists(idx_path) else 0
    ag_path = os.path.join(ROOT, "code", "appgen.js")
    engine_v = hashlib.sha256(open(ag_path, "rb").read()).hexdigest()[:16]

    manifest.update({
        "site": "The Signature App Archive",
        "site_id": "SIGNATURE-APP-ARCHIVE",
        "count": count,
        "per_cat": per_cat,
        "categories": len(per_cat),
        "earliest_id": first_id,
        "latest_id": last_id,
        "chunk_size": 100,
        "archive_version": datetime.date.today().isoformat(),
        "goal": 1000000,
        "base_url": BASE,
        "schema_version": SCHEMA_VERSION,
        "index_version": manifest.get("index_version", 0) + 1,
        "app_engine_version": engine_v,
        "index_sha256": idx_sha,
        "index_bytes": idx_bytes,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    json.dump(manifest, open(mp, "w"), indent=1)

    fams = json.loads(__import__("subprocess").run(
        ["node", "code/appgen.js", "families"], capture_output=True, text=True, cwd=ROOT).stdout)
    api = {
        "site": "The Signature App Archive",
        "site_id": "SIGNATURE-APP-ARCHIVE",
        "api_version": "1.0",
        "apps": count,
        "goal": 1000000,
        "categories": [{"key": f["key"], "name": f["name"], "icon": f["icon"], "blurb": f["blurb"]} for f in fams],
        "manifest": "data/manifest.json",
        "index": "data/index.json.gz",
        "record_schema": "app.schema.json",
        "ai_manifest": "ai-manifest.json",
        "llms": "llms.txt",
        "schema_version": SCHEMA_VERSION,
        "index_sha256": idx_sha,
        "app_engine_version": engine_v,
        "generated_at": manifest["generated_at"],
        "deep_links": {"app": "?app=JAH-APP-000001", "category": "?cat=word"},
        "id_format": "JAH-APP-###### (zero-padded, never reused)",
    }
    json.dump(api, open(os.path.join(ROOT, "api.json"), "w"), indent=1)
    print("manifest refreshed: %d apps, %d categories, index %s" % (count, len(per_cat), (idx_sha or "")[:12]))


if __name__ == "__main__":
    main()
