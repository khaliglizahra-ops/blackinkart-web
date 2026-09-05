"""Procedural muscle relief for the mannequin meshes.

One analytic field describes the body's surface anatomy (pectorals, abdominals, deltoids,
lats, glutes, quads, calves, clavicles, spine groove...). It is used twice:

  * as a vertex displacement along the normals -> real geometry, affects the silhouette
  * rasterised through the mesh UVs into a bump map -> fine definition when shaded

Positions are expressed in the mesh's own units; `fy` is the normalised height 0..1.
"""
import numpy as np


def leg_centre(fy):
    """Sideways centre of one leg at a given height (the stance widens going down)."""
    return np.interp(fy, [0.10, 0.20, 0.28, 0.38, 0.46, 0.55], [2.05, 1.80, 1.32, 0.92, 0.62, 0.45])


def arm_axis_fy(ax):
    """Height of the arm's centre line at a given distance from the spine."""
    return np.interp(ax, [1.95, 2.6, 3.2, 3.8, 4.4], [0.805, 0.762, 0.706, 0.660, 0.622])


def g(*terms):
    """Gaussian of summed normalised squared distances."""
    return np.exp(-0.5 * sum(t * t for t in terms))


def band(v, lo, hi, soft=0.02):
    return np.clip((v - lo) / soft, 0, 1) * np.clip((hi - v) / soft, 0, 1)



def pec_plate(fy, ax):
    """Fan-shaped pectoralis major.

    Origin runs down the sternum and along the inner clavicle; the fibres converge
    laterally to insert near the armpit, so the muscle is tall at the midline and
    narrows as it goes out. Returns (mass, under-crease, infraclavicular fossa,
    deltopectoral groove).
    """
    u = np.clip((ax - 0.08) / 1.58, 0, 1.2)          # 0 = sternum, 1 = armpit
    upper = 0.796 - 0.030 * u ** 2                    # clavicular origin, sloping out
    lower = 0.711 + 0.060 * u ** 1.6                  # lower border (~5th rib), rising out
    span = np.maximum(upper - lower, 1e-4)
    v = (fy - lower) / span                           # 0 = lower border, 1 = clavicle

    profile = np.clip(1 - (2 * v - 1) ** 2, 0, 1) ** 0.85
    lateral = np.clip(1 - u ** 1.8, 0, 1)
    edge = (np.clip((1.04 - u) / 0.12, 0, 1)
            * np.clip(v / 0.09, 0, 1)
            * np.clip((1.06 - v) / 0.13, 0, 1))
    mass = profile * lateral * edge

    crease = g((fy - (lower - 0.005)) / 0.0065) * np.clip(1 - u ** 1.6, 0, 1)
    fossa = g((u - 0.84) / 0.14, (v - 1.03) / 0.11)   # Mohrenheim's fossa
    dpg = g((u - 1.03) / 0.055) * np.clip(v / 0.25, 0, 1) * np.clip((1.15 - v), 0, 1)
    return mass, crease, fossa, dpg


