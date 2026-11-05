"""Every dataset the pipeline uses. Resolved through the data.gov.hr CKAN API."""

from __future__ import annotations

from dataclasses import dataclass

CKAN = "https://data.gov.hr/ckan/api/3/action"


@dataclass(frozen=True)
class Source:
    id: str  # local file stem in data/raw/
    package: str  # CKAN package name on data.gov.hr
    url_contains: str  # picks the resource inside the package
    ext: str
    note: str


SOURCES: list[Source] = [
    Source(
        "hzzo_bolnice",
        "adresar-zdravstvenih-ustanova-privatnih-praksi",
        "adresar-bolnica",
        "xls",
        "HZZO adresar bolnica: name, address, postcode, phone of every hospital.",
    ),
    Source(
        "hzzo_bolnicki_sadrzaji",
        "ugovoreni-sadr-aji-bolni-ke-zdravstvene-za-tite",
        "Postelje_specijalisticke",
        "xls",
        "HZZO contracted hospital services: specialist clinics per hospital (incl. OHBP).",
    ),
    Source(
        "hzzo_pzz_opca",
        "ugovoreni-sadr-aji-primarne-zdravstvene-za-tite",
        "web_opca_",
        "xls",
        "HZZO contracted teams: general/family medicine (obiteljski liječnik).",
    ),
    Source(
        "hzzo_pzz_ped",
        "ugovoreni-sadr-aji-primarne-zdravstvene-za-tite",
        "web_ped_",
        "xls",
        "HZZO contracted teams: paediatrics (pedijatar).",
    ),
    Source(
        "hzzo_pzz_gin",
        "ugovoreni-sadr-aji-primarne-zdravstvene-za-tite",
        "web_gin_",
        "xls",
        "HZZO contracted teams: women's health (ginekolog).",
    ),
    Source(
        "hzzo_pzz_dent",
        "ugovoreni-sadr-aji-primarne-zdravstvene-za-tite",
        "web_dent_",
        "xls",
        "HZZO contracted teams: dental care (stomatolog).",
    ),
    Source(
        "zg_zdravstvene_ustanove",
        "geoportal-zdravstvene-ustanove",
        "format=geojson",
        "geojson",
        "Grad Zagreb geoportal: health institutions with coordinates.",
    ),
    Source(
        "zg_domovi_zdravlja",
        "geoportal-domovi-zdravlja",
        "format=geojson",
        "geojson",
        "Grad Zagreb geoportal: health centres (domovi zdravlja) with coordinates.",
    ),
]

# Listed on data.gov.hr but the host (hzzo-net.hr) did not respond on
# 2026-11-04, so the pipeline cannot use it. Kept here for docs/data-sources.md.
UNREACHABLE = [
    ("lokacije-ordinacija-primarne-zdravstvene-za-tite", "hzzo-net.hr does not respond"),
]

OSM_OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
