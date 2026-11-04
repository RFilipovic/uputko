"""Clean, normalise, join and dedupe the raw snapshots into data/clean/.

Reads only data/raw/ (committed), so it is deterministic and offline.

Outputs (CSV, UTF-8):
  institutions.csv          hospitals, practices (ordinacije), Zagreb DZ/ustanove
  institution_services.csv  institution ↔ specialty (from HZZO contracted services)
  practitioners.csv         chosen-doctor candidates (obiteljski, pedijatar, ginekolog, stomatolog)
  institution_hours.csv     opening hours where a source has them (OSM, OHBP 0–24)

Coordinates come from (best first): Zagreb geoportal, OpenStreetMap match,
then geocode.py (Nominatim) for whatever is still missing.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import unicodedata
import warnings
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz, process

warnings.filterwarnings("ignore")

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
CLEAN = ROOT / "data" / "clean"

ROLE_BY_FILE = {
    "opca": ("obiteljski", "obiteljska-medicina", "Obiteljska (opća) medicina"),
    "ped": ("pedijatar", "pedijatrija-pzz", "Pedijatrija (primarna)"),
    "gin": ("ginekolog", "ginekologija-pzz", "Zdravstvena zaštita žena"),
    "dent": ("stomatolog", "dentalna-medicina", "Dentalna medicina"),
}

# Words kept lowercase when title-casing official ALL-CAPS names.
LOWER_WORDS = {
    "i",
    "u",
    "na",
    "za",
    "od",
    "do",
    "s",
    "sa",
    "pri",
    "dr.",
    "prim.",
    "klinički",
    "kliničke",
    "klinička",
    "bolnički",
    "bolnica",
    "bolnice",
    "centar",
    "opća",
    "županijska",
    "specijalna",
    "dom",
    "zdravlja",
    "poliklinika",
    "ordinacija",
    "medicine",
    "medicinu",
    "bolesti",
    "zaštite",
    "zdravstvena",
    "ustanova",
    "psihijatrijska",
    "lječilište",
    "županije",
    "dentalne",
    "opće",
    "obiteljske",
    "liječenje",
    "produženo",
    "kronične",
    "ortopediju",
    "psihijatriju",
    "rehabilitaciju",
    "medicinsku",
    "dječje",
    "dječja",
    "klinika",
    "neuropsihijatrijska",
    "infektivne",
    "palijativnu",
    "skrb",
    "cesta",
    "ulica",
    "lokacija",
    "zdravstvenu",
    "dobi",
    "kardiovaskularne",
    "medicinskog",
    "fakulteta",
    "sveučilišta",
    "zavod",
    "hitnu",
    "ispostava",
    "njegu",
    "kući",
    "zaštitu",
    "djece",
    "mladih",
    "grada",
    "transfuzijsku",
    "javno",
    "zdravstvo",
    "trg",
    "obala",
}


# ---------------------------------------------------------------- helpers


def ascii_fold(s: str) -> str:
    s = s.replace("đ", "dj").replace("Đ", "Dj")
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def slugify(s: str) -> str:
    s = ascii_fold(s.lower())
    s = re.sub(r"\(.*?\)", lambda m: " " + m.group(0)[1:-1] + " ", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def clean_str(v: object) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()


def title_hr(s: str) -> str:
    """'KLINIČKA BOLNICA "SVETI DUH"' → 'Klinička bolnica "Sveti Duh"'."""
    s = re.sub(r"\b(DR|SV|PRIM)\.(?=\S)", r"\1. ", clean_str(s), flags=re.I)
    out = []
    for i, w in enumerate(s.lower().split(" ")):
        bare = w.strip('"„“()')
        if i > 0 and bare in LOWER_WORDS:
            out.append(w)
        else:
            out.append(
                re.sub(r"[a-zčćđšž]", lambda m: m.group(0).upper(), w, count=1)
                if not w.startswith(("„", '"', "("))
                else w[0] + w[1:2].upper() + w[2:]
            )
    # Hyphenated parts (Bjelovarsko-Bilogorske → Bjelovarsko-bilogorske stays readable)
    return " ".join(out)


def name_case(s: str) -> str:
    """Person names: 'TURČIĆ KAJMAK' → 'Turčić Kajmak', 'ANA-MARIJA' → 'Ana-Marija'."""
    s = clean_str(s).lower()
    return re.sub(r"(^|[\s\-'])([a-zčćđšž])", lambda m: m.group(1) + m.group(2).upper(), s)


def stable_id(*parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()
    return h[:16]


def norm_hospital(s: str) -> str:
    s = ascii_fold(clean_str(s).upper())
    s = re.sub(r"[\"'„“”.,]", " ", s)
    for a, b in [
        ("DR ", ""),
        ("OPCA ZUPANIJSKA", "OB"),
        ("OPCA BOLNICA", "OB"),
        ("ZUPANIJSKA BOLNICA", "OB"),
        ("KLINICKI BOLNICKI CENTAR", "KBC"),
        ("KLINICKA BOLNICA", "KB"),
    ]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def institution_type(name: str) -> str:
    n = ascii_fold(clean_str(name).upper())
    if "KLINICKI BOLNICKI CENTAR" in n:
        return "KBC"
    if "KLINICKA BOLNICA" in n:
        return "KB"
    if n.startswith("KLINIKA") or " KLINIKA" in n:
        return "klinika"
    if "OPCA" in n or "ZUPANIJSKA BOLNICA" in n:
        return "OB"
    if "DOM ZDRAVLJA" in n:
        return "DZ"
    if "POLIKLINIKA" in n:
        return "poliklinika"
    if any(k in n for k in ("BOLNICA", "LJECILISTE", "THALASSO")):
        return "specijalna_bolnica"
    return "ostalo"


# ---------------------------------------------------------------- hospitals


def load_hospital_addresses() -> pd.DataFrame:
    df = pd.read_excel(RAW / "hzzo_bolnice.xls", header=None, skiprows=1, dtype=str)
    df = df.iloc[:, :6]
    df.columns = ["rb", "name", "postcode", "city", "address", "phone"]
    df = df[df["name"].notna() & df["rb"].fillna("").str.strip().str.isdigit()]
    return df.assign(key=df["name"].map(norm_hospital))


def load_hospital_services() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (hospitals[hzzo_code, name], services[hzzo_code, djel_code, djel_name, units])."""
    m = pd.read_excel(
        RAW / "hzzo_bolnicki_sadrzaji.xls",
        sheet_name="ordinacije_dijag_fizioterapeuti",
        header=None,
        dtype=str,
    )
    codes, names = m.iloc[0], m.iloc[1]
    hospitals = []
    for col in range(2, m.shape[1]):
        name = clean_str(names[col])
        if not name or name.upper() == "UKUPNO":
            continue
        hospitals.append({"col": col, "hzzo_code": clean_str(codes[col]), "name": name})
    rows = []
    for r in range(3, m.shape[0]):
        djel_code, djel_name = clean_str(m.iat[r, 0]), clean_str(m.iat[r, 1])
        if not djel_code.isdigit() or not djel_name:
            continue
        for h in hospitals:
            try:
                units = float(m.iat[r, h["col"]])
            except (TypeError, ValueError):
                continue
            if units > 0:
                rows.append(
                    {
                        "hzzo_code": h["hzzo_code"],
                        "djel_code": djel_code,
                        "djel_name": djel_name,
                        "units": units,
                    }
                )
    return pd.DataFrame(hospitals).drop(columns="col"), pd.DataFrame(rows)


