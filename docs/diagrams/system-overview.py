"""Uputko system overview (hand-placed layout, no crossing lines).

Run from this folder: python3 system-overview.py && node render.cjs
"""

from kit import Diagram

d = Diagram(1600, 1000, "Uputko system overview")

# ---------------------------------------------------------------- panels
d.panel(320, 150, 960, 600, "Uputko app · Next.js 15 on Vercel")
d.panel(1320, 150, 250, 600, "Supabase · EU")
d.panel(320, 790, 1250, 180, "Open-data pipeline · Python")
d.panel(320, 20, 1250, 100, "External services", fill="#FFFFFF")

# ---------------------------------------------------------------- people
d.box(40, 190, 230, 90, "person", ["Patient", "phone browser"])
d.box(40, 440, 230, 90, "person", ["Doctor", "link from email"])
d.box(40, 610, 230, 90, "person", ["Hospital desk", "demo panel"])

# ---------------------------------------------------------------- externals
d.box(810, 45, 210, 60, "ext", ["Claude API", "chat · reads uputnica"])
d.box(1050, 45, 210, 60, "ext", ["Resend", "emails → demo inbox"])
d.box(1340, 45, 210, 60, "ext", ["OpenFreeMap", "map tiles on patient pages"])

# ---------------------------------------------------------------- app: chat pipeline
d.box(340, 195, 190, 80, "app", ["/api/chat", "streamed replies"])
d.box(570, 195, 200, 80, "safety", ["Red-flag rules", "before the AI sees it"])
d.box(810, 195, 210, 80, "app", ["AI agent", "one question at a time"])
d.box(1060, 195, 200, 80, "safety", ["Routing table", "code decides who"])

d.box(570, 330, 200, 70, "danger", ["112 takeover", "+ nearest OHBP"])
d.box(1060, 330, 200, 70, "good", ["Direct route", "nearest open practice"])

# ---------------------------------------------------------------- app: doctor + booking + pages
d.box(340, 445, 230, 80, "app", ["Doctor portal", "check & send uputnica"])
d.box(640, 445, 300, 80, "app", ["Booking & offers API", "appointments · notifications"])
d.box(340, 615, 230, 80, "app", ["Hospital panel", "/ustanova (demo)"])
d.box(1040, 615, 220, 80, "app", ["Case page", "live on the patient's phone"])

# ---------------------------------------------------------------- supabase
d.cylinder(1345, 300, 200, 150, "data", ["Postgres + PostGIS", "open data + synthetic", "patient flow"])
d.box(1345, 615, 165, 80, "data", ["Realtime", "change pings"])

# ---------------------------------------------------------------- pipeline
d.box(350, 845, 330, 90, "etl", ["data.gov.hr CKAN API", "HZZO · Grad Zagreb · OSM"])
d.box(740, 845, 360, 90, "etl", ["fetch → transform", "geocode → load"])
d.box(1160, 845, 130, 90, "etl", ["seed.sql", "committed"])

# ---------------------------------------------------------------- edges
d.arrow([(270, 235), (340, 235)], "describes", lx=0, ly=-14)
d.arrow([(530, 235), (570, 235)])
d.arrow([(770, 235), (810, 235)], "no flag", lx=0, ly=-14)
d.arrow([(670, 275), (670, 330)], "red flag", lx=44, ly=4)
d.arrow([(915, 195), (915, 105)], both=True)
d.arrow([(1020, 235), (1060, 235)])
d.arrow([(1160, 275), (1160, 330)], "away + tooth", lx=58, ly=4)
d.arrow([(1160, 195), (1160, 105)], "email", lx=-34, ly=4)
# Email link reaches the doctor (orthogonal, under the chat row).
d.arrow([(1100, 275), (1100, 300), (1040, 300), (1040, 420), (455, 420), (455, 445)], "secure link to doctor", at=0.6, dashed=True, lx=-110, ly=-2)
d.arrow([(270, 485), (340, 485)])
d.arrow([(570, 485), (640, 485)], "uputnica", lx=0, ly=-14)
d.arrow([(270, 655), (340, 655)])
d.arrow([(570, 655), (790, 655), (790, 525)], "free slot · offer", at=0.3)
d.arrow([(940, 485), (1345, 485), (1345, 440)], "SQL transactions", at=0.3)
d.arrow([(1260, 235), (1295, 235), (1295, 345), (1345, 345)])
d.arrow([(1427, 450), (1427, 615)])
d.arrow([(1345, 655), (1260, 655)], "live", lx=0, ly=-14)
d.arrow([(1225, 845), (1225, 770), (1530, 770), (1530, 440)], "seed", at=0.5)
d.arrow([(680, 890), (740, 890)])
d.arrow([(1100, 890), (1160, 890)])

# ---------------------------------------------------------------- legend
d.legend(40, 790, [("person", "people"), ("app", "our app"), ("safety", "deterministic safety"), ("data", "database"), ("ext", "external service"), ("etl", "data pipeline")])

d.save("system-overview")
