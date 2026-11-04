"""Download every source via the data.gov.hr CKAN API into data/raw/.

Writes data/raw/manifest.json with provenance (publisher, licence, URLs,
fetch time). Raw files are committed, so the rest of the pipeline never
needs the network. Re-run only to refresh the snapshot:

    .venv/bin/python fetch.py            # CKAN sources + OpenStreetMap
    .venv/bin/python fetch.py --no-osm
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import requests

from sources import CKAN, OSM_OVERPASS, SOURCES

RAW = Path(__file__).parent / "data" / "raw"
UA = {"User-Agent": "Uputko-datathon-pipeline/0.1 (open data prototype)"}

OSM_QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="HR"][admin_level=2]->.hr;
(
  nwr["amenity"~"^(hospital|clinic|doctors|dentist)$"](area.hr);
  nwr["healthcare"~"^(hospital|clinic|doctor|dentist|centre)$"](area.hr);
);
out center tags;
"""


def ckan_package(name: str) -> dict:
    r = requests.get(f"{CKAN}/package_show", params={"id": name}, headers=UA, timeout=60)
    r.raise_for_status()
    return r.json()["result"]


def fetch_ckan() -> list[dict]:
    entries = []
    for src in SOURCES:
        pkg = ckan_package(src.package)
        res = next(r for r in pkg["resources"] if src.url_contains in r["url"])
        print(f"→ {src.id}: {res['url']}")
        data = requests.get(res["url"], headers=UA, timeout=180)
        data.raise_for_status()
        path = RAW / f"{src.id}.{src.ext}"
        path.write_bytes(data.content)
        entries.append(
            {
                "id": src.id,
                "file": path.name,
                "note": src.note,
                "dataset_title": pkg["title"],
                "dataset_url": f"https://data.gov.hr/ckan/dataset/{pkg['name']}",
                "publisher": (pkg.get("organization") or {}).get("title"),
                "licence": pkg.get("license_title") or "TODO(verify): not stated in CKAN metadata",
                "resource_url": res["url"],
                "resource_last_modified": res.get("last_modified") or res.get("created"),
                "fetched_at": datetime.now(UTC).isoformat(timespec="seconds"),
                "bytes": len(data.content),
            }
        )
    return entries


def fetch_osm() -> dict:
    r = None
    for attempt, url in enumerate(OSM_OVERPASS * 2):
        print(f"→ osm: {url} (attempt {attempt + 1})")
        try:
            r = requests.post(url, data={"data": OSM_QUERY}, headers=UA, timeout=240)
            if r.ok and r.content.lstrip().startswith(b"{"):
                break
        except requests.RequestException as e:
            print(f"  failed: {e}")
        time.sleep(5)
    if r is None or not r.ok:
        raise RuntimeError("All Overpass endpoints failed")
    path = RAW / "osm_health.json"
    path.write_bytes(r.content)
    return {
        "id": "osm_health",
        "file": path.name,
        "note": "OpenStreetMap health amenities in Croatia (geo + opening_hours backfill).",
        "dataset_title": "OpenStreetMap — amenity=hospital|clinic|doctors|dentist",
        "dataset_url": "https://www.openstreetmap.org",
        "publisher": "OpenStreetMap contributors",
        "licence": "ODbL 1.0",
        "resource_url": r.url,
        "fetched_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "bytes": len(r.content),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-osm", action="store_true")
    ap.add_argument("--only-osm", action="store_true")
    args = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    manifest_path = RAW / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        manifest = {e["id"]: e for e in json.loads(manifest_path.read_text())}

    def save() -> None:
        manifest_path.write_text(
            json.dumps(list(manifest.values()), ensure_ascii=False, indent=2) + "\n"
        )

    if not args.only_osm:
        manifest.update({e["id"]: e for e in fetch_ckan()})
        save()
    if not args.no_osm:
        e = fetch_osm()
        manifest[e["id"]] = e
        save()
    print(f"Saved {len(manifest)} sources to {RAW}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
