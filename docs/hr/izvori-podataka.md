# Izvori podataka

*[English version](../data-sources.md)*

Svaki skup podataka koji Uputko koristi, odakle dolazi i što s njim radimo.
Svi CKAN skupovi podataka dohvaćaju se preko **data.gov.hr CKAN Action API-ja**
(`/api/3/action/package_show`) skriptom `data-pipeline/fetch.py`; podrijetlo
svake datoteke zapisano je u [`data-pipeline/data/raw/manifest.json`](../../data-pipeline/data/raw/manifest.json).
Sirovi snimci spremljeni su u repozitorij, pa se baza može ponovno izgraditi
bez interneta jednom naredbom.

Snimak dohvaćen: **4. 11. 2026.**

**Gdje se to vidi u aplikaciji:** svaka bolnica, ordinacija i izabrani
liječnik nosi oznaku izvora („Izvor: HZZO (data.gov.hr)”, izgrađenu iz
stupca `source_dataset` tog retka), a stranica **Javni podaci**
(`/javni-podaci`, link s početne stranice) prikazuje brojke uživo iz baze,
gradove s najboljom pokrivenošću na karti i linkove na svaki skup podataka u
nastavku.

## Korišteni otvoreni podaci

| # | Skup podataka (data.gov.hr) | Izdavač | Licenca | Datum izvora | Koristi se za |
|---|---|---|---|---|---|
| 1 | [Adresar zdravstvenih ustanova/privatnih praksi](https://data.gov.hr/ckan/dataset/adresar-zdravstvenih-ustanova-privatnih-praksi) → `adresar-bolnica-1.xls` | HZZO | TODO(verify): nije navedena u CKAN metapodacima | travanj 2017. | Nazivi bolnica, adrese, poštanski brojevi, telefoni |
| 2 | [Ugovoreni sadržaji bolničke zdravstvene zaštite](https://data.gov.hr/ckan/dataset/ugovoreni-sadr-aji-bolni-ke-zdravstvene-za-tite) → list `ordinacije_dijag_fizioterapeuti` | HZZO | TODO(verify) | travanj 2017. | **Koja bolnica nudi koju djelatnost** (174 vrste specijalističkih ambulanti × 65 bolnica), uključujući koje bolnice imaju hitni prijem (OHBP) |
| 3 | [Ugovoreni sadržaji primarne zdravstvene zaštite](https://data.gov.hr/ckan/dataset/ugovoreni-sadr-aji-primarne-zdravstvene-za-tite) → `web_opca_032018.xls` | HZZO | TODO(verify) | ožujak 2018. | Obiteljski liječnici: ime, šifra tima, adresa ordinacije |
| 4 | isti skup → `web_ped_032018.xls` | HZZO | TODO(verify) | ožujak 2018. | Pedijatri |
| 5 | isti skup → `web_gin_032018.xls` | HZZO | TODO(verify) | ožujak 2018. | Ginekolozi |
| 6 | isti skup → `web_dent_032018.xls` | HZZO | TODO(verify) | ožujak 2018. | Stomatolozi |
| 7 | [Geoportal Zdravstvene ustanove](https://data.gov.hr/ckan/dataset/geoportal-zdravstvene-ustanove) (GeoJSON) | Grad Zagreb | Otvorena dozvola (OD) | 2023. | Zagrebačke ustanove **s koordinatama**, telefonom, e-poštom, webom |
| 8 | [Geoportal Domovi zdravlja](https://data.gov.hr/ckan/dataset/geoportal-domovi-zdravlja) (GeoJSON) | Grad Zagreb | CC BY 4.0 | 2022. | Lokacije zagrebačkih domova zdravlja **s koordinatama** |

## Ostali otvoreni izvori

| Izvor | Licenca | Koristi se za |
|---|---|---|
| OpenStreetMap preko Overpass API-ja: `amenity=hospital\|clinic\|doctors\|dentist` u Hrvatskoj (1.273 objekta) | ODbL 1.0 © OpenStreetMap contributors | Koordinate, telefon, web i **radno vrijeme** (oznaka `opening_hours`) za bolnice i ordinacije koje se poklope po nazivu |
| Nominatim geokoder (OpenStreetMap) | ODbL 1.0 | Koordinate za adrese koje nijedan drugi izvor nije locirao. 1 zahtjev u sekundi, svaki odgovor spremljen u `data-pipeline/data/cache/geocode.json` (u repozitoriju) |

## Navedeno, ali neupotrebljivo

| Skup podataka | Problem |
|---|---|
| [Lokacije ordinacija primarne zdravstvene zaštite](https://data.gov.hr/ckan/dataset/lokacije-ordinacija-primarne-zdravstvene-za-tite) (HZZO) | Datoteke su na `hzzo-net.hr`, koji 4. 11. 2026. nije odgovarao. Skupovi 3–6 pokrivaju iste ordinacije. |
| [Pokazatelji uspješnosti rada ordinacija PZZ](https://data.gov.hr/ckan/dataset/pokazatelji-uspje-nosti-rada-ordinacija-primarne-zdravstvene-za-tite) (HZZO) | Isti poslužitelj, nedostupan. |

## Kako su podaci povezani

![Kako su otvoreni podaci povezani: bolnički sadržaji HZZO-a (2) postaju šifre djelatnosti u institution_services i, uz uparivanje po nazivu s adresarom bolnica HZZO-a (1), bolnice u institutions; geoportal Zagreba (7, 8), OpenStreetMap i Nominatim daju koordinate svakom mjestu; OpenStreetMap daje i radno vrijeme; timovi primarne zaštite HZZO-a (3–6) postaju practitioners, svaki s jednom lokacijom ordinacije u institutions; sintetičke osobe biraju izabrane liječnike u patient_practitioners.](../diagrams/data-linking.hr.png)

*Izvor: [`diagrams/data-linking.py`](../diagrams/data-linking.py) · [SVG](../diagrams/data-linking.hr.svg)*

- **Bolnice:** skup 2 navodi naziv svake bolnice i njezine specijalističke
  ambulante. Uparujemo ga sa skupom 1 po normaliziranom nazivu (`rapidfuzz`
  token sort ≥ 82) da dobijemo adresu: uparene su **54 od 65**. Preostalih 11
  locira se po nazivu, a grad se čita iz naziva („Opća bolnica Zabok” → Zabok).
- **Djelatnosti:** nazivi *djelatnosti* HZZO-a postaju stabilne šifre
  (`Otorinolaringologija` → `otorinolaringologija`, `Hitna medicina (OHBP)` →
  `hitna-medicina-ohbp`). To je tablica djelatnost ↔ ustanova koju koriste
  agent i portal za liječnike. Dolazi izravno od HZZO-a, nije ručno složena.
- **Ordinacije:** svaki tim HZZO-a (liječnik + lokacija) postaje ordinacija s
  odgovarajućom uslugom (`obiteljska-medicina`, `pedijatrija-pzz`,
  `ginekologija-pzz`, `dentalna-medicina`), pa jedan upit pronalazi najbližeg
  stomatologa ili obiteljskog liječnika.
- **Koordinate** (stupac `geo_precision`): `geoportal` (zagrebački otvoreni
  podaci), `osm` (poklapanje s OpenStreetMapom), `street` (Nominatim, razina
  ulice), `name` (Nominatim, naziv ustanove), `village` (HZZO seoske
  ordinacije piše kao „Vidovec, trg Sv. Vida 2” pod poštanskim brojem
  najbližeg grada; mi lociramo selo), `postcode` / `city` (rezervna opcija
  Nominatima, približno: središte područja poštanskog broja ili grada).
  Rezultati pretrage rangiraju približne lokacije iza točnih na sličnoj
  udaljenosti; prikazana udaljenost nikad se ne mijenja.
- **Radno vrijeme:** `osm` gdje ga OpenStreetMap ima; `ohbp_0-24` za hitne
  prijeme (po definiciji otvoreni cijeli dan).
- **Hitni prijemi (OHBP):** iz ugovorenih ambulanti *Hitna medicina (OHBP)*
  HZZO-a, plus bolnice čiji upareni OpenStreetMap objekt ima `emergency=yes`
  (dodaje npr. KB Dubrava i OB Varaždin, koji nedostaju u datoteci iz 2017.),
  plus ručni popis od jednog retka u
  `data-pipeline/data/manual/ohbp_overrides.csv` za praznine u oba izvora
  (trenutno samo **KBC Split**, označen `TODO(verify)`). Stupac
  `source_dataset` svakog retka kaže iz kojeg izvora dolazi.
- **Uparivanje bolnica s OSM-om je jedan-na-jedan**, pa naziv sadržan u drugom
  („OB Varaždin” i „OB Varaždin – Klenovnik”) ne može dvjema lokacijama dati
  isto mjesto; neuparene lokacije geokodiraju se po gradu.
- Svaki redak čuva `source_dataset`, npr. `hzzo_bolnicki_sadrzaji+hzzo_bolnice+osm(hospital-name)`.

## Sintetički podaci (jasno označeni)

Otvoreni podaci **nemaju** pacijente, uputnice, slobodne termine ni (za
većinu ordinacija) radno vrijeme. Za prototip generiramo:

| Što | Gdje | Kako je označeno |
|---|---|---|
| 3 osobe pacijenata (Ana, Luka, Maja) | `load.py` → `patients` | `is_synthetic = true`, e-pošta na `@example.com` |
| Radno vrijeme za ordinacije u 6 demo gradova bez radnog vremena u ijednom izvoru (jutro 07–14 ili popodne 13–20, pon–pet) | `load.py` → `institution_hours` | `source = 'demo_hand_filled'` |
| Termini za sljedeća 3 tjedna u bolnicama u demo gradovima | SQL `generate_demo_slots()` | komentar tablice + oznaka „Demo” u sučelju |

Imena stvarnih liječnika dolaze iz otvorenih podataka HZZO-a. Osobe su s njima
povezane samo unutar demo baze. Nijedna poruka nikad se ne šalje stvarnom
liječniku; demo e-pošta ide samo u sandučiće tima.

## Poznata ograničenja

- Datoteke HZZO-a su iz **2017.–2018.**: neki liječnici su otišli u mirovinu
  ili se preselili, neke su se bolnice reorganizirale. Cjevovod radi
  nepromijenjen na novijem izvozu.
- HZZO ne objavljuje radno vrijeme ni raspored dežurstava u strojno čitljivom
  obliku. To je najveća praznina za pitanje „kamo mogu otići odmah”.
- Koordinate za svih 5.128 lokacija: 3.568 na razini ulice, 679 iz
  zagrebačkog geoportala, 82 iz OpenStreetMapa, 154 središte sela, 4 središte
  grada i **641 (12 %) samo na razini poštanskog broja** (približno, može biti
  nekoliko km pogrešno). One se u pretrazi rangiraju iza točnih lokacija, a
  sučelje uvijek prikazuje punu adresu.
- **Provjera pogrešnog grada:** mnogi hrvatski gradovi imaju ulice istog
  imena (Strossmayerova, Preradovićeva…). Svaki rezultat na razini ulice ili
  sela uspoređuje se sa središtem vlastitog grada; ako je udaljen više od
  15 km, odbacuje se (252 slučaja) i lokacija se vraća na grad / poštanski
  broj. Nakon provjere nijedan točan rezultat nije izvan svog grada.
- Licence skupova podataka HZZO-a nisu navedene u CKAN metapodacima:
  `TODO(verify)` s izdavačem (sadržaj na data.gov.hr općenito je pod
  Otvorenom dozvolom Republike Hrvatske).

## Ponovna izgradnja

```bash
cd data-pipeline
./build.sh                       # sirovi snimak → data/clean → supabase/seed.sql (bez interneta)
cd .. && pnpm dlx supabase@3.0.0 db reset   # migracije + seed u lokalnu bazu

# Neobavezno osvježavanje s interneta:
.venv/bin/python fetch.py        # CKAN API + OpenStreetMap
.venv/bin/python geocode.py      # Nominatim za nove adrese (1 zahtjev/s)
```
