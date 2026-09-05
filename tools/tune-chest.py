#!/usr/bin/env python3
"""Render several pectoral settings side by side, without touching the shipped model.

Tuning one number, rebuilding, looking, then repeating hides the trade-off — you never
see two candidates next to each other, so you keep circling. This builds the undisplaced
mesh once, applies each candidate's PEC settings to a copy in memory, renders the same
views of each, and lays them out in one labelled sheet.

  python3 build-bodies.py && python3 tune-chest.py

Nothing here writes to public/models; pick a winner, then put its numbers into
anatomy.PEC and run the real apply-anatomy.py.
"""
import importlib.util
import math
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import anatomy

HERE = Path(__file__).resolve().parent
MODELS = HERE.parent / "public" / "models"

# render-preview.py has a hyphen in its name, so it cannot be imported normally.
_spec = importlib.util.spec_from_file_location("render_preview", HERE / "render-preview.py")
rp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rp)


# "pec_" ile başlayan anahtarlar anatomy.PEC'e, diğerleri MALE ağırlıklarına gider.
# "pec_" ile başlayan anahtarlar anatomy.PEC'e, diğerleri MALE ağırlıklarına gider.
# Hedef: referans mankendeki gibi DÜZ, blok hâlinde göğüs + net alt kenar.
# fat_pad (alt-dış yağ yastığı) sıfırlandı: kütleyi aşağı topluyor ve lob hissi veriyor.
_C = dict(abs=0.44, abs_rows=3, stern=0.52)
VARIANTS = [
    dict(name="A blok",      pec_e_low=0.06, pec_crease=0.030, pec_fat_pad=0.0, pec_clav_head=0.22, pec_amp=0.115, **_C),
    dict(name="B blok+guclu",pec_e_low=0.06, pec_crease=0.040, pec_fat_pad=0.0, pec_clav_head=0.30, pec_amp=0.130, **_C),
    dict(name="C orta",      pec_e_low=0.10, pec_crease=0.030, pec_fat_pad=0.0, pec_clav_head=0.26, pec_amp=0.120, **_C),
    dict(name="D ince blok", pec_e_low=0.06, pec_crease=0.030, pec_fat_pad=0.0, pec_clav_head=0.22, pec_amp=0.095, **_C),
]


def load_full(path):
    """Vertices, quads (vertex indices only) — enough to compute normals and displace."""
    V, quads = [], []
    for line in open(path):
        if line.startswith("v "):
            V.append([float(t) for t in line.split()[1:4]])
        elif line.startswith("f "):
            quads.append([int(p.split("/")[0]) - 1 for p in line.split()[1:]])
    return np.array(V), quads


def normals(V, quads):
    N = np.zeros_like(V)
    for q in quads:
        tris = ((0, 1, 2), (0, 2, 3)) if len(q) == 4 else ((0, 1, 2),)
        for a, b, c in tris:
            ia, ib, ic = q[a], q[b], q[c]
            n = np.cross(V[ib] - V[ia], V[ic] - V[ia])
            N[ia] += n
            N[ib] += n
            N[ic] += n
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)


def main():
    src = MODELS / "human-body-male.obj"
    if "anatomy-applied" in open(src).readline():
        sys.exit("Önce 'python3 build-bodies.py' çalıştırın — mesh şu an deforme edilmiş hâlde.")

    V0, quads = load_full(src)
    N0 = normals(V0, quads)
    minY, H = V0[:, 1].min(), V0[:, 1].max() - V0[:, 1].min()
    tris = np.array([t for q in quads
                     for t in (((q[0], q[1], q[2]), (q[0], q[2], q[3])) if len(q) == 4
                               else ((q[0], q[1], q[2]),))], dtype=np.int64)

    base = dict(anatomy.PEC)
    mid = (V0[:, 0].min() + V0[:, 0].max()) / 2.0
    columns = []

    for var in VARIANTS:
        anatomy.PEC.update(base)
        anatomy.PEC.update({k[4:]: v for k, v in var.items() if k.startswith("pec_")})
        weights = dict(anatomy.MALE)
        weights.update({k: v for k, v in var.items()
                        if k != "name" and not k.startswith("pec_")})

        f = anatomy.anatomy_field(V0, N0, minY, H, weights)
        V = V0 + N0 * (f * 0.85)[:, None]
        Nn = rp.smooth_normals(V, tris)

        tiles = [
            rp.view(V, Nn, tris, 0.0, (mid, minY + 0.720 * H), 900.0 / H * 1.55, 400, 470,
                    (-0.30, 0.55, 0.78)),
            rp.view(V, Nn, tris, math.radians(40), (mid, minY + 0.745 * H), 900.0 / H * 2.4,
                    400, 470, (-0.72, 0.34, 0.60)),
        ]
        col = Image.new("RGB", (400, 470 * 2 + 34), (18, 18, 20))
        col.paste(tiles[0], (0, 26))
        col.paste(tiles[1], (0, 26 + 470 + 8))
        ImageDraw.Draw(col).text((8, 6), var["name"], fill=(242, 169, 0))
        columns.append(col)
        peak = (f * 0.85).max() * 10.5 * 10
        print(f"  {var['name']:9s} tepe deplasman = {peak:5.2f} mm")

    anatomy.PEC.update(base)
    gap = 8
    sheet = Image.new("RGB",
                      (sum(c.width for c in columns) + gap * (len(columns) - 1),
                       columns[0].height), (18, 18, 20))
    x = 0
    for c in columns:
        sheet.paste(c, (x, 0))
        x += c.width + gap
    out = "/tmp/chest-tune.png"
    sheet.save(out)
    print("->", out, sheet.size)


if __name__ == "__main__":
    main()
