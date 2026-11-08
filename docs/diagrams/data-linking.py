"""How the open datasets are joined into the Supabase tables.

Builds the English (data-linking.svg) and Croatian (data-linking.hr.svg)
versions. Run from this folder: python3 data-linking.py && node render.cjs
"""

from kit import Diagram

# Columns: sources, pipeline steps, tables.
SX, SW = 40, 350
PX, PW = 520, 380
TX, TW = 1060, 330
BH = 90
R = [150, 275, 400, 525, 660, 790]  # row centres


def build(lang: str):
    def t(en, hr):
        return en if lang == "en" else hr

    d = Diagram(1520, 900, t("How the open data is linked", "Kako su otvoreni podaci povezani"))
    d.label(30, 40, t("HOW THE OPEN DATA IS LINKED · NUMBERS = DATASETS IN DATA-SOURCES.MD", "KAKO SU OTVORENI PODACI POVEZANI · BROJEVI = SKUPOVI U IZVORI-PODATAKA.MD"))

    d.panel(20, 70, 390, 805, t("Open data", "Otvoreni podaci"))
    d.panel(500, 70, 420, 805, t("Pipeline · Python", "Cjevovod · Python"))
    d.panel(1040, 70, 440, 805, t("Supabase tables", "Tablice u Supabaseu"))

    def src(row, kind, lines):
        d.box(SX, R[row] - BH / 2 + 25, SW, BH, kind, lines)

    def stp(row, lines):
        d.box(PX, R[row] - BH / 2 + 25, PW, BH, "app", lines)

    def tbl(row, lines):
        d.box(TX, R[row] - BH / 2 + 25, TW, BH, "data", lines)

    # Everything sits 25 px lower than the row centre to clear the panel titles.
    y = [r + 25 for r in R]

    # Sources
    src(0, "etl", [t("HZZO hospital services (2)", "Bolnički sadržaji HZZO (2)"), t("hospital × specialty, 2017", "bolnica × djelatnost, 2017.")])
    src(1, "etl", [t("HZZO hospital addresses (1)", "Adresar bolnica HZZO (1)"), t("addresses, phones, 2017", "adrese, telefoni, 2017.")])
    src(2, "etl", [t("Zagreb geoportal (7, 8)", "Geoportal Zagreba (7, 8)"), t("coordinates, contacts", "koordinate, kontakti")])
    src(3, "ext", ["OpenStreetMap · Nominatim", t("coordinates, opening hours", "koordinate, radno vrijeme")])
    src(4, "etl", [t("HZZO primary care (3–6)", "Timovi PZZ-a HZZO (3–6)"), t("family · dentist · gyn · paed", "obiteljski · stomatolog · gin · ped")])
    src(5, "person", [t("Synthetic personas", "Sintetičke osobe"), "Ana · Luka · Maja"])

    # Pipeline steps
    stp(0, [t("Specialty codes", "Šifre djelatnosti"), t("HZZO names → stable codes", "nazivi HZZO-a → stabilne šifre")])
    stp(1, [t("Fuzzy name match", "Uparivanje po nazivu"), t("rapidfuzz ≥ 82 · 54 of 65 hospitals", "rapidfuzz ≥ 82 · 54 od 65 bolnica")])
    stp(2, [t("Locate every place", "Lociranje svakog mjesta"), t("precision tag · wrong-town check", "oznaka preciznosti · provjera grada")])
    stp(4, [t("One practice per team", "Jedna ordinacija po timu"), t("doctor + location", "liječnik + lokacija")])

    # Tables
    tbl(0, ["institution_services", t("174 HZZO specialties", "174 djelatnosti HZZO-a")])
    d.cylinder(TX, y[1] - 50, TW, y[2] - y[1] + 100, "data", ["institutions", t("5,128 places · PostGIS", "5.128 mjesta · PostGIS"), t("source_dataset on every row", "source_dataset na svakom retku")])
    tbl(3, ["institution_hours", t("OSM · OHBP 0–24 · demo-filled", "OSM · OHBP 0–24 · demo")])
    tbl(4, ["practitioners", t("4,901 chosen doctors", "4.901 izabrani liječnik")])
    tbl(5, ["patient_practitioners", t("synthetic, demo only", "sintetički, samo demo")])

    SR, PR = SX + SW, PX + PW  # right edges

    # Hospital services → specialty codes → institution_services
    d.arrow([(SR, y[0] - 10), (PX, y[0] - 10)])
    d.arrow([(PR, y[0]), (TX, y[0])])
    # Hospital services + addresses → fuzzy match → institutions
    d.arrow([(SR, y[0] + 25), (450, y[0] + 25), (450, y[1] - 20), (PX, y[1] - 20)])
    d.arrow([(SR, y[1] + 15), (PX, y[1] + 15)])
    d.arrow([(PR, y[1]), (TX, y[1])], t("address", "adresa"), lx=0, ly=-14)
    # Geoportal + OSM/Nominatim → locate → institutions
    d.arrow([(SR, y[2] - 15), (PX, y[2] - 15)])
    d.arrow([(SR, y[3] - 25), (460, y[3] - 25), (460, y[2] + 25), (PX, y[2] + 25)])
    d.arrow([(PR, y[2]), (TX, y[2])], t("coordinates", "koordinate"), lx=0, ly=-14)
    # OSM opening hours → institution_hours
    d.arrow([(SR, y[3] + 15), (TX, y[3] + 15)], t("opening hours", "radno vrijeme"), at=0.5, lx=0, ly=-14)
    # Primary-care teams → one practice each → practitioners (+ institutions)
    d.arrow([(SR, y[4]), (PX, y[4])])
    d.arrow([(PR, y[4]), (TX, y[4])])
    d.arrow([(TX + TW, y[4]), (TX + TW + 45, y[4]), (TX + TW + 45, y[1] + 20), (TX + TW, y[1] + 20)], t("practice location", "lokacija ordinacije"), at=0.5, dashed=True, lx=0, ly=117)
    # Personas → chosen doctors
    d.arrow([(SR, y[5]), (TX, y[5])], t("pick chosen doctors", "biraju izabrane liječnike"), at=0.5, lx=0, ly=-14)
    d.arrow([(TX + TW / 2, y[5] - BH / 2), (TX + TW / 2, y[4] + BH / 2)])

    d.save(t("data-linking", "data-linking.hr"))


for lang in ("en", "hr"):
    build(lang)
