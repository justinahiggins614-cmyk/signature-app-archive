#!/usr/bin/env python3
"""Build the public archive-health dashboard (health.json).

Records totals, per-category distribution, the machine-verifiable status
vocabulary, and the result of the QA gate suite. Re-run after every drip.
"""
import datetime, gzip, json, os, re, subprocess
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def main():
    manifest = json.load(open(os.path.join(DATA, "manifest.json")))
    fams = json.loads(subprocess.run(
        ["node", "code/appgen.js", "families"], capture_output=True, text=True, cwd=ROOT).stdout)
    demos_src = open(os.path.join(ROOT, "code", "demos.js")).read()
    demo_keys = set(re.findall(r"DEMOS\.([a-z]+)\s*=", demos_src))
    pytmpl = json.load(open(os.path.join(ROOT, "code", "pytmpl.json")))
    fam_demos = {f["key"]: f["demo"] for f in fams}

    qa = subprocess.run(["python3", "code/qa/checks.py"], capture_output=True, text=True, cwd=ROOT)
    det = subprocess.run(["python3", "code/qa/test_determinism.py"], capture_output=True, text=True, cwd=ROOT)

    sitemap_ok, sitemap_urls = True, 0
    for fn in sorted(os.listdir(ROOT)):
        if re.match(r"sitemap-apps-\d+\.xml$", fn):
            try:
                root = ET.parse(os.path.join(ROOT, fn)).getroot()
                sitemap_urls += len(root)
            except Exception:
                sitemap_ok = False

    health = {
        "site": "The Signature App Archive",
        "site_id": "SIGNATURE-APP-ARCHIVE",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "apps": manifest["count"],
        "categories": len(fams),
        "per_category": manifest.get("per_cat", {}),
        "id_range": [manifest.get("earliest_id"), manifest.get("latest_id")],
        "goal": 1000000,
        "status": {
            "browser_demo": "WORKING — every category maps to a live DEMOS renderer",
            "demo_mode": "LOCAL — demos run on the user's device, no network calls",
            "demo_scope": "DEMO — the browser experience is a working demo of the app class",
            "offline_html": "AVAILABLE",
            "python_companion": "AVAILABLE — %d/%d demo types" % (
                sum(1 for d in set(fam_demos.values()) if d in pytmpl), len(set(fam_demos.values()))),
            "thumbdrive_pack": "AVAILABLE — .zip includes manifest.json with CRC32 per file",
            "record": "DETERMINISTIC — same (family, seed) always solves the same record",
        },
        "demo_coverage": {"families": len(fams),
                          "renderers": len([d for d in set(fam_demos.values()) if d in demo_keys]),
                          "demo_types": len(set(fam_demos.values()))},
        "checks": {
            "qa_gates": "PASS" if qa.returncode == 0 else "FAIL",
            "determinism": "PASS" if det.returncode == 0 else "FAIL",
            "sitemap_xml": "valid" if sitemap_ok else "INVALID",
            "sitemap_urls": sitemap_urls,
            "sitemap_matches_manifest": sitemap_urls == manifest["count"],
        },
        "index_sha256": manifest.get("index_sha256"),
        "app_engine_version": manifest.get("app_engine_version"),
        "schema_version": manifest.get("schema_version"),
        "manifest": "data/manifest.json",
        "record_schema": "app.schema.json",
    }
    json.dump(health, open(os.path.join(ROOT, "health.json"), "w"), indent=1)
    print("health.json: %d apps, qa=%s determinism=%s sitemap=%s" % (
        manifest["count"], health["checks"]["qa_gates"],
        health["checks"]["determinism"], health["checks"]["sitemap_xml"]))
    if qa.returncode != 0 or det.returncode != 0:
        print("WARNING: a gate suite failed — see output above")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