def anatomy_field(P, N, minY, H, weights):
    """Signed surface relief at each point. P: (n,3) positions, N: (n,3) normals."""
    fy = (P[:, 1] - minY) / H
    ax = np.abs(P[:, 0])
    front = np.clip(N[:, 2], 0, 1) ** 0.6
    back = np.clip(-N[:, 2], 0, 1) ** 0.6
    side = np.clip(np.abs(N[:, 0]), 0, 1)
    w = weights
    f = np.zeros(len(P))

    torso = (ax < 1.85) & (fy > 0.52)
    arms = ax > 1.85
    legs = (fy < 0.53) & (ax < 2.6)

    # ---------------- front torso ----------------
    t = torso & (front > 0.05)
    if t.any():
        fyt, axt, ft = fy[t], ax[t], front[t]
        v = np.zeros(t.sum())
        # soft rounded pectoral domes (mannequin style), no hard anatomical creases
        v += w["pec"] * 0.26 * g((axt - 0.80) / 0.70, (fyt - 0.768) / 0.046)
        v -= w["pec"] * 0.030 * g((fyt - 0.702) / 0.016) * band(axt, 0.20, 1.45, 0.35)
        v -= w["stern"] * 0.055 * g(axt / 0.13, (fyt - 0.752) / 0.040)           # sternum line
        v += w["clav"] * 0.10 * g((fyt - (0.818 - 0.014 * axt)) / 0.0105) * band(axt, 0.10, 1.30, 0.25)
        for cy in (0.672, 0.6425, 0.613):                                          # abdominal rows
            v += w["abs"] * 0.14 * g((axt - 0.30) / 0.195, (fyt - cy) / 0.0145)
        for cy in (0.6575, 0.628, 0.599):                                          # transverse grooves
            v -= w["abs"] * 0.08 * g((fyt - cy) / 0.0068) * band(axt, 0.05, 0.62, 0.12)
        v -= w["abs"] * 0.09 * g(axt / 0.075) * band(fyt, 0.565, 0.700, 0.03)      # linea alba
        v += w["obliq"] * 0.11 * g((axt - 0.82) / 0.27, (fyt - 0.605) / 0.045)
        v += w["obliq"] * 0.09 * g((fyt - (0.487 + 0.075 * axt)) / 0.012) * band(axt, 0.15, 0.85, 0.18)
        f[t] += v * ft

    # ---------------- back torso ----------------
    b = torso & (back > 0.05)
    if b.any():
        fyb, axb, bb = fy[b], ax[b], back[b]
        v = np.zeros(b.sum())
        v -= w["spine"] * 0.12 * g(axb / 0.105) * band(fyb, 0.520, 0.865, 0.04)
        v += w["scap"] * 0.08 * g((axb - 0.80) / 0.40, (fyb - 0.778) / 0.030)
        v += w["lat"] * 0.13 * g((axb - 1.05) / 0.44, (fyb - 0.706) / 0.055)
        v += w["trap"] * 0.11 * g((axb - 0.42) / 0.52, (fyb - 0.848) / 0.034)
        f[b] += v * bb

    # ---------------- glutes ----------------
    gl = (fy < 0.55) & (fy > 0.40) & (ax < 1.6) & (back > 0.05)
    if gl.any():
        f[gl] += w["glute"] * 0.15 * g((ax[gl] - 0.50) / 0.38, (fy[gl] - 0.478) / 0.034) * back[gl]

    # ---------------- arms ----------------
    if arms.any():
        axa, fya = ax[arms], fy[arms]
        d = (fya - arm_axis_fy(axa)) / 0.055          # distance from the arm's centre line
        v = np.zeros(arms.sum())
        v += w["delt"] * 0.20 * g((axa - 2.16) / 0.40, d / 1.9)
        v += w["bic"] * 0.13 * g((axa - 2.86) / 0.42, d / 1.6) * front[arms]
        v += w["tri"] * 0.12 * g((axa - 2.80) / 0.46, d / 1.7) * back[arms]
        v += w["fore"] * 0.09 * g((axa - 3.55) / 0.42, d / 1.8)
        f[arms] += v

    # ---------------- legs ----------------
    if legs.any():
        fyl, axl = fy[legs], ax[legs]
        lc = leg_centre(fyl)
        v = np.zeros(legs.sum())
        v += w["quad"] * 0.15 * g((axl - lc) / 0.44, (fyl - 0.378) / 0.048) * front[legs]
        v -= w["quad"] * 0.05 * g((axl - lc) / 0.10, (fyl - 0.360) / 0.055) * front[legs]
        v += w["knee"] * 0.10 * g((axl - lc) / 0.30, (fyl - 0.276) / 0.019)
        v += w["calf"] * 0.16 * g((axl - lc) / 0.36, (fyl - 0.206) / 0.036) * back[legs]
        v += w["shin"] * 0.06 * g((axl - (lc - 0.10)) / 0.11, (fyl - 0.215) / 0.055) * front[legs]
        v += w["ham"] * 0.08 * g((axl - lc) / 0.38, (fyl - 0.400) / 0.045) * back[legs]
        f[legs] += v

    # keep the neck, hands, feet and head clean
    f *= np.clip((0.885 - fy) / 0.03, 0, 1)
    f *= np.clip((ax_clean := (4.15 - ax)) / 0.35, 0, 1)
    f *= np.clip((fy - 0.085) / 0.04, 0, 1)
    return f


# Normal, everyday build: the shapes that read as "a body" (collarbones, sternum, spine,
# knees, soft muscle volume) stay; the gym definition (six-pack, cut delts) is dialled down.
MALE = dict(pec=0.85, stern=0.55, clav=0.55, abs=0.38, obliq=0.30, spine=0.65, scap=0.45, lat=0.40,
            trap=0.45, glute=0.75, delt=0.40, bic=0.35, tri=0.35, fore=0.35,
            quad=0.45, knee=0.60, calf=0.50, shin=0.35, ham=0.40)

FEMALE = dict(pec=0.0, stern=0.25, clav=0.60, abs=0.10, obliq=0.22, spine=0.50, scap=0.35, lat=0.28,
              trap=0.28, glute=0.85, delt=0.25, bic=0.22, tri=0.22, fore=0.22,
              quad=0.35, knee=0.45, calf=0.40, shin=0.25, ham=0.40)
