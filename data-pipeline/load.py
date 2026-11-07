"""Generate supabase/seed.sql from data/clean/ (+ synthetic demo data).

`supabase db reset` then rebuilds the whole database in one command.

Real open data: institutions, specialties, services, practitioners, OSM/OHBP hours.
Synthetic (labelled): demo opening hours for practices in the demo cities,
3 patient personas, appointment slots (generated in SQL relative to today).
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent
CLEAN = ROOT / "data" / "clean"
SEED = ROOT.parent / "supabase" / "seed.sql"

DEMO_CITIES = ["Zagreb", "Split", "Rijeka", "Osijek", "Varaždin", "Dubrovnik"]
CITY_CENTRES = {  # lat, lng — city centre points for persona home locations
    "Zagreb": (45.8131, 15.9775),
    "Osijek": (45.5550, 18.6955),
    "Split": (43.5081, 16.4402),
}
GOOD_GEO = {"geoportal", "osm", "street"}

PERSONAS = [
    {
        "id": "00000000-0000-4000-8000-00000000a0a1",
        "name": "Ana Horvat",
        "birth_year": 1954,
        "home_city": "Zagreb",
        "email": "ana.demo@example.com",
        "note": "72 godine, Zagreb. Boli je uho dva dana → obiteljski liječnik → ORL.",
        "roles": ["obiteljski", "stomatolog", "ginekolog"],
    },
    {
        "id": "00000000-0000-4000-8000-00000000b0b2",
        "name": "Luka Kovačević",
        "birth_year": 2005,
        "home_city": "Osijek",
        "email": "luka.demo@example.com",
        "note": "21 godina, student u Varaždinu, liječnici u Osijeku. Zubobolja → izravno.",
        "roles": ["obiteljski", "stomatolog"],
    },
    {
        "id": "00000000-0000-4000-8000-00000000c0c3",
        "name": "Maja Babić",
        "birth_year": 1992,
        "home_city": "Split",
        "email": "maja.demo@example.com",
        "note": "34 godine, Split. Dijete (4 g.) ima temperaturu → pedijatar.",
        "roles": ["obiteljski", "stomatolog", "ginekolog", "pedijatar"],
    },
]


def q(v: object) -> str:
    """SQL literal."""
    if v is None or (isinstance(v, float) and math.isnan(v)) or v is pd.NA:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    s = str(v)
    if s == "" or s.lower() == "nan":
        return "null"
    return "'" + s.replace("'", "''") + "'"


def num(v: object) -> str:
    """Numeric SQL literal (NaN/empty → null)."""
    if v is None or (isinstance(v, float) and math.isnan(v)) or str(v).strip() in ("", "nan"):
        return "null"
    return str(v)


def point(lat: object, lng: object) -> str:
    if pd.isna(lat) or pd.isna(lng):
        return "null"
    return f"'SRID=4326;POINT({float(lng):.7f} {float(lat):.7f})'"


def inserts(table: str, cols: list[str], rows: list[list[str]], batch: int = 500) -> str:
    out = []
    for i in range(0, len(rows), batch):
        values = ",\n".join("(" + ", ".join(r) + ")" for r in rows[i : i + batch])
        out.append(f"insert into public.{table} ({', '.join(cols)}) values\n{values};\n")
    return "\n".join(out)


def demo_hours(inst: pd.DataFrame, real_hours: pd.DataFrame) -> pd.DataFrame:
    """Typical primary-care shifts for demo-city practices that have no hours in any
    source. Morning (07–14) or afternoon (13–20) by a stable hash. Clearly synthetic."""
    have = set(real_hours["institution_id"])
    pr = inst[
        (inst["type"] == "ordinacija") & inst["city"].isin(DEMO_CITIES) & ~inst["id"].isin(have)
    ]
    rows = []
    for iid in pr["id"]:
        morning = int(iid[-4:], 16) % 2 == 0
        opens, closes = ("07:00", "14:00") if morning else ("13:00", "20:00")
        rows += [
            {
                "institution_id": iid,
                "weekday": d,
                "opens": opens,
                "closes": closes,
                "is_on_call": False,
                "source": "demo_hand_filled",
            }
            for d in range(1, 6)
        ]
    return pd.DataFrame(rows)


def pick_doctor(prac: pd.DataFrame, inst: pd.DataFrame, role: str, city: str) -> str:
    cand = prac[prac["role"] == role].merge(
        inst[["id", "city", "geo_precision"]],
        left_on="institution_id",
        right_on="id",
        suffixes=("", "_i"),
    )
    cand = cand[(cand["city"] == city) & cand["geo_precision"].isin(GOOD_GEO)]
    if cand.empty:
        raise SystemExit(f"No geocoded {role} in {city} — run geocode.py first")
    return cand.sort_values("id").iloc[len(cand) // 2]["id"]  # stable, not the alphabetical first


def main() -> int:
    inst = pd.read_csv(CLEAN / "institutions.csv", dtype=str)
    svc = pd.read_csv(CLEAN / "institution_services.csv", dtype=str)
    prac = pd.read_csv(CLEAN / "practitioners.csv", dtype=str)
    hours = pd.read_csv(CLEAN / "institution_hours.csv", dtype=str)
    hours = pd.concat([hours, demo_hours(inst, hours)], ignore_index=True)

    spec = svc.sort_values("djel_code").drop_duplicates("specialty_code")[
        ["specialty_code", "specialty_name", "djel_code"]
    ]

    parts = [
        "-- GENERATED by data-pipeline/load.py — do not edit by hand.\n",
        "-- Open data: HZZO (data.gov.hr), Grad Zagreb geoportal, OpenStreetMap (ODbL).\n",
        "-- Synthetic: demo_hand_filled hours, patients, slots.\n\n",
        "set client_min_messages = warning;\n\n",
        inserts(
            "specialties",
            ["code", "name", "hzzo_code"],
            [[q(r.specialty_code), q(r.specialty_name), q(r.djel_code)] for r in spec.itertuples()],
        ),
        inserts(
            "institutions",
            [
                "id",
                "name",
                "type",
                "address",
                "postcode",
                "city",
                "geom",
                "geo_precision",
                "phone",
                "email",
                "web",
                "hzzo_code",
                "osm_id",
                "source_dataset",
            ],
            [
                [
                    q(r.id),
                    q(r.name),
                    q(r.type),
                    q(r.address),
                    q(r.postcode),
                    q(r.city),
                    point(r.lat, r.lng),
                    q(r.geo_precision),
                    q(r.phone),
                    q(r.email),
                    q(r.web),
                    q(r.hzzo_code),
                    q(r.osm_id),
                    q(r.source_dataset),
                ]
                for r in inst.itertuples()
            ],
        ),
        inserts(
            "institution_services",
            ["institution_id", "specialty_code", "units", "source_dataset"],
            [
                [q(r.institution_id), q(r.specialty_code), num(r.units), q(r.source_dataset)]
                for r in svc.drop_duplicates(["institution_id", "specialty_code"]).itertuples()
            ],
        ),
        inserts(
            "institution_hours",
            ["institution_id", "weekday", "opens", "closes", "is_on_call", "source"],
            [
                [
                    q(r.institution_id),
                    str(int(r.weekday)),
                    q(r.opens),
                    q(r.closes),
                    "true" if str(r.is_on_call).lower() == "true" else "false",
                    q(r.source),
                ]
                for r in hours.itertuples()
            ],
        ),
        inserts(
            "practitioners",
            [
                "id",
                "full_name",
                "role",
                "team_code",
                "institution_id",
                "provider_name",
                "status",
                "insured_count",
                "source_dataset",
            ],
            [
                [
                    q(r.id),
                    q(r.full_name),
                    q(r.role),
                    q(r.team_code),
                    q(r.institution_id),
                    q(r.provider_name),
                    q(r.status),
                    num(r.insured_count),
                    q(r.source_dataset),
                ]
                for r in prac.itertuples()
            ],
        ),
        "\n-- ---------------------------------------------------- SYNTHETIC personas\n",
    ]

    pp_rows = []
    for p in PERSONAS:
        lat, lng = CITY_CENTRES[p["home_city"]]
        parts.append(
            inserts(
                "patients",
                ["id", "name", "birth_year", "home_city", "home_geom", "email", "note"],
                [
                    [
                        q(p["id"]),
                        q(p["name"]),
                        str(p["birth_year"]),
                        q(p["home_city"]),
                        point(lat, lng),
                        q(p["email"]),
                        q(p["note"]),
                    ]
                ],
            )
        )
        for role in p["roles"]:
            pp_rows.append([q(p["id"]), q(role), q(pick_doctor(prac, inst, role, p["home_city"]))])
    parts.append(
        inserts("patient_practitioners", ["patient_id", "role", "practitioner_id"], pp_rows)
    )
    parts.append(
        "\n-- SYNTHETIC appointment slots for the next 3 weeks.\n"
        "select public.generate_demo_slots();\n"
    )

    SEED.write_text("".join(parts))
    n_demo = (hours["source"] == "demo_hand_filled").sum()
    print(f"wrote {SEED} ({SEED.stat().st_size / 1e6:.1f} MB)")
    print(
        f"  institutions {len(inst)}, with geom {inst['lat'].notna().sum()}; "
        f"services {len(svc)}; practitioners {len(prac)}; specialties {len(spec)}"
    )
    print(f"  hours {len(hours)} (demo_hand_filled rows: {n_demo})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
