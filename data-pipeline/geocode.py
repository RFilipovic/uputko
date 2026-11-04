"""Fill missing coordinates in data/clean/institutions.csv with Nominatim.

- 1 request/second (Nominatim usage policy), identifying User-Agent.
- Every answer (including "not found") is cached in data/cache/geocode.json,
  which is committed, so re-runs are instant and offline.
- Order: hospitals → demo cities → everything else. Street-level first,
  then postcode/city fallback (geo_precision says which one we got).

    .venv/bin/python geocode.py              # all
    .venv/bin/python geocode.py --limit 50   # quick partial run
    .venv/bin/python geocode.py --offline    # cache only, no network
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).parent
CLEAN = ROOT / "data" / "clean" / "institutions.csv"
CACHE = ROOT / "data" / "cache" / "geocode.json"
URL = "https://nominatim.openstreetmap.org/search"
UA = {"User-Agent": "Uputko-datathon/0.1 (https://github.com/RFilipovic/medicina-rada-xd)"}
DEMO_CITIES = {"Zagreb", "Split", "Rijeka", "Osijek", "Varaždin", "Dubrovnik"}
HR_BOX = (42.3, 46.6, 13.4, 19.5)  # lat_min, lat_max, lng_min, lng_max


class Geocoder:
    def __init__(self, offline: bool) -> None:
        self.offline = offline
        self.cache: dict[str, list[float] | None] = (
            json.loads(CACHE.read_text()) if CACHE.exists() else {}
        )
        self.last = 0.0
        self.calls = 0

    def save(self) -> None:
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(self.cache, ensure_ascii=False, indent=0, sort_keys=True))

    def lookup(self, params: dict[str, str]) -> list[float] | None:
        key = json.dumps(params, ensure_ascii=False, sort_keys=True)
        if key in self.cache:
            return self.cache[key]
        if self.offline:
            return None
        wait = 1.1 - (time.monotonic() - self.last)
        if wait > 0:
            time.sleep(wait)
        self.last = time.monotonic()
        try:
            r = requests.get(
                URL,
                params={**params, "format": "jsonv2", "limit": "1", "countrycodes": "hr"},
                headers=UA,
                timeout=30,
            )
            r.raise_for_status()
            hits = r.json()
        except requests.RequestException as e:
            print(f"  ! {e}", file=sys.stderr)
            return None  # not cached: retried next run
        result = None
        if hits:
            lat, lng = float(hits[0]["lat"]), float(hits[0]["lon"])
            if HR_BOX[0] <= lat <= HR_BOX[1] and HR_BOX[2] <= lng <= HR_BOX[3]:
                result = [lat, lng]
        self.cache[key] = result
        self.calls += 1
        if self.calls % 25 == 0:
            self.save()
        return result


def s(v: object) -> str:
    return "" if pd.isna(v) else str(v).strip()


def attempts(row: pd.Series) -> list[tuple[str, dict[str, str]]]:
    name, addr, pc, city = s(row["name"]), s(row["address"]), s(row["postcode"]), s(row["city"])
    out: list[tuple[str, dict[str, str]]] = []
    if addr:
        street = {"street": addr, "country": "Hrvatska"}
        if pc:
            out.append(("street", {**street, "postalcode": pc}))
        if city:
            out.append(("street", {**street, "city": city}))
    if row["id"].startswith("h-") and not addr:
        out.append(("name", {"q": f"{name}, Hrvatska"}))
    if pc:
        out.append(("postcode", {"postalcode": pc, "country": "Hrvatska"}))
    if city:
        out.append(("city", {"city": city, "country": "Hrvatska"}))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="max distinct addresses this run")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    df = pd.read_csv(CLEAN, dtype={"postcode": str, "hzzo_code": str})
    g = Geocoder(args.offline)

    todo = df[df["lat"].isna()].copy()
    todo["prio"] = 2
    todo.loc[todo["city"].isin(DEMO_CITIES), "prio"] = 1
    todo.loc[todo["id"].str.startswith("h-"), "prio"] = 0
    todo["addr_key"] = (
        todo[["name", "address", "postcode", "city"]].fillna("").astype(str).agg("|".join, axis=1)
    )
    todo.loc[~todo["id"].str.startswith("h-"), "addr_key"] = (
        todo[["address", "postcode", "city"]].fillna("").astype(str).agg("|".join, axis=1)
    )
    keys = todo.sort_values("prio").drop_duplicates("addr_key")
    if args.limit:
        keys = keys.head(args.limit)
    print(f"{len(todo)} institutions without coordinates, {len(keys)} distinct addresses to try")

    resolved: dict[str, tuple[float, float, str]] = {}
    try:
        for n, (_, row) in enumerate(keys.iterrows(), 1):
            for precision, params in attempts(row):
                hit = g.lookup(params)
                if hit:
                    resolved[row["addr_key"]] = (hit[0], hit[1], precision)
                    break
            if n % 100 == 0:
                print(f"  {n}/{len(keys)} (network calls: {g.calls})")
    finally:
        g.save()

    for idx, row in todo.iterrows():
        hit = resolved.get(row["addr_key"])
        if hit:
            df.at[idx, "lat"], df.at[idx, "lng"], df.at[idx, "geo_precision"] = hit
    df.to_csv(CLEAN, index=False)
    print(f"with coordinates: {df['lat'].notna().sum()}/{len(df)}")
    print(df["geo_precision"].value_counts(dropna=False).to_dict())
    return 0


if __name__ == "__main__":
    sys.exit(main())