def build_hospitals() -> tuple[pd.DataFrame, pd.DataFrame]:
    addr = load_hospital_addresses()
    hosp, svc = load_hospital_services()
    keys = addr["key"].tolist()
    insts = []
    for h in hosp.itertuples():
        best = process.extractOne(norm_hospital(h.name), keys, scorer=fuzz.token_sort_ratio)
        a = addr.iloc[best[2]] if best and best[1] >= 82 else None
        name = a["name"] if a is not None else h.name
        insts.append(
            {
                "id": f"h-{h.hzzo_code}",
                "name": title_hr(name),
                "type": institution_type(name),
                "address": title_hr(a["address"]) if a is not None else "",
                "postcode": clean_str(a["postcode"]) if a is not None else "",
                "city": title_hr(a["city"]).replace("Grad Zagreb", "Zagreb")
                if a is not None
                else "",
                "phone": clean_str(a["phone"]) if a is not None else "",
                "email": "",
                "web": "",
                "hzzo_code": h.hzzo_code,
                "source_dataset": "hzzo_bolnicki_sadrzaji"
                + ("+hzzo_bolnice" if a is not None else ""),
            }
        )
    inst = pd.DataFrame(insts)
    services = svc.assign(
        institution_id="h-" + svc["hzzo_code"],
        specialty_code=svc["djel_name"].map(slugify),
        specialty_name=svc["djel_name"],
        source_dataset="hzzo_bolnicki_sadrzaji",
    )[
        [
            "institution_id",
            "specialty_code",
            "specialty_name",
            "djel_code",
            "units",
            "source_dataset",
        ]
    ]
    return inst, services


