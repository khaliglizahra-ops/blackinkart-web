#!/usr/bin/env python3
"""Offline "clay render" of the body meshes, for judging form while sculpting.

The browser viewer is fine for customers but useless for reviewing anatomy: the camera
is hard to place, the skin texture hides the surface, and every check costs a page load.
This renders the raw geometry as matte grey clay under a raking key light — the same
trick sculptors use, because side light turns subtle surface changes into visible shadow.

  python3 render-preview.py                       # male, torso + full body
  python3 render-preview.py --mesh female         # the other mesh
  python3 render-preview.py --out /tmp/x.png      # somewhere else
"""
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image

MODELS = Path(__file__).resolve().parent.parent / "public" / "models"


def load_obj(path):
    verts, faces = [], []
    with open(path) as fh:
        for line in fh:
            if line.startswith("v "):
                verts.append([float(t) for t in line.split()[1:4]])
            elif line.startswith("f "):
                ids = [int(p.split("/")[0]) - 1 for p in line.split()[1:]]
                for k in range(1, len(ids) - 1):          # fan-triangulate quads
                    faces.append([ids[0], ids[k], ids[k + 1]])
    return np.array(verts, dtype=np.float64), np.array(faces, dtype=np.int64)


def smooth_normals(V, F):
    """Average face normals per *position*, not per index.

    The OBJ is split along UV seams, so the same point appears several times. Averaging
    per index would leave visible facet seams down the middle of the chest.
    """
    uniq, inv = np.unique(np.round(V, 5), axis=0, return_inverse=True)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    acc = np.zeros((len(uniq), 3))
    for k in range(3):
        np.add.at(acc, inv[F[:, k]], fn)
    ln = np.linalg.norm(acc, axis=1, keepdims=True)
    ln[ln == 0] = 1.0
    return (acc / ln)[inv]


def rasterise(V, N, F, w, h, yaw, centre, scale, key_dir):
    """Orthographic z-buffer render. Returns an (h, w) float image in 0..1."""
    c, s = math.cos(yaw), math.sin(yaw)
    rot = np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]])
    P = V @ rot.T
    Nr = N @ rot.T

    sx = (P[:, 0] - centre[0]) * scale + w / 2.0
    sy = h / 2.0 - (P[:, 1] - centre[1]) * scale
    sz = P[:, 2]

    depth = np.full((h, w), -1e9)
    shade = np.zeros((h, w))

    tri = F
    ax, ay = sx[tri[:, 0]], sy[tri[:, 0]]
    bx, by = sx[tri[:, 1]], sy[tri[:, 1]]
    cx, cy = sx[tri[:, 2]], sy[tri[:, 2]]
    area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)

    # Screen-space winding is negative for front faces here; drop the rest.
    keep = area < -1e-9
    idx = np.where(keep)[0]

    L = np.array(key_dir, dtype=np.float64)
    L /= np.linalg.norm(L)

    for t in idx:
        i0, i1, i2 = tri[t]
        x0, x1, x2 = sx[i0], sx[i1], sx[i2]
        y0, y1, y2 = sy[i0], sy[i1], sy[i2]
        xlo = max(int(math.floor(min(x0, x1, x2))), 0)
        xhi = min(int(math.ceil(max(x0, x1, x2))), w - 1)
        ylo = max(int(math.floor(min(y0, y1, y2))), 0)
        yhi = min(int(math.ceil(max(y0, y1, y2))), h - 1)
        if xhi < xlo or yhi < ylo:
            continue

        gx, gy = np.meshgrid(np.arange(xlo, xhi + 1), np.arange(ylo, yhi + 1))
        gx = gx + 0.5
        gy = gy + 0.5
        d = area[t]
        w0 = ((x1 - gx) * (y2 - gy) - (x2 - gx) * (y1 - gy)) / d
        w1 = ((x2 - gx) * (y0 - gy) - (x0 - gx) * (y2 - gy)) / d
        w2 = 1.0 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any():
            continue

        z = w0 * sz[i0] + w1 * sz[i1] + w2 * sz[i2]
        sub_d = depth[ylo:yhi + 1, xlo:xhi + 1]
        better = inside & (z > sub_d)
        if not better.any():
            continue

        n = (w0[..., None] * Nr[i0] + w1[..., None] * Nr[i1] + w2[..., None] * Nr[i2])
        nl = np.linalg.norm(n, axis=-1, keepdims=True)
        nl[nl == 0] = 1.0
        n = n / nl

        diffuse = np.clip(n @ L, 0, 1)
        # Hemisphere ambient keeps shadowed areas readable instead of crushing to black.
        ambient = 0.30 + 0.20 * np.clip(n[..., 1], -1, 1)
        rim = np.clip(1.0 - np.clip(n[..., 2], 0, 1), 0, 1) ** 3
        lit = np.clip(0.14 + 0.86 * diffuse, 0, 1) * 0.80 + ambient * 0.34 + rim * 0.16

        sub_s = shade[ylo:yhi + 1, xlo:xhi + 1]
        sub_d[better] = z[better]
        sub_s[better] = np.clip(lit[better], 0, 1)

    return shade


