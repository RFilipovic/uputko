"""Golden path as swimlanes: who does what, in order (numbered steps).

Run from this folder: python3 golden-path.py && node render.cjs
"""

from kit import Diagram

d = Diagram(1820, 800, "Uputko golden path")
d.label(30, 40, "GOLDEN PATH · EAR PAIN → UPUTNICA → APPOINTMENT")

# Lanes
d.lane(70, 170, "Patient", "#F3F0FF")
d.lane(260, 170, "Uputko", "#F7F5F9")
d.lane(450, 140, "Doctor", "#F3F0FF")
d.lane(610, 160, "Hospital", "#FFFBEE")

BW, BH = 162, 92
col = lambda i: 200 + i * 202  # noqa: E731  left edge of column i
mid = lambda i: col(i) + BW / 2  # noqa: E731
PY, UY, DY, HY = 109, 299, 474, 644  # box top per lane


def step(n, i, y, kind, lines):
    d.box(col(i), y, BW, BH, kind, lines)
    d.badge(col(i) + 4, y + 4, n)


step(1, 0, PY, "person", ["Describes it", "once, in Croatian"])
step(2, 1, UY, "safety", ["Red-flag rules", "no emergency"])
step(3, 2, UY, "app", ["AI asks 3–6", "short questions"])
d.box(col(2), PY, BW, BH, "person", ["Answers", "Pošalji liječniku"])
step(4, 3, UY, "safety", ["Routing table", "→ family doctor"])
step(5, 4, DY, "app", ["Email + link", "opens the portal"])
step(6, 5, DY, "app", ["Uploads uputnica", "AI reads · sends"])
step(7, 6, HY, "hospital", ["Earliest slot", "held 15 minutes"])
step(8, 7, PY, "person", ["Uputnica stigla!", "Potvrdi termin"])
step(9, 7, HY, "hospital", ["Booked", "calendar · directions"])

# Flow
d.arrow([(mid(0), PY + BH), (mid(0), UY + BH / 2), (col(1), UY + BH / 2)])
d.arrow([(col(1) + BW, UY + BH / 2), (col(2), UY + BH / 2)])
d.arrow([(mid(2), UY), (mid(2), PY + BH)], "Q&A", both=True, lx=30, ly=4)
d.arrow([(col(2) + BW, UY + BH / 2), (col(3), UY + BH / 2)])
d.arrow([(mid(3), UY + BH), (mid(3), DY + BH / 2), (col(4), DY + BH / 2)], "email", at=0.1, lx=32, ly=10)
d.arrow([(col(4) + BW, DY + BH / 2), (col(5), DY + BH / 2)])
d.arrow([(mid(5), DY + BH), (mid(5), HY + BH / 2), (col(6), HY + BH / 2)])
gap = col(7) - 20
d.arrow([(col(6) + BW, HY + BH / 2), (gap, HY + BH / 2), (gap, PY + BH / 2), (col(7), PY + BH / 2)], "live update", at=0.5, lx=0, ly=0)
d.arrow([(mid(7), PY + BH), (mid(7), HY)], "confirm", at=0.5, lx=0, ly=-40)

d.save("golden-path")