# ---------------------------------------------------------------- primary care


def provider_label(raw: str, status: str) -> str:
    """'O.DZ Dubrovnik lok.Gruda-stom.' → 'Dom zdravlja Dubrovnik'; concessions → plain label."""
    if status.lower().startswith("konc"):
        return "Privatna ordinacija u mreži HZZO-a (koncesija)"
    s = re.sub(r"^O\.\s*", "", raw)
    s = re.split(r"\s+lok\.", s)[0]
    s = re.sub(r"^DZ\b\.?", "Dom zdravlja", s).strip(" -.")
    return s


def build_primary_care() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    frames = []
    for key in ROLE_BY_FILE:
        df = pd.read_excel(RAW / f"hzzo_pzz_{key}.xls", header=None, skiprows=2, dtype=str)
        df = df.iloc[:, :14]
        df.columns = [
            "pu",
            "provider_code",
            "provider_name",
            "djel",
            "doctor_code",
            "surname",
            "given",
            "status",
            "insured",
            "postcode",
            "post_name",
            "street",
            "number",
            "municipality",
        ]
        df["file"] = key
        frames.append(df[df["doctor_code"].notna() & df["surname"].notna()])
    d = pd.concat(frames, ignore_index=True)
    for c in d.columns:
        d[c] = d[c].map(clean_str)

    d["address"] = (d["street"].map(title_hr) + " " + d["number"].str.lower()).str.strip()
    d["city"] = d["post_name"].map(title_hr)
    d["provider"] = [provider_label(r.provider_name, r.status) for r in d.itertuples()]
    d["inst_id"] = [
        "p-" + stable_id(r.provider_code, r.postcode, r.street, r.number) for r in d.itertuples()
    ]

    def practice_name(r: pd.Series) -> str:
        role = ROLE_BY_FILE[r["file"]][2]
        return f"{role} — dr. {name_case(r['given'])} {name_case(r['surname'])}"

    first = d.drop_duplicates("inst_id")
    inst = pd.DataFrame(
        {
            "id": first["inst_id"],
            "name": first.apply(practice_name, axis=1),
            "type": "ordinacija",
            "address": first["address"],
            "postcode": first["postcode"],
            "city": first["city"],
            "phone": "",
            "email": "",
            "web": "",
            "hzzo_code": first["provider_code"],
            "source_dataset": "hzzo_pzz_" + first["file"],
        }
    )
    svc = d[["inst_id", "file"]].drop_duplicates()
    services = pd.DataFrame(
        {
            "institution_id": svc["inst_id"],
            "specialty_code": svc["file"].map(lambda f: ROLE_BY_FILE[f][1]),
            "specialty_name": svc["file"].map(lambda f: ROLE_BY_FILE[f][2]),
            "djel_code": "",
            "units": 1.0,
            "source_dataset": "hzzo_pzz_" + svc["file"],
        }
    )
    prac = pd.DataFrame(
        {
            "id": "d-" + d["doctor_code"] + "-" + d["file"],
            "full_name": d["given"].map(name_case) + " " + d["surname"].map(name_case),
            "role": d["file"].map(lambda f: ROLE_BY_FILE[f][0]),
            "team_code": d["doctor_code"],
            "institution_id": d["inst_id"],
            "provider_name": d["provider"],
            "status": d["status"].str.lower(),
            "insured_count": pd.to_numeric(d["insured"], errors="coerce").fillna(0).astype(int),
            "source_dataset": "hzzo_pzz_" + d["file"],
        }
    ).drop_duplicates("id")
    return inst, services, prac


