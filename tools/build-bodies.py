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

    # Erase the nipples, keep the ribcage. The previous version relaxed the whole chest
    # (fy 0.645–0.800) eighteen times, which did remove the nipples but also sanded the
    # chest into a flat slab — the anatomy field then had to rebuild a pectoral from
    # nothing, and never convincingly did. Now the smoothing is confined to the nipple
    # band and run gently, so the underlying chest form survives for the pec to sit on.
    fyv = (V[:,1] - minY) / H
    chest = (sstep((fyv - 0.702) / 0.014) * sstep((0.734 - fyv) / 0.014)
             * sstep((np.abs(V[:,0]) - 0.60) / 0.22)
             * sstep((1.32 - np.abs(V[:,0])) / 0.28)
             * sstep((V[:,2] - 0.55) / 0.30) * FADE)
    for _ in range(7):
        Q = V.copy()
        for i in np.where(chest > 0.02)[0]:
            n = neigh[i]
            if len(n): Q[i] = V[i] + 0.45*chest[i]*(V[n].mean(axis=0) - V[i])
        V = Q

    # Silhouette. Measured on the previous build, the male read hip/chest = 1.12 and
    # chest/waist = 1.12 — hips wider than the ribcage, which is a female proportion and
    # was quietly working against every chest fix. An athletic male sits near hip/chest
    # 0.95 and chest/waist 1.25, so the ribcage widens and the pelvis comes in.
    V[:,0] *= 1 + 0.05*band(0.680, 0.790, 0.05)*FADE    # kafes — genişlik
    V[:,2] *= 1 + 0.10*band(0.600, 0.820, 0.06)*FADE    # kafes — DERİNLİK (fıçı, levha değil)
    V[:,0] *= 1 - 0.17*band(0.40, 0.585, 0.07)*FADE     # pelvis
    V[:,0] *= 1 - 0.06*band(0.30, 0.42, 0.06)*FADE      # upper thigh
    V[:,0] *= 1 - 0.05*band(0.585, 0.685, 0.06)*FADE    # waist
    return V

def report(V, name):
    """Print the proportions that decide whether the figure reads as male and athletic.

    Targets in brackets come from ANSUR anthropometry. The tolerance matters: a 0.02
    slice is thick enough to catch the widest point either side of the height you asked
    for, which inflated the chest by 6% and hid where the hips are actually widest.
    """
    minY, H = V[:,1].min(), V[:,1].max()-V[:,1].min()
    torso = np.abs(V[:,0]) < 1.95
    def hw(fr, tol=0.008):
        y = minY+fr*H; sl = V[(V[:,1] > y-tol*H) & (V[:,1] < y+tol*H) & torso]
        return np.abs(sl[:,0]).max() if len(sl) else 0
    def depth(fr, tol=0.008):
        y = minY+fr*H
        sl = V[(V[:,1] > y-tol*H) & (V[:,1] < y+tol*H) & torso & (np.abs(V[:,0]) < 1.0)]
        return sl[:,2].max()-sl[:,2].min() if len(sl) else 0
    ch, wa = hw(0.72), hw(0.640)
    hp = max(hw(f) for f in np.arange(0.46, 0.545, 0.01))   # widest point, not one slice
    delt = np.abs(V[(V[:,1] > minY+0.80*H) & (V[:,1] < minY+0.84*H), 0]).max()
    print(f"{name:26s} omuz={2*delt/H:.3f}[.29-.30] gogus/bel={ch/wa:.3f}[1.18-1.25] "
          f"kalca/gogus={hp/ch:.3f}[1.05-1.11] derinlik/genislik={depth(0.72)/(2*ch):.3f}[.75-.78]")

# ---------------- male ----------------
# Chest comes from MakeHuman's own min-cup morph (artist-authored), not from smoothing.
mV, mU, mF = extract_body(BV
                          + target("t_male.target")*0.58         # trains, but not a bodybuilder
                          + target("t_male_weight.target")*0.36  # a little leaner than before
                          + target("t_prop_m.target")*0.38
                          + target("t_chest_flat.target")*1.0)   # flat male chest
mV = male_corrections(mV, mF)
save(mV, mU, mF, "human-body-male.obj"); report(mV, "human-body-male.obj")

# ---------------- female ----------------
fV, fU, fF = extract_body(BV + target("t_chest_full.target")*0.30
                             + target("t_prop_f.target")*0.50
                             + target("t_female_weight.target")*0.22
                             + target("t_female_slim.target")*0.12)
save(fV, fU, fF, "human-body-female.obj"); report(fV, "human-body-female.obj")
