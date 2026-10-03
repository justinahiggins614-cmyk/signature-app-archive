# The Signature App Archive — million-app architecture

## Current design (11,700 apps, 2026-10-03)

Records are **deterministic, not stored per app**. The archive keeps:

- `data/index.json.gz` — compact JSONL rows `[id, family, seed, name, tagline]`
  (11,700 rows; ~1 MB). Loaded once by the homepage for search/browse.
- `data/chunks/app-cNNNNN.json.gz` — 100-app shards of the same rows (117 files).
  The shard of record; the index is rebuilt from them.
- `data/manifest.json` — the single authoritative count source (total,
  per-category, ID range, index SHA-256, engine version, timestamp).
- Full records are solved client-side from `(family, seed, id)` by
  `code/appgen.js` (`SigApp.solveFull`). Same inputs → same record, forever.
- `apps-catalog.json` — machine-readable feed rebuilt by `code/build_sitemap.py`.
- `sitemap-apps-N.xml` — 1,000 `?app=` URLs per file (12 files now).

Because the full record is computed, archive growth costs ~90 bytes per app in
the index. One million apps ≈ ~90 MB index — too big to ship to a browser.

## Cutover plan (triggers automatically by size)

1. **Per-category index shards** (`data/index/by-cat/<key>.json.gz`): when
   `data/index.json.gz` exceeds 10 MB, the homepage loads only the manifest +
   the category shards the user browses. Global ID lookup stays O(1) via the
   ID→(shard, offset) map in the manifest.
2. **ID-range shards** (`data/index/by-id/app-000001-100000.json.gz`): same
   trigger; keeps exact `?app=` resolution without the full index.
3. **Search index shards**: keyword → ID lists, sharded by keyword hash,
   lazy-loaded on first search.
4. **Frozen old shards**: once a shard's ID range is sealed (no new apps will
   ever land in it), it becomes immutable and cacheable forever. New apps
   always append to the open tail shard.

## Incremental updates

The 2h drip (`code/drip.py`) appends new apps per category, reseals only the
tail chunk, rebuilds the index + manifest + sitemap + api.json, runs the QA
gates (`code/qa/`), and only then commits. It never rewrites sealed history.

## Snapshots

Each drip stamps `archive_version` (date) and `index_version` (monotonic) in
the manifest, plus `index_sha256`. `health.json` records the gate results per
build. Together they form a verifiable release history.

## What "works in your browser" means (machine-verifiable)

- `BROWSER_DEMO=WORKING` — every category maps to a live `DEMOS` renderer
  (verified by `code/qa/checks.py` on every build).
- `DEMO_MODE=LOCAL`, `DEMO_SCOPE=DEMO` — the browser experience is a working
  demo of the app class, not a full production application.
- `OFFLINE_HTML` / `PYTHON_COMPANION` / `THUMBDRIVE_PACK` = AVAILABLE.
- `RECORD=DETERMINISTIC` — verified by `code/qa/test_determinism.py` and by
  the in-browser VERIFY control, which re-solves the record and compares.
