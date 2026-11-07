"""Uputko system overview (hand-placed layout, no crossing lines).

Builds the English (system-overview.svg) and Croatian (system-overview.hr.svg)
versions. Run from this folder: python3 system-overview.py && node render.cjs
"""

from kit import Diagram


def build(lang: str):
    def t(en, hr):
        return en if lang == "en" else hr

    d = Diagram(1600, 1000, t("Uputko system overview", "Pregled sustava Uputko"))

    # ------------------------------------------------------------ panels
    d.panel(320, 150, 960, 600, t("Uputko app · Next.js 15 on Vercel", "Aplikacija Uputko · Next.js 15 na Vercelu"))
    d.panel(1320, 150, 250, 600, "Supabase · EU")
    d.panel(320, 790, 1250, 180, t("Open-data pipeline · Python", "Cjevovod otvorenih podataka · Python"))
    d.panel(320, 20, 1250, 100, t("External services", "Vanjske usluge"), fill="#FFFFFF")

    # ------------------------------------------------------------ people
    d.box(40, 190, 230, 90, "person", [t("Patient", "Pacijent"), t("phone browser", "preglednik na mobitelu")])
    d.box(40, 440, 230, 90, "person", [t("Doctor", "Liječnik"), t("link from email", "link iz e-pošte")])
    d.box(40, 610, 230, 90, "person", [t("Hospital desk", "Šalter bolnice"), "demo panel"])

    # ------------------------------------------------------------ externals
    d.box(810, 45, 210, 60, "ext", ["Claude API", t("chat · reads uputnica", "razgovor · čita uputnicu")])
    d.box(1050, 45, 210, 60, "ext", ["Resend", t("emails → demo inbox", "e-pošta → demo sandučić")])
    d.box(1340, 45, 210, 60, "ext", ["OpenFreeMap", t("map tiles on patient pages", "karte na stranicama")])

    # ------------------------------------------------------------ app: chat pipeline
    d.box(340, 195, 190, 80, "app", ["/api/chat", t("streamed replies", "odgovori uživo")])
    d.box(570, 195, 200, 80, "safety", [t("Red-flag rules", "Hitni znakovi"), t("before the AI sees it", "prije nego AI vidi")])
    d.box(810, 195, 210, 80, "app", [t("AI agent", "AI agent"), t("one question at a time", "jedno pitanje odjednom")])
    d.box(1060, 195, 200, 80, "safety", [t("Routing table", "Usmjeravanje"), t("code decides who", "kod odlučuje kome")])

    d.box(570, 330, 200, 70, "danger", [t("112 takeover", "112 preko zaslona"), t("+ nearest OHBP", "+ najbliži OHBP")])
    d.box(1060, 330, 200, 70, "good", [t("Direct route", "Izravni put"), t("nearest open practice", "najbliža otvorena")])

    # ------------------------------------------------------------ app: doctor + booking + pages
    d.box(340, 445, 230, 80, "app", [t("Doctor portal", "Portal za liječnike"), t("check & send uputnica", "provjeri i pošalji uputnicu")])
    d.box(640, 445, 300, 80, "app", [t("Booking & offers API", "API za termine i ponude"), t("appointments · notifications", "termini · obavijesti")])
    d.box(340, 615, 230, 80, "app", [t("Hospital panel", "Panel bolnice"), "/ustanova (demo)"])
    d.box(1040, 615, 220, 80, "app", [t("Case page", "Stranica slučaja"), t("live on the patient's phone", "uživo na mobitelu")])

    # ------------------------------------------------------------ supabase
    d.cylinder(1345, 300, 200, 150, "data", ["Postgres + PostGIS", t("open data + synthetic", "otvoreni + sintetički"), t("patient flow", "tok pacijenata")])
    d.box(1345, 615, 165, 80, "data", ["Realtime", t("change pings", "signali promjena")])

    # ------------------------------------------------------------ pipeline
    d.box(350, 845, 330, 90, "etl", ["data.gov.hr CKAN API", "HZZO · Grad Zagreb · OSM"])
    d.box(740, 845, 360, 90, "etl", [t("fetch → transform", "dohvat → transformacija"), t("geocode → load", "geokodiranje → učitavanje")])
    d.box(1160, 845, 130, 90, "etl", ["seed.sql", t("committed", "u repozitoriju")])

    # ------------------------------------------------------------ edges
    d.arrow([(270, 235), (340, 235)], t("describes", "opisuje"), lx=0, ly=-14)
    d.arrow([(530, 235), (570, 235)])
    d.arrow([(770, 235), (810, 235)], t("no flag", "bez znaka"), lx=0, ly=-14)
    d.arrow([(670, 275), (670, 330)], t("red flag", "hitni znak"), lx=48, ly=4)
    d.arrow([(915, 195), (915, 105)], both=True)
    d.arrow([(1020, 235), (1060, 235)])
    d.arrow([(1160, 275), (1160, 330)], t("away + tooth", "daleko + zub"), lx=t(58, 64), ly=4)
    d.arrow([(1160, 195), (1160, 105)], t("email", "e-pošta"), lx=t(-34, -40), ly=4)
    # Email link reaches the doctor (orthogonal, under the chat row).
    d.arrow([(1100, 275), (1100, 300), (1040, 300), (1040, 420), (455, 420), (455, 445)], t("secure link to doctor", "siguran link liječniku"), at=0.6, dashed=True, lx=-110, ly=-2)
    d.arrow([(270, 485), (340, 485)])
    d.arrow([(570, 485), (640, 485)], "uputnica", lx=0, ly=-14)
    d.arrow([(270, 655), (340, 655)])
    d.arrow([(570, 655), (790, 655), (790, 525)], t("free slot · offer", "slobodan termin · ponuda"), at=0.3)
    d.arrow([(940, 485), (1345, 485), (1345, 440)], t("SQL transactions", "SQL transakcije"), at=0.3)
    d.arrow([(1260, 235), (1295, 235), (1295, 345), (1345, 345)])
    d.arrow([(1427, 450), (1427, 615)])
    d.arrow([(1345, 655), (1260, 655)], t("live", "uživo"), lx=0, ly=-14)
    d.arrow([(1225, 845), (1225, 770), (1530, 770), (1530, 440)], "seed", at=0.5)
    d.arrow([(680, 890), (740, 890)])
    d.arrow([(1100, 890), (1160, 890)])

    # ------------------------------------------------------------ legend
    d.legend(
        40,
        790,
        [
            ("person", t("people", "ljudi")),
            ("app", t("our app", "naša aplikacija")),
            ("safety", t("deterministic safety", "fiksna sigurnosna pravila")),
            ("data", t("database", "baza podataka")),
            ("ext", t("external service", "vanjska usluga")),
            ("etl", t("data pipeline", "cjevovod podataka")),
        ],
        title=t("LEGEND", "LEGENDA"),
    )

    d.save(t("system-overview", "system-overview.hr"))


for lang in ("en", "hr"):
    build(lang)