# ---------------------------------------------------------------- Zagreb geoportal


def build_zagreb() -> pd.DataFrame:
    rows = []
    g = json.loads((RAW / "zg_zdravstvene_ustanove.geojson").read_text())
    for f in g["features"]:
        p, (lng, lat) = f["properties"], f["geometry"]["coordinates"][:2]
        rows.append(
            {
                "name": clean_str(p.get("naziv")),
                "address": clean_str(p.get("adresa")),
                "phone": clean_str(p.get("telefon")),
                "email": clean_str(p.get("email")),
                "web": clean_str(p.get("web")),
                "lat": lat,
                "lng": lng,
                "source_dataset": "zg_zdravstvene_ustanove",
            }
        )
    g = json.loads((RAW / "zg_domovi_zdravlja.geojson").read_text())
    for f in g["features"]:
        p, (lng, lat) = f["properties"], f["geometry"]["coordinates"][:2]
        phone = clean_str(p.get("Domovi_zdravlja_telefon"))
        rows.append(
            {
                "name": clean_str(p.get("Domovi_zdravlja_naziv")),
                "address": clean_str(p.get("Domovi_zdravlja_adresa")),
                "phone": "" if phone.startswith("www") else phone,
                "email": "",
                "web": clean_str(p.get("Domovi_zdravlja_web")),
                "lat": lat,
                "lng": lng,
                "source_dataset": "zg_domovi_zdravlja",
            }
        )
    z = pd.DataFrame(rows)
    z["id"] = ["z-" + stable_id(r.name, r.address) for r in z.itertuples()]
    z["type"] = z["name"].map(institution_type)
    z.loc[z["source_dataset"] == "zg_domovi_zdravlja", "type"] = "DZ"
    z["city"], z["postcode"], z["hzzo_code"] = "Zagreb", "", ""
    return z.drop_duplicates("id")


# ---------------------------------------------------------------- OpenStreetMap


def load_osm() -> pd.DataFrame:
    o = json.loads((RAW / "osm_health.json").read_text())
    rows = []
    for e in o["elements"]:
        t = e.get("tags", {})
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lng = e.get("lon") or (e.get("center") or {}).get("lon")
        kind = t.get("amenity") or t.get("healthcare")
        if lat is None or kind not in {"hospital", "clinic", "doctors", "doctor", "dentist"}:
            continue
        rows.append(
            {
                "osm_id": f"{e['type']}/{e['id']}",
                "name": clean_str(t.get("name")),
                "kind": "doctors" if kind == "doctor" else kind,
                "city": clean_str(t.get("addr:city")),
                "postcode": clean_str(t.get("addr:postcode")),
                "street": clean_str(t.get("addr:street")),
                "housenumber": clean_str(t.get("addr:housenumber")),
                "opening_hours": clean_str(t.get("opening_hours")),
                "emergency": t.get("emergency") == "yes",
                "phone": clean_str(t.get("phone") or t.get("contact:phone")),
                "web": clean_str(t.get("website") or t.get("contact:website")),
                "lat": float(lat),
                "lng": float(lng),
            }
        )
    return pd.DataFrame(rows)


DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]


