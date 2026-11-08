"""Path to production (documented, not built): Uputko inside the national systems.

Builds the English (production-path.svg) and Croatian (production-path.hr.svg)
versions. Run from this folder: python3 production-path.py && node render.cjs
"""

from kit import Diagram


def build(lang: str):
    def t(en, hr):
        return en if lang == "en" else hr

    d = Diagram(1600, 560, t("Uputko path to production", "Uputko: put do produkcije"))
    d.label(30, 40, t("PATH TO PRODUCTION · DOCUMENTED, NOT BUILT", "PUT DO PRODUKCIJE · DOKUMENTIRANO, NIJE IZGRAĐENO"))

    d.box(40, 110, 230, 120, "person", [t("Patient", "Pacijent"), t("e-Građani / NIAS login", "prijava e-Građani / NIAS")])
    d.box(430, 110, 250, 120, "app", ["Uputko", t("intake · safety · routing", "razgovor · sigurnost")])
    d.box(800, 110, 300, 120, "national", [t("Primary-care doctor", "Liječnik primarne zaštite"), t("certified practice software", "certificirani program ordinacije")])
    d.box(1220, 110, 340, 120, "national", ["CEZIH", "e-uputnica · FHIR ServiceRequest"])

    d.box(1220, 340, 340, 120, "national", ["e-Naručivanje", t("booking · FHIR Slot / Appointment", "naručivanje · FHIR Slot / Appointment")])
    d.box(800, 340, 300, 120, "hospital", [t("Hospital", "Bolnica"), t("scheduling desk · HIS", "šalter za naručivanje · BIS")])

    d.arrow([(270, 150), (430, 150)], t("describes once", "opiše jednom"), lx=0, ly=-16)
    d.arrow([(430, 195), (270, 195)], "push · SMS", lx=0, ly=24)
    d.arrow([(680, 170), (800, 170)], t("summary", "sažetak"), lx=0, ly=-16)
    d.arrow([(1100, 170), (1220, 170)], t("issues", "izdaje"), lx=0, ly=-16)
    d.arrow([(1390, 230), (1390, 340)], t("referral", "uputnica"), lx=t(48, 52), ly=4)
    d.arrow([(1220, 400), (1100, 400)], both=True)
    d.arrow([(800, 400), (555, 400), (555, 230)], t("slot · earlier slot · new time", "termin · raniji termin · novo vrijeme"), at=t(0.0, 1.0), lx=t(-40, 0), ly=t(-16, 0))

    d.label(
        1000,
        515,
        t(
            "FHIR mapping: summary → QuestionnaireResponse / Encounter · uputnica → ServiceRequest · booking → Slot / Appointment",
            "FHIR mapiranje: sažetak → QuestionnaireResponse / Encounter · uputnica → ServiceRequest · termin → Slot / Appointment",
        ),
        size=15,
        weight=500,
        anchor="middle",
    )
    d.legend(
        40,
        320,
        [
            ("person", t("people", "ljudi")),
            ("app", "Uputko"),
            ("national", t("national systems", "nacionalni sustavi")),
            ("hospital", t("hospital", "bolnica")),
        ],
        title=t("LEGEND", "LEGENDA"),
    )

    d.save(t("production-path", "production-path.hr"))


for lang in ("en", "hr"):
    build(lang)
