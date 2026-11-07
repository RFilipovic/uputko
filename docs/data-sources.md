# Izvori podataka / Data sources

Every dataset Uputko uses, where it comes from, and what we do with it.
All CKAN datasets are resolved through the **data.gov.hr CKAN Action API**
(`/api/3/action/package_show`) by `data-pipeline/fetch.py`; provenance for each
file is recorded in [`data-pipeline/data/raw/manifest.json`](../data-pipeline/data/raw/manifest.json).
Raw snapshots are committed, so the database can be rebuilt offline in one command.

Snapshot fetched: **2026-11-04**.

**Where you see it in the app:** every hospital, practice and chosen doctor
carries a source label ("Izvor: HZZO (data.gov.hr)", built from the row's
`source_dataset`), and the **Javni podaci** page (`/javni-podaci`, linked from
the home page) shows live counts from the database, the most-covered cities on
a map, and links to each dataset below.

## Open data used

| # | Dataset (data.gov.hr) | Publisher | Licence | Source date | Used for |
|---|---|---|---|---|---|
| 1 | [Adresar zdravstvenih ustanova/privatnih praksi](https://data.gov.hr/ckan/dataset/adresar-zdravstvenih-ustanova-privatnih-praksi) → `adresar-bolnica-1.xls` | HZZO | TODO(verify): not stated in CKAN metadata | April 2017 | Hospital names, addresses, postcodes, phone numbers |
| 2 | [Ugovoreni sadržaji bolničke zdravstvene zaštite](https://data.gov.hr/ckan/dataset/ugovoreni-sadr-aji-bolni-ke-zdravstvene-za-tite) → sheet `ordinacije_dijag_fizioterapeuti` | HZZO | TODO(verify) | April 2017 | **Which hospital offers which specialty** (174 specialist clinic types × 65 hospitals), incl. which hospitals have an emergency department (OHBP) |
| 3 | [Ugovoreni sadržaji primarne zdravstvene zaštite](https://data.gov.hr/ckan/dataset/ugovoreni-sadr-aji-primarne-zdravstvene-za-tite) → `web_opca_032018.xls` | HZZO | TODO(verify) | March 2018 | Family doctors (*obiteljski liječnik*): name, team code, practice address |
| 4 | same dataset → `web_ped_032018.xls` | HZZO | TODO(verify) | March 2018 | Paediatricians (*pedijatar*) |
| 5 | same dataset → `web_gin_032018.xls` | HZZO | TODO(verify) | March 2018 | Gynaecologists (*ginekolog*) |
| 6 | same dataset → `web_dent_032018.xls` | HZZO | TODO(verify) | March 2018 | Dentists (*stomatolog*) |
| 7 | [Geoportal Zdravstvene ustanove](https://data.gov.hr/ckan/dataset/geoportal-zdravstvene-ustanove) (GeoJSON) | Grad Zagreb | Otvorena dozvola (OD) | 2023 | Zagreb institutions **with coordinates**, phone, email, web |
| 8 | [Geoportal Domovi zdravlja](https://data.gov.hr/ckan/dataset/geoportal-domovi-zdravlja) (GeoJSON) | Grad Zagreb | CC BY 4.0 | 2022 | Zagreb health-centre locations **with coordinates** |

## Other open sources

| Source | Licence | Used for |
|---|---|---|
| OpenStreetMap via Overpass API: `amenity=hospital\|clinic\|doctors\|dentist` in Croatia (1,273 objects) | ODbL 1.0 © OpenStreetMap contributors | Coordinates, phone, website and **opening hours** (`opening_hours` tag) for hospitals and practices that match by name |
| Nominatim geocoder (OpenStreetMap) | ODbL 1.0 | Coordinates for addresses that no other source located. 1 request/s, every answer cached in `data-pipeline/data/cache/geocode.json` (committed) |

## Listed but not usable

| Dataset | Problem |
|---|---|
| [Lokacije ordinacija primarne zdravstvene zaštite](https://data.gov.hr/ckan/dataset/lokacije-ordinacija-primarne-zdravstvene-za-tite) (HZZO) | The files are hosted on `hzzo-net.hr`, which did not respond on 2026-11-04. Datasets 3–6 cover the same practices. |
| [Pokazatelji uspješnosti rada ordinacija PZZ](https://data.gov.hr/ckan/dataset/pokazatelji-uspje-nosti-rada-ordinacija-primarne-zdravstvene-za-tite) (HZZO) | Same host, unreachable. |

## How the data is linked

```
HZZO hospital address book (1) ──fuzzy name match──┐
HZZO hospital services (2) ─── hospital × specialty ┼─► institutions + institution_services
Zagreb geoportal (7, 8) ──── same address / name ───┤      (geom from geoportal / OSM / Nominatim)
OpenStreetMap ───────────── name (+ city) match ────┘
HZZO primary-care teams (3–6) ─► practitioners ─► one practice location each ─► institutions
                                       │
                         patient's chosen doctors (synthetic personas)
```

- **Hospitals:** dataset 2 names each hospital and lists its specialist clinics.
  We match it to dataset 1 by normalised name (`rapidfuzz` token sort ≥ 82) to
  get the address: **54 of 65** matched. The other 11 are located by name, and
  their town is read from the name ("Opća bolnica Zabok" → Zabok).
- **Specialties:** HZZO's *djelatnost* names become stable codes
  (`Otorinolaringologija` → `otorinolaringologija`, `Hitna medicina (OHBP)` →
  `hitna-medicina-ohbp`). This is the specialty ↔ institution table the agent
  and doctor portal use. It comes straight from HZZO, not hand curation.
- **Practices:** each HZZO team (doctor + location) becomes a practice with the
  matching service (`obiteljska-medicina`, `pedijatrija-pzz`,
  `ginekologija-pzz`, `dentalna-medicina`), so one query finds the nearest
  dentist or family doctor.
- **Coordinates** (column `geo_precision`): `geoportal` (Zagreb open data),
  `osm` (OpenStreetMap match), `street` (Nominatim, street level), `name`
  (Nominatim, institution name), `village` (HZZO writes village practices as
  "Vidovec, trg Sv. Vida 2" under the nearest town's postcode; we locate the
  village), `postcode` / `city` (Nominatim fallback, approximate: the centre of
  the postcode area or town). Search results rank approximate locations behind
  exact ones at a similar distance; the distance shown is never altered.
- **Opening hours:** `osm` where OpenStreetMap has them; `ohbp_0-24` for
  emergency departments (open around the clock by definition).
- **Emergency departments (OHBP):** from HZZO's contracted *Hitna medicina (OHBP)*
  clinics, plus hospitals whose matched OpenStreetMap object has
  `emergency=yes` (adds e.g. KB Dubrava and OB Varaždin, missing from the 2017
  file), plus a one-line manual list in
  `data-pipeline/data/manual/ohbp_overrides.csv` for gaps in both sources
  (currently only **KBC Split**, marked `TODO(verify)`). The `source_dataset`
  of each row says which source it came from.
- **Hospital ↔ OSM matching is one-to-one**, so a name contained in another
  ("OB Varaždin" vs "OB Varaždin – Klenovnik") cannot give two sites the same
  location; the unmatched sites are geocoded by town.
- Every row keeps `source_dataset`, e.g. `hzzo_bolnicki_sadrzaji+hzzo_bolnice+osm(hospital-name)`.

## Synthetic data (clearly labelled)

Open data has **no** patients, referrals, appointment availability or (for most
practices) opening hours. For the prototype we generate:

| What | Where | How it is marked |
|---|---|---|
| 3 patient personas (Ana, Luka, Maja) | `load.py` → `patients` | `is_synthetic = true`, `@example.com` emails |
| Opening hours for practices in the 6 demo cities without hours in any source (morning 07–14 or afternoon 13–20, Mon–Fri) | `load.py` → `institution_hours` | `source = 'demo_hand_filled'` |
| Appointment slots for the next 3 weeks at hospitals in the demo cities | SQL `generate_demo_slots()` | table comment + "Demo" badge in the UI |

The real doctors' names come from HZZO open data. The personas are linked to
them only inside the demo database. No message is ever sent to a real doctor;
demo emails go to team inboxes only.

## Known limitations

- HZZO files are from **2017–2018**: some doctors have retired or moved, some
  hospitals have reorganised. The pipeline runs unchanged on a newer export.
- HZZO publishes no opening hours or on-call (*dežurstvo*) schedules in a
  machine-readable form. That is the biggest gap for "where can I go right now".
- Coordinates for all 5,128 locations: 3,568 street-level, 679 Zagreb geoportal,
  82 OpenStreetMap, 154 village centre, 4 town centre, and **641 (12%) only at
  postcode level** (approximate, can be a few km off). Those rank behind exact
  locations in search, and the UI always shows the full address.
- **Wrong-town check:** many Croatian towns share street names (Strossmayerova,
  Preradovićeva…). Every street/village result is compared with its own town's
  centre; if it is more than 15 km away it is rejected (252 cases) and the
  location falls back to the town/postcode. After the check, no exact result is
  outside its own town.
- HZZO dataset licences are not stated in the CKAN metadata: `TODO(verify)`
  with the publisher (data.gov.hr content is generally under the Open Licence of
  the Republic of Croatia).

## Rebuild

```bash
cd data-pipeline
./build.sh                       # raw snapshot → data/clean → supabase/seed.sql (offline)
cd .. && pnpm dlx supabase@3.0.0 db reset   # migrations + seed into the local database

# Optional refresh from the internet:
.venv/bin/python fetch.py        # CKAN API + OpenStreetMap
.venv/bin/python geocode.py      # Nominatim for new addresses (1 req/s)
```
