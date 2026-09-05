"""Apply the anatomy field to a body mesh: displace geometry + bake a bump map."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from anatomy import anatomy_field, MALE, FEMALE

MODELS = "../public/models"
TEX = 1536


def load(path):
    V, VT, quads = [], [], []
    for l in open(path):
        if l.startswith("v "):
            V.append([float(t) for t in l.split()[1:4]])
        elif l.startswith("vt "):
            VT.append([float(t) for t in l.split()[1:3]])
        elif l.startswith("f "):
            quads.append([(int(p.split("/")[0]) - 1, int(p.split("/")[1]) - 1) for p in l.split()[1:]])
    return np.array(V), np.array(VT), quads


def triangles(quads):
    tris = []
    for q in quads:
        for a, b, c in ((0, 1, 2), (0, 2, 3)) if len(q) == 4 else ((0, 1, 2),):
            tris.append((q[a], q[b], q[c]))
    return tris


def vertex_normals(V, tris):
    N = np.zeros_like(V)
    for (a, _), (b, _), (c, _) in tris:
        n = np.cross(V[b] - V[a], V[c] - V[a])
        N[a] += n; N[b] += n; N[c] += n
    ln = np.linalg.norm(N, axis=1, keepdims=True)
    return N / np.maximum(ln, 1e-9)


def bake_bump(V, VT, tris, field_of_point, path):
    """Rasterise the mesh through its UVs, evaluating the field per texel."""
    height = np.zeros((TEX, TEX), np.float32)
    filled = np.zeros((TEX, TEX), bool)
    for (ia, ta), (ib, tb), (ic, tc) in tris:
        uv = np.array([VT[ta], VT[tb], VT[tc]])
        px = np.stack([uv[:, 0] * (TEX - 1), (1 - uv[:, 1]) * (TEX - 1)], 1)
        x0, y0 = np.floor(px.min(0)).astype(int) - 1
        x1, y1 = np.ceil(px.max(0)).astype(int) + 1
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, TEX - 1), min(y1, TEX - 1)
        if x1 <= x0 or y1 <= y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        v0, v1 = px[1] - px[0], px[2] - px[0]
        den = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(den) < 1e-9:
            continue
        vx, vy = xs - px[0, 0], ys - px[0, 1]
        w1 = (vx * v1[1] - v1[0] * vy) / den
        w2 = (v0[0] * vy - vx * v0[1]) / den
        w0 = 1 - w1 - w2
        m = (w0 >= -0.002) & (w1 >= -0.002) & (w2 >= -0.002)
        if not m.any():
            continue
        vals = (w0[m] * field_of_point[ia] + w1[m] * field_of_point[ib] + w2[m] * field_of_point[ic])
        height[ys[m], xs[m]] = vals
        filled[ys[m], xs[m]] = True

    img = np.clip(128 + height * 640, 0, 255).astype(np.uint8)
    img[~filled] = 128
    out = Image.fromarray(img, "L").filter(ImageFilter.GaussianBlur(0.7))
    out.save(path, quality=92)
    print("  bump map ->", path, f"({filled.mean()*100:.0f}% of UV space covered)")


def process(name, weights, gain):
    path = f"{MODELS}/{name}"
    V, VT, quads = load(path)
    tris = triangles(quads)
    N = vertex_normals(V, tris)
    minY, H = V[:, 1].min(), V[:, 1].max() - V[:, 1].min()

    f = anatomy_field(V, N, minY, H, weights)
    print(f"{name}: field range {f.min():+.3f}..{f.max():+.3f}")

    # bake the map from the *undisplaced* surface, then displace the geometry
    bake_bump(V, VT, tris, f, f"{MODELS}/anatomy-{name.split('-')[-1].replace('.obj','')}.jpg")

    Vd = V + N * (f * gain)[:, None]
    lines = open(path).read().split("\n")
    out, k = [], 0
    for l in lines:
        if l.startswith("v "):
            out.append(f"v {Vd[k,0]:.6f} {Vd[k,1]:.6f} {Vd[k,2]:.6f}"); k += 1
        else:
            out.append(l)
    open(path, "w").write("\n".join(out))
    print(f"  displaced {k} verts (gain {gain})")


if __name__ == "__main__":
    process("human-body-male.obj", MALE, 0.85)
    process("human-body-female.obj", FEMALE, 0.80)
