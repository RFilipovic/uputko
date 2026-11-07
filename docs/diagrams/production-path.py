"""Path to production (documented, not built): Uputko inside the national systems.

Run from this folder: python3 production-path.py && node render.cjs
"""

from kit import Diagram

d = Diagram(1600, 560, "Uputko path to production")
d.label(30, 40, "PATH TO PRODUCTION · DOCUMENTED, NOT BUILT")

d.box(40, 110, 230, 120, "person", ["Patient", "e-Građani / NIAS login"])
d.box(430, 110, 250, 120, "app", ["Uputko", "intake · safety · routing"])
d.box(800, 110, 300, 120, "national", ["Primary-care doctor", "certified practice software"])
d.box(1220, 110, 340, 120, "national", ["CEZIH", "e-uputnica · FHIR ServiceRequest"])

d.box(1220, 340, 340, 120, "national", ["e-Naručivanje", "booking · FHIR Slot / Appointment"])
d.box(800, 340, 300, 120, "hospital", ["Hospital", "scheduling desk · HIS"])

d.arrow([(270, 150), (430, 150)], "describes once", lx=0, ly=-16)
d.arrow([(430, 195), (270, 195)], "push · SMS", lx=0, ly=24)
d.arrow([(680, 170), (800, 170)], "summary", lx=0, ly=-16)
d.arrow([(1100, 170), (1220, 170)], "issues", lx=0, ly=-16)
d.arrow([(1390, 230), (1390, 340)], "referral", lx=48, ly=4)
d.arrow([(1220, 400), (1100, 400)], both=True)
d.arrow([(800, 400), (555, 400), (555, 230)], "slot · earlier slot · new time", at=0.0, lx=-40, ly=-16)

d.label(1000, 515, "FHIR mapping: summary → QuestionnaireResponse / Encounter · uputnica → ServiceRequest · booking → Slot / Appointment", size=15, weight=500, anchor="middle")
d.legend(40, 320, [("person", "people"), ("app", "Uputko"), ("national", "national systems"), ("hospital", "hospital")])

d.save("production-path")
