"""Golden path as swimlanes: who does what, in order (numbered steps).

Builds the English (golden-path.svg) and Croatian (golden-path.hr.svg)
versions. Run from this folder: python3 golden-path.py && node render.cjs
"""

from kit import Diagram

BW, BH = 162, 92
PY, UY, DY, HY = 109, 299, 474, 644  # box top per lane


def col(i):
    return 200 + i * 202  # left edge of column i


def mid(i):
    return col(i) + BW / 2


def build(lang: str):
    def t(en, hr):
        return en if lang == "en" else hr

    d = Diagram(1820, 800, t("Uputko golden path", "Uputko: glavni put"))
    d.label(30, 40, t("GOLDEN PATH · EAR PAIN → UPUTNICA → APPOINTMENT", "GLAVNI PUT · BOL U UHU → UPUTNICA → TERMIN"))

    d.lane(70, 170, t("Patient", "Pacijent"), "#F3F0FF")
    d.lane(260, 170, "Uputko", "#F7F5F9")
    d.lane(450, 140, t("Doctor", "Liječnik"), "#F3F0FF")
    d.lane(610, 160, t("Hospital", "Bolnica"), "#FFFBEE")

    def step(n, i, y, kind, lines):
        d.box(col(i), y, BW, BH, kind, lines)
        d.badge(col(i) + 4, y + 4, n)

    step(1, 0, PY, "person", [t("Describes it", "Opiše problem"), t("once, in Croatian", "jednom, hrvatski")])
    step(2, 1, UY, "safety", [t("Red-flag rules", "Hitni znakovi"), t("no emergency", "nije hitno")])
    step(3, 2, UY, "app", [t("AI asks 3–6", "AI postavi 3–6"), t("short questions", "kratkih pitanja")])
    d.box(col(2), PY, BW, BH, "person", [t("Answers", "Odgovara"), "Pošalji liječniku"])
    step(4, 3, UY, "safety", [t("Routing table", "Usmjeravanje"), t("→ family doctor", "→ obiteljski")])
    step(5, 4, DY, "app", [t("Email + link", "E-pošta + link"), t("opens the portal", "otvori portal")])
    step(6, 5, DY, "app", [t("Uploads uputnica", "Učita uputnicu"), t("AI reads · sends", "AI čita · šalje")])
    step(7, 6, HY, "hospital", [t("Earliest slot", "Najraniji"), t("held 15 minutes", "termin · 15 min")])
    step(8, 7, PY, "person", ["Uputnica stigla!", "Potvrdi termin"])
    step(9, 7, HY, "hospital", [t("Booked", "Rezervirano"), t("calendar · directions", "kalendar · upute")])

    d.arrow([(mid(0), PY + BH), (mid(0), UY + BH / 2), (col(1), UY + BH / 2)])
    d.arrow([(col(1) + BW, UY + BH / 2), (col(2), UY + BH / 2)])
    d.arrow([(mid(2), UY), (mid(2), PY + BH)], t("Q&A", "pitanja"), both=True, lx=t(30, 40), ly=4)
    d.arrow([(col(2) + BW, UY + BH / 2), (col(3), UY + BH / 2)])
    d.arrow([(mid(3), UY + BH), (mid(3), DY + BH / 2), (col(4), DY + BH / 2)], t("email", "e-pošta"), at=0.1, lx=t(32, 40), ly=10)
    d.arrow([(col(4) + BW, DY + BH / 2), (col(5), DY + BH / 2)])
    d.arrow([(mid(5), DY + BH), (mid(5), HY + BH / 2), (col(6), HY + BH / 2)])
    gap = col(7) - 20
    d.arrow([(col(6) + BW, HY + BH / 2), (gap, HY + BH / 2), (gap, PY + BH / 2), (col(7), PY + BH / 2)], t("live update", "uživo"), at=0.5, lx=0, ly=0)
    d.arrow([(mid(7), PY + BH), (mid(7), HY)], t("confirm", "potvrda"), at=0.5, lx=0, ly=-40)

    d.save(t("golden-path", "golden-path.hr"))


for lang in ("en", "hr"):
    build(lang)