def parse_opening_hours(s: str) -> list[tuple[int, str, str]]:
    """Parses the common OSM forms ('Mo-Fr 07:00-14:00; Sa 08:00-12:00', '24/7').
    Returns (weekday 1=Mon..7=Sun, opens, closes). Unknown syntax → []."""
    s = s.strip()
    if s == "24/7":
        return [(d, "00:00", "24:00") for d in range(1, 8)]
    out: list[tuple[int, str, str]] = []
    for part in s.split(";"):
        part = part.strip()
        m = re.fullmatch(
            r"((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)\s+((?:\d{1,2}:\d{2}-\d{1,2}:\d{2},?\s*)+)", part
        )
        if not m:
            if part and not re.fullmatch(r"(PH|[A-Z][a-z](-[A-Z][a-z])?)\s+off", part):
                return []
            continue
        days: list[int] = []
        for rng in m.group(1).strip(",").split(","):
            if "-" in rng:
                a, b = rng.split("-")
                if a not in DAYS or b not in DAYS:
                    return []
                ia, ib = DAYS.index(a), DAYS.index(b)
                days += (
                    list(range(ia, ib + 1))
                    if ia <= ib
                    else list(range(ia, 7)) + list(range(0, ib + 1))
                )
            elif rng in DAYS:
                days.append(DAYS.index(rng))
            else:
                return []
        for span in re.findall(r"(\d{1,2}:\d{2})-(\d{1,2}:\d{2})", m.group(2)):
            out += [(d + 1, span[0].zfill(5), span[1].zfill(5)) for d in days]
    return out


def match_osm(
    inst: pd.DataFrame, prac: pd.DataFrame, osm: pd.DataFrame
) -> tuple[pd.DataFrame, list[dict]]:
    """Fill coordinates/phone/hours from OSM where names match. Returns (inst, hours)."""
    inst = inst.copy()
    hours: list[dict] = []

    def take(idx: int, o: pd.Series, label: str) -> None:
        if pd.isna(inst.at[idx, "lat"]):
            inst.at[idx, "lat"], inst.at[idx, "lng"] = o["lat"], o["lng"]
            inst.at[idx, "geo_precision"] = "osm"
        if not inst.at[idx, "phone"] and o["phone"]:
            inst.at[idx, "phone"] = o["phone"]
        if not inst.at[idx, "web"] and o["web"]:
            inst.at[idx, "web"] = o["web"]
        inst.at[idx, "osm_id"] = o["osm_id"]
        inst.at[idx, "source_dataset"] += f"+osm({label})"
        for wd, op, cl in parse_opening_hours(o["opening_hours"]) if o["opening_hours"] else []:
            hours.append(
                {
                    "institution_id": inst.at[idx, "id"],
                    "weekday": wd,
                    "opens": op,
                    "closes": cl,
                    "is_on_call": False,
                    "source": "osm",
                }
            )

    # Hospitals: fuzzy name match against OSM hospitals.
    oh = osm[(osm["kind"] == "hospital") & (osm["name"] != "")].reset_index(drop=True)
    names = oh["name"].map(norm_hospital).tolist()
    for idx in inst.index[inst["id"].str.startswith("h-")]:
        best = process.extractOne(
            norm_hospital(inst.at[idx, "name"]), names, scorer=fuzz.token_set_ratio
        )
        if best and best[1] >= 90:
            take(idx, oh.iloc[best[2]], "hospital-name")

    # Practices: OSM doctors/dentists whose name contains the doctor's surname,
    # in the same city/postcode.
    od = osm[osm["kind"].isin(["doctors", "dentist", "clinic"]) & (osm["name"] != "")]
    od = od.assign(fold=od["name"].map(lambda s: ascii_fold(s).lower()))
    surname = prac.drop_duplicates("institution_id").set_index("institution_id")["full_name"]
    for idx in inst.index[inst["type"] == "ordinacija"]:
        iid = inst.at[idx, "id"]
        full = surname.get(iid)
        if not full:
            continue
        last = ascii_fold(full.split(" ", 1)[-1]).lower()
        if len(last) < 4:
            continue
        cand = od[od["fold"].str.contains(re.escape(last), regex=True)]
        city = ascii_fold(inst.at[idx, "city"]).lower()
        cand = cand[
            (cand["postcode"] == inst.at[idx, "postcode"])
            | (cand["city"].map(lambda c: ascii_fold(c).lower()) == city)
        ]
        if len(cand) == 1:
            take(idx, cand.iloc[0], "surname")
    return inst, hours


