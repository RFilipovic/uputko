"""Tiny SVG kit for Uputko's diagrams (hand-placed layouts, brand colours).

Each diagram script builds a `Diagram` per language (English `name.svg`,
Croatian `name.hr.svg`), places boxes and arrows by coordinate, and calls
`save()`. Render to PNG with `node render.cjs`.
"""

from pathlib import Path
from xml.sax.saxutils import escape

INK, MUTED, LINE = "#16132E", "#565170", "#7A7493"
STYLE = {
    "person": ("#573DFE", "#3F25E0", "#FFFFFF"),
    "app": ("#FFFFFF", "#573DFE", INK),
    "safety": ("#FDECEC", "#C81E1E", INK),
    "danger": ("#C81E1E", "#A01818", "#FFFFFF"),
    "good": ("#E4F4EC", "#2E8B57", INK),
    "data": ("#E4F4EC", "#2E8B57", INK),
    "ext": ("#FFE9F7", "#D44FAE", INK),
    "etl": ("#FFF6D9", "#C9A227", INK),
    "national": ("#E4F4EC", "#2E8B57", INK),
    "hospital": ("#FFF6D9", "#C9A227", INK),
}


class Diagram:
    def __init__(self, width: int, height: int, title: str):
        self.w, self.h, self.title = width, height, title
        self.out: list[str] = []

    # -------------------------------------------------------------- text
    def text(self, x, y, lines, color=INK, size=17, anchor="middle"):
        parts = []
        for i, line in enumerate(lines):
            s = size if i == 0 else size - 3
            w = 700 if i == 0 else 500
            c = color if (i == 0 or color == "#FFFFFF") else MUTED
            dy = 0 if i == 0 else s + 6
            parts.append(
                f'<tspan x="{x}" dy="{dy}" font-size="{s}" font-weight="{w}" fill="{c}">{escape(line)}</tspan>'
            )
        self.out.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}">{"".join(parts)}</text>'
        )

    def label(self, x, y, s, size=15, weight=700, color=MUTED, anchor="start"):
        self.out.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{color}">{escape(s)}</text>'
        )

    # -------------------------------------------------------------- shapes
    def box(self, x, y, w, h, kind, lines, r=14):
        fill, stroke, color = STYLE[kind]
        self.out.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        )
        block = 17 + (len(lines) - 1) * 20
        self.text(x + w / 2, y + h / 2 - block / 2 + 13, lines, color=color)

    def cylinder(self, x, y, w, h, kind, lines):
        fill, stroke, color = STYLE[kind]
        e = 14
        self.out.append(
            f'<path d="M{x},{y + e} a{w / 2},{e} 0 0,0 {w},0 a{w / 2},{e} 0 0,0 {-w},0 v{h - 2 * e} '
            f'a{w / 2},{e} 0 0,0 {w},0 v{-(h - 2 * e)}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        )
        block = 17 + (len(lines) - 1) * 20
        self.text(x + w / 2, y + h / 2 - block / 2 + 20, lines, color=color)

    def panel(self, x, y, w, h, title, fill="#F7F5F9", stroke="#C9C2DA"):
        self.out.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{fill}" stroke="{stroke}" stroke-width="1.5" stroke-dasharray="6 5"/>'
        )
        if title:
            self.label(x + 20, y + 30, title.upper())

    def lane(self, y, h, title, fill):
        self.out.append(
            f'<rect x="20" y="{y}" width="{self.w - 40}" height="{h}" rx="18" fill="{fill}" stroke="#E2DDEA"/>'
        )
        self.label(44, y + h / 2 + 6, title, size=18, color=INK)

    def badge(self, x, y, n):
        self.out.append(f'<circle cx="{x}" cy="{y}" r="15" fill="#16132E"/>')
        self.out.append(
            f'<text x="{x}" y="{y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">{n}</text>'
        )

    def arrow(self, points, label=None, at=0.5, dashed=False, color=LINE, both=False, lx=0, ly=-8):
        d = "M" + " L".join(f"{px},{py}" for px, py in points)
        dash = ' stroke-dasharray="7 6"' if dashed else ""
        start = ' marker-start="url(#arrow-start)"' if both else ""
        self.out.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.2"{dash} marker-end="url(#arrow)"{start}/>'
        )
        if label:
            seg = min(int(at * (len(points) - 1)), len(points) - 2)
            (x1, y1), (x2, y2) = points[seg], points[seg + 1]
            mx, my = (x1 + x2) / 2 + lx, (y1 + y2) / 2 + ly
            width = 8.2 * len(label) + 14
            self.out.append(
                f'<rect x="{mx - width / 2}" y="{my - 15}" width="{width}" height="22" rx="11" fill="#FFFFFF" stroke="#E2DDEA"/>'
            )
            self.out.append(
                f'<text x="{mx}" y="{my + 1}" text-anchor="middle" font-size="13.5" font-weight="600" fill="{INK}">{escape(label)}</text>'
            )

    def legend(self, x, y, items, title="LEGEND"):
        self.label(x, y, title, size=14)
        for i, (kind, text) in enumerate(items):
            fill, stroke, _ = STYLE[kind]
            yy = y + 18 + i * 28
            self.out.append(
                f'<rect x="{x}" y="{yy}" width="22" height="18" rx="5" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
            )
            self.label(x + 32, yy + 14, text, size=14, weight=400, color=INK)

    # -------------------------------------------------------------- output
    def save(self, name: str):
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif">
<title>{escape(self.title)}</title>
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/>
  </marker>
  <marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/>
  </marker>
</defs>
<rect width="{self.w}" height="{self.h}" fill="#FFFFFF"/>
{chr(10).join(self.out)}
</svg>
"""
        Path(__file__).with_name(f"{name}.svg").write_text(svg, encoding="utf-8")
        print(f"wrote {name}.svg")