def view(V, N, F, yaw, centre, scale, w=440, h=620, key=(-0.55, 0.42, 0.72)):
    img = rasterise(V, N, F, w, h, yaw, centre, scale, key)
    px = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    rgb = np.stack([px, px, px], axis=-1)
    bg = px == 0
    rgb[bg] = (18, 18, 20)
    return Image.fromarray(rgb)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mesh", default="male")
    ap.add_argument("--out", default="/tmp/body-preview.png")
    ap.add_argument("--chest", action="store_true", help="yakın plan göğüs, sıyırma ışığı")
    args = ap.parse_args()

    path = MODELS / f"human-body-{args.mesh}.obj"
    V, F = load_obj(path)
    N = smooth_normals(V, F)

    minY, maxY = V[:, 1].min(), V[:, 1].max()
    H = maxY - minY
    mid = (V[:, 0].min() + V[:, 0].max()) / 2.0

    torso_y = minY + 0.715 * H          # chest height
    full_y = minY + 0.50 * H

    chest_y = minY + 0.745 * H

    tiles = []
    if args.chest:
        # Raking light almost along the surface: the shallowest bump casts a long shadow,
        # so a wrong pectoral shape is impossible to miss. Four light angles because a
        # single one can flatter a bad form by accident.
        for yaw, key in (
            (0.0, (-0.94, 0.10, 0.32)),      # hard left rake, front on
            (0.0, (0.94, 0.10, 0.32)),       # hard right rake, front on
            (0.0, (-0.20, 0.93, 0.30)),      # top light — reads the lower border
            (math.radians(42), (-0.80, 0.30, 0.52)),
        ):
            tiles.append(view(V, N, F, yaw, (mid, chest_y), 900.0 / H * 2.55, 460, 560, key))
    else:
        # Torso close-ups: front, three-quarter, side — the angles that expose a bad chest.
        for yaw in (0.0, math.radians(38), math.radians(78)):
            tiles.append(view(V, N, F, yaw, (mid, torso_y), 900.0 / H * 2.6, 440, 620))
        # Whole body for proportion, front and three-quarter.
        for yaw in (0.0, math.radians(38)):
            tiles.append(view(V, N, F, yaw, (mid, full_y), 900.0 / H * 0.92, 340, 620))

    gap = 10
    tw = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
    sheet = Image.new("RGB", (tw, max(t.height for t in tiles)), (18, 18, 20))
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0))
        x += t.width + gap
    sheet.save(args.out)
    print(f"{args.mesh}: {len(V)} vertex, {len(F)} üçgen -> {args.out} {sheet.size}")


if __name__ == "__main__":
    main()