def match_zagreb(inst: pd.DataFrame, zg: pd.DataFrame) -> pd.DataFrame:
    """Copy geoportal coordinates onto hospitals/practices at the same Zagreb address."""
    inst = inst.copy()
    zg = zg.assign(addr_key=zg["address"].map(lambda a: ascii_fold(a).lower()))
    by_addr = zg.drop_duplicates("addr_key").set_index("addr_key")
    zg_names = zg["name"].map(norm_hospital).tolist()
    for idx in inst.index[inst["city"] == "Zagreb"]:
        if not pd.isna(inst.at[idx, "lat"]):
            continue
        key = ascii_fold(inst.at[idx, "address"]).lower()
        hit = by_addr.loc[key] if key in by_addr.index else None
        if hit is None and inst.at[idx, "id"].startswith("h-"):
            best = process.extractOne(
                norm_hospital(inst.at[idx, "name"]), zg_names, scorer=fuzz.token_set_ratio
            )
            if best and best[1] >= 90:
                hit = zg.iloc[best[2]]
        if hit is not None:
            inst.at[idx, "lat"], inst.at[idx, "lng"] = hit["lat"], hit["lng"]
            inst.at[idx, "geo_precision"] = "geoportal"
            inst.at[idx, "source_dataset"] += "+" + hit["source_dataset"]
    return inst


# ---------------------------------------------------------------- main


def main() -> int:
    CLEAN.mkdir(parents=True, exist_ok=True)
    hosp, hosp_svc = build_hospitals()
    pzz, pzz_svc, prac = build_primary_care()
    zg = build_zagreb()
    osm = load_osm()

    inst = pd.concat([hosp, pzz], ignore_index=True)
    inst["lat"], inst["lng"] = float("nan"), float("nan")
    inst["geo_precision"], inst["osm_id"] = "", ""

    inst = match_zagreb(inst, zg)
    inst, hours = match_osm(inst, prac, osm)

    # Zagreb geoportal entries that are not already a hospital become their own rows.
    zg_new = zg[~zg["name"].map(norm_hospital).isin(set(inst["name"].map(norm_hospital)))]
    zg_new = zg_new.assign(geo_precision="geoportal", osm_id="")
    inst = pd.concat([inst, zg_new[inst.columns]], ignore_index=True)

    # OHBP (hitna medicina) is open 0–24 by definition.
    ohbp = hosp_svc[hosp_svc["specialty_code"] == "hitna-medicina-ohbp"]["institution_id"].unique()
    for iid in ohbp:
        hours += [
            {
                "institution_id": iid,
                "weekday": d,
                "opens": "00:00",
                "closes": "24:00",
                "is_on_call": True,
                "source": "ohbp_0-24",
            }
            for d in range(1, 8)
        ]

    services = pd.concat([hosp_svc, pzz_svc], ignore_index=True)
    inst = inst.sort_values("id").reset_index(drop=True)
    inst.to_csv(CLEAN / "institutions.csv", index=False)
    services.to_csv(CLEAN / "institution_services.csv", index=False)
    prac.sort_values("id").to_csv(CLEAN / "practitioners.csv", index=False)
    pd.DataFrame(hours).drop_duplicates().to_csv(CLEAN / "institution_hours.csv", index=False)

    has_geo = inst["lat"].notna()
    print(f"institutions: {len(inst)} ({has_geo.sum()} with coordinates before geocoding)")
    print(f"  by type: {inst['type'].value_counts().to_dict()}")
    print(
        f"  hospitals matched to HZZO address book: "
        f"{hosp['source_dataset'].str.contains('hzzo_bolnice').sum()}/{len(hosp)}"
    )
    print(f"services: {len(services)} rows, {services['specialty_code'].nunique()} specialties")
    print(f"practitioners: {len(prac)} {prac['role'].value_counts().to_dict()}")
    print(f"hours rows: {len(hours)} (OHBP hospitals: {len(ohbp)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
