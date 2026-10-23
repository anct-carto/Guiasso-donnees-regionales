#!/usr/bin/env python3
"""Construit data/regions.js à partir de source/*.geojson (Lambert-93, EPSG:2154).
Python 3 standard uniquement. Usage : python3 scripts/build_data.py"""
import json, math, random, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, DATA = ROOT / "source", ROOT / "data"
YEAR = 2026            # doit rester identique à js/config.js
EPS_KM = 0.12          # simplification des contours (km) : plus petit = plus précis, plus lourd
MIN_AREA_KM2 = 0.15    # îlots ignorés en dessous
MARGIN_KM = 3.0        # marge ajoutée si un cercle est recalculé
TERR = {"GF": "Guyane", "GP": "Guadeloupe", "MQ": "Martinique", "RE": "La Réunion", "YT": "Mayotte"}

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)

def rdp(pts, eps):
    """Douglas-Peucker itératif sur un anneau fermé."""
    if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
    if len(pts) < 4: return pts
    far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
    def seg(a, b):
        keep, stack = {a, b}, [(a, b)]
        while stack:
            i, j = stack.pop()
            (x1, y1), (x2, y2) = pts[i % len(pts)], pts[j % len(pts)]
            dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-12
            best, k = 0, None
            for t in range(i + 1, j):
                x, y = pts[t]; d = abs(dy * (x - x1) - dx * (y - y1)) / L
                if d > best: best, k = d, t
            if k is not None and best > eps:
                keep.add(k); stack += [(i, k), (k, j)]
        return keep
    keep = seg(0, far) | seg(far, len(pts))
    return [pts[i % len(pts)] for i in sorted(k for k in keep if k < len(pts))]

def area(p):
    return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2

def rings(g):
    for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
        yield from poly

def circle2(a, b): return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), math.dist(a, b) / 2

def circle3(a, b, c):
    ax, ay, bx, by, cx, cy = *a, *b, *c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-12:
        return max((circle2(a, b), circle2(a, c), circle2(b, c)), key=lambda t: t[1])
    ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / d
    uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / d
    return (ux, uy), math.dist((ux, uy), a)

def min_circle(pts):
    """Plus petit cercle englobant (algorithme incrémental de Welzl)."""
    pts = pts[:]; random.Random(1).shuffle(pts); c = (pts[0], 0.0); e = 1e-9
    for i, p in enumerate(pts):
        if math.dist(p, c[0]) > c[1] + e:
            c = (p, 0.0)
            for j in range(i):
                q = pts[j]
                if math.dist(q, c[0]) > c[1] + e:
                    c = circle2(p, q)
                    for k in range(j):
                        s = pts[k]
                        if math.dist(s, c[0]) > c[1] + e: c = circle3(p, q, s)
    return c

def main():
    reg = json.load(open(SRC / "reg.geojson", encoding="utf8"))
    cer = json.load(open(SRC / "cercle.geojson", encoding="utf8"))
    meta = json.load(open(SRC / "regions_meta.json", encoding="utf8"))
    xs, ys, raw, regions = [], [], {}, []
    for f in reg["features"]:
        n = f["properties"]["lib_reg"]; paths = []; raw[n] = []
        for r in rings(f["geometry"]):
            a = [(x / 1000, -y / 1000) for x, y in r]; raw[n] += a
            s = rdp(a, EPS_KM)
            if len(s) < 3 or abs(area(s)) < MIN_AREA_KM2: continue
            xs += [p[0] for p in s]; ys += [p[1] for p in s]
            paths.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in s) + "Z")
        m = meta[n]
        regions.append({"n": n, "slug": slug(n), "c": m["chef_lieu"], "d": m["departements"], "p": "".join(paths)})
    circles = []
    for f in cer["features"]:
        q = f["properties"]; n = TERR[q["iso_territoire_2"]]
        cx, cy, r = q["centre_x"] / 1000, -q["centre_y"] / 1000, q["rayon_m"] / 1000
        far = max(math.dist((cx, cy), p) for p in raw[n])
        if far > r:  # le territoire dépasse du cercle fourni : on le recalcule
            (cx, cy), r = min_circle(raw[n]); r += MARGIN_KM
            print(f"[corrigé] cercle {n} : le territoire dépassait de {far - q['rayon_m'] / 1000:.1f} km")
        circles.append([round(cx, 1), round(cy, 1), round(r, 1)])
        xs += [cx - r, cx + r]; ys += [cy - r, cy + r]
    pad = 15
    vb = f"{min(xs)-pad:.0f} {min(ys)-pad:.0f} {max(xs)-min(xs)+2*pad:.0f} {max(ys)-min(ys)+2*pad:.0f}"
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    DATA.mkdir(exist_ok=True); (DATA / "xlsx").mkdir(exist_ok=True)
    (DATA / "regions.js").write_text(f"window.REGIONS={dump(regions)};\nwindow.CIRCLES={dump(circles)};\nwindow.VIEWBOX={dump(vb)};\n", encoding="utf8")
    (DATA / "xlsx" / "FICHIERS_ATTENDUS.txt").write_text(
        "Déposez ici les fichiers Excel finaux (un par région), avec exactement ces noms :\n\n"
        + "\n".join(f"{r['slug']}.{YEAR}.xlsx   <- {r['n']}" for r in regions) + "\n", encoding="utf8")
    print(f"{len(regions)} régions, {len(circles)} cercles, viewBox {vb} -> data/regions.js")

if __name__ == "__main__":
    main()
