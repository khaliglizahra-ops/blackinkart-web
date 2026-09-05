"""Build the male / female mannequins for the 3D tattoo preview.

Stage 1: MakeHuman's own CC0 morph targets (gender, muscle, proportions, bust) are
         applied to the CC0 base mesh — this supplies the real anatomy.
Stage 2: a small corrective pass (male chest / pelvis) with deformations faded out by
         true 3D distance to the arm join, so the mesh can never tear.
"""
import numpy as np, os
from collections import defaultdict

BASE, TDIR = "body-source/mh_base.obj", "body-source"
raw = open(BASE).read().split("\n")
BV, bvidx = [], []
for i, l in enumerate(raw):
    if l.startswith("v "):
        BV.append([float(t) for t in l.split()[1:4]]); bvidx.append(i)
BV = np.array(BV)

def target(name):
    d = np.zeros_like(BV)
    for l in open(os.path.join(TDIR, name)):
        if l.startswith("#") or not l.strip(): continue
        p = l.split()
        if len(p) >= 4: d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d

def extract_body(P):
    """Keep only the visible `body` group; returns (verts, uv_lines, face_lines)."""
    src = list(raw)
    for k, i in enumerate(bvidx):
        src[i] = f"v {P[k,0]:.6f} {P[k,1]:.6f} {P[k,2]:.6f}"
    verts, uvs, faces, group = [], [], [], None
    for l in src:
        if l.startswith("v "): verts.append([float(t) for t in l.split()[1:4]])
        elif l.startswith("vt "): uvs.append(l)
        elif l.startswith("g "): group = l[2:].strip()
        elif l.startswith("f ") and group == "body": faces.append(l)
    used_v, used_vt, out_faces = {}, {}, []
    for f in faces:
        parts = []
        for p in f.split()[1:]:
            c = p.split("/"); vi = int(c[0]); vti = int(c[1]) if len(c) > 1 and c[1] else None
            if vi not in used_v: used_v[vi] = len(used_v)+1
            if vti is not None:
                if vti not in used_vt: used_vt[vti] = len(used_vt)+1
                parts.append(f"{used_v[vi]}/{used_vt[vti]}")
            else: parts.append(f"{used_v[vi]}")
        out_faces.append("f " + " ".join(parts))
    inv_v = {n: o for o, n in used_v.items()}; inv_vt = {n: o for o, n in used_vt.items()}
    V = np.array([verts[inv_v[i]-1] for i in range(1, len(used_v)+1)])
    U = [uvs[inv_vt[i]-1] for i in range(1, len(used_vt)+1)]
    return V, U, out_faces

def save(V, U, F, name):
    with open(f"../public/models/{name}", "w") as fh:
        fh.write("# Black Ink Art body mesh — MakeHuman base + CC0 morph targets\n")
        for v in V: fh.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        for u in U: fh.write(u + "\n")
        fh.write("\n".join(F) + "\n")

def sstep(t): t = np.clip(t, 0, 1); return t*t*(3-2*t)

def male_corrections(V, F):
    """Flatten the base mesh's chest into pectorals and narrow the pelvis."""
    adj = defaultdict(set)
    for l in F:
        ids = [int(p.split("/")[0])-1 for p in l.split()[1:]]
        for k in range(len(ids)):
            a, b = ids[k], ids[(k+1) % len(ids)]
            adj[a].add(b); adj[b].add(a)
    neigh = [np.array(sorted(adj[i]), dtype=np.int64) if adj[i] else np.array([], dtype=np.int64)
             for i in range(len(V))]
    minY, H = V[:,1].min(), V[:,1].max()-V[:,1].min()
    ARM_X = 2.05
    is_arm = np.abs(V[:,0]) > ARM_X; body = ~is_arm

    def min_dist(pts, ref, chunk=400):
        out = np.empty(len(pts))
        for i in range(0, len(pts), chunk):
            c = pts[i:i+chunk]
            out[i:i+chunk] = np.sqrt(((c[:,None,:]-ref[None,:,:])**2).sum(-1)).min(1)
        return out
    d = np.zeros(len(V)); d[body] = min_dist(V[body], V[is_arm])
    FADE = sstep((d-0.10)/0.85) * body

    def band(a, b, f=0.05):
        y0, y1 = minY+a*H, minY+b*H; fe = f*H
        return sstep((V[:,1]-(y0-fe))/fe) * sstep(((y1+fe)-V[:,1])/fe)

    # Clean chest canvas: the reference mannequin has a completely smooth chest, so the
    # whole pectoral area is relaxed — this removes the nipples and the small areola pits
    # in one pass. The pectoral shape itself is added afterwards by the anatomy field.
    fyv = (V[:,1] - minY) / H
    chest = (sstep((fyv - 0.645) / 0.035) * sstep((0.800 - fyv) / 0.035)
             * sstep((1.55 - np.abs(V[:,0])) / 0.35)
             * (V[:,2] > 0.55) * FADE)
    for _ in range(18):
        Q = V.copy()
        for i in np.where(chest > 0.02)[0]:
            n = neigh[i]
            if len(n): Q[i] = V[i] + 0.55*chest[i]*(V[n].mean(axis=0) - V[i])
        V = Q

    # chest is handled by the morph target now — only the body shaping remains
    # narrower pelvis, tighter waist
    V[:,0] *= 1 - 0.11*band(0.40, 0.585, 0.07)*FADE
    V[:,0] *= 1 - 0.06*band(0.30, 0.42, 0.06)*FADE
    V[:,0] *= 1 - 0.03*band(0.585, 0.685, 0.06)*FADE
    return V

def report(V, name):
    minY, H = V[:,1].min(), V[:,1].max()-V[:,1].min()
    torso = np.abs(V[:,0]) < 1.95
    def hw(fr, tol=0.02):
        y = minY+fr*H; sl = V[(V[:,1] > y-tol*H) & (V[:,1] < y+tol*H) & torso]
        return np.abs(sl[:,0]).max() if len(sl) else 0
    delt = np.abs(V[(V[:,1] > minY+0.80*H) & (V[:,1] < minY+0.84*H), 0]).max()
    ch, wa, hp = hw(0.72), hw(0.635), hw(0.50)
    print(f"{name:26s} shoulder={delt:.2f} chest/waist={ch/wa:.2f} hip/chest={hp/ch:.2f}")

# ---------------- male ----------------
# Chest comes from MakeHuman's own min-cup morph (artist-authored), not from smoothing.
mV, mU, mF = extract_body(BV
                          + target("t_male.target")*0.45         # male shape, not max muscle
                          + target("t_male_weight.target")*0.40  # normal body mass
                          + target("t_prop_m.target")*0.35
                          + target("t_chest_flat.target")*1.0)   # flat male chest
mV = male_corrections(mV, mF)
save(mV, mU, mF, "human-body-male.obj"); report(mV, "human-body-male.obj")

# ---------------- female ----------------
fV, fU, fF = extract_body(BV + target("t_chest_full.target")*0.30
                             + target("t_prop_f.target")*0.50
                             + target("t_female_weight.target")*0.22
                             + target("t_female_slim.target")*0.12)
save(fV, fU, fF, "human-body-female.obj"); report(fV, "human-body-female.obj")
