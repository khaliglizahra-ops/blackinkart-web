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



# The pectoral's tuning knobs, gathered so they can be swept side by side by
# tune-chest.py instead of edited one at a time. Lengths are fractions of the plate's
# own height (span), so they stay proportional as the plate narrows towards the armpit.
# Chosen by rendering four candidates side by side (tune-chest.py): the flattest front
# plane read as a man's chest, the fuller ones read as a breast. Peak displacement is
# 12.9 mm — inside the 10–14 mm band that published measurements give for a man who
# trains but is not a bodybuilder.
PEC = dict(
    e_low=0.15,      # lower-border transition. Small = crisp edge, large = it disappears.
    e_up=0.40,       # upper transition into the clavicle (no real edge there)
    clav_head=0.16,  # extra thickness of the clavicular head, upper-outer
    fat_pad=0.12,    # extra thickness at the lower-outer corner (the "boxy" corner)
    amp=0.130,       # peak displacement of the muscle itself
    crease=0.012,    # undercut below the free lower edge
    fossa=0.038,     # infraclavicular hollow
    dpg=0.028,       # deltopectoral groove
)


def _s(t):
    """Clamped smoothstep."""
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def pec_plate(fy, ax):
    """Pectoralis major as a flat pentagonal plate — deliberately not a dome.

    Three things decide whether a chest reads as a man's, and all three are structural
    rather than a matter of how much volume you add:

      * It is a thin sheet (~1 cm even when trained) lying over a barrel-shaped ribcage.
        Most of the chest's curve is BONE. Piling a thick bulge onto already-curved ribs
        double-counts the curve, and the result is a breast.
      * Its outline is a pentagon — clavicle above, sternum inside, ribs 5–6 below, a
        squared lower-outer corner, and an outer edge that tucks under the deltoid. Each
        of those five edges falls off differently. A radially symmetric function gives a
        circular base and a central apex, which is the female conical profile.
      * The front plane is flat and breaks back sharply at the nipple line. That plane
        break is what reads as a chest even with no nipple on it — which is precisely
        what this mannequin needs.

    Distances are published cadaver/anthropometric means converted at 1 mesh unit =
    10.5 cm: nipple 1.06 out from the midline, 0.38 above the lower border, 0.52 in from
    the lateral border, and 1.84 below the jugular notch.

    Returns (mass, under-crease, infraclavicular fossa, deltopectoral groove).
    """
    u = np.clip(ax / 1.58, 0.0, 1.12)                 # 0 = sternum, 1 = lateral border

    # Lower border runs near-horizontal across the chest and only sweeps up at the very
    # outside, into the anterior axillary fold. Upper border follows the clavicle.
    lower = 0.697 - 0.008 * u + 0.078 * _s((u - 0.60) / 0.40) ** 1.4
    upper = 0.816 - 0.020 * u
    span = np.maximum(upper - lower, 0.022)
    v = (fy - lower) / span                           # 0 = lower border, 1 = clavicle

    # Five edges, five falloffs. Multiplying separable ramps (rather than using a radial
    # distance) is what keeps the lower-outer corner square instead of round.
    e_low = _s((v + 0.02) / PEC['e_low'])             # short ramp: the plane break
    e_up = _s((0.98 - v) / PEC['e_up'])               # long ramp: no edge at the clavicle
    e_in = _s((u - 0.012) / (0.075 + 0.115 * _s(v)))  # V-shaped sternal gap
    e_out = _s((1.05 - u) / 0.17)                     # tucks under the deltoid
    plate = e_low * e_up * e_in * e_out

    # Thinnest over the sternum, thickest upper-outer (the clavicular head is the meatiest
    # part) and lower-outer (the fat pad that gives a male chest its boxy corner).
    thick = (0.58
             + 0.46 * _s(u / 0.50)
             + PEC['clav_head'] * u * np.clip(1.0 - np.abs(v - 0.82) / 0.34, 0, 1)
             + PEC['fat_pad'] * u * np.clip(1.0 - np.abs(v - 0.20) / 0.26, 0, 1))
    mass = plate * thick

    # The free lower edge lifts off the chest wall, so the shadow under it is a genuine
    # step in the surface, not a painted line. It stays soft: on anything short of a
    # contest-lean body the muscle-to-fat transition there has no hard groove.
    # Two independent reviews argued this lateral profile should be inverted — deepest
    # out near the armpit, zero at the sternum, matching where the muscle actually has
    # mass. Rendered side by side it was clearly worse: a shadow that wraps the outer
    # lower corner outlines a rounded lobe and reads as a breast, while a shadow that
    # runs straight across reads as the flat plane break we want. Anatomy texts describe
    # a body under its own light; this is a mannequin under the viewer's. Renders win.
    crease = _s((v + 0.26) / 0.24) * (1.0 - _s((v + 0.02) / 0.20)) * np.clip(1 - u ** 1.7, 0, 1)
    fossa = g((u - 0.74) / 0.16, (v - 0.93) / 0.11)   # Mohrenheim's fossa
    dpg = g((u - 1.02) / 0.065) * np.clip(v / 0.28, 0, 1) * np.clip((1.18 - v), 0, 1)
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
        # Pectoral plate. The old code used a single wide Gaussian here, which produced a
        # horizontal swelling with no lower edge — it read as a soft breast rather than a
        # muscle, which is exactly what kept looking wrong.
        pec_mass, pec_crease, pec_fossa, pec_dpg = pec_plate(fyt, axt)
        # Amplitude is set from the real thickness of the muscle, not by eye: a trained
        # pectoralis major is about 11 mm, which at this mesh's scale and the 0.85
        # displacement gain works out near 0.12. The previous 0.27 was adding ~2.4 cm of
        # bulge on top of an already-curved ribcage, and that is what made it a breast.
        v += w["pec"] * PEC['amp'] * pec_mass
        v -= w["pecedge"] * PEC['crease'] * pec_crease      # step under the free lower edge
        v -= w["pecedge"] * PEC['fossa'] * pec_fossa       # hollow under the outer clavicle
        v -= w["pecedge"] * PEC['dpg'] * pec_dpg         # deltopectoral groove
        v -= w["stern"] * 0.055 * g(axt / 0.13, (fyt - 0.752) / 0.040)           # sternum line
        v += w["clav"] * 0.10 * g((fyt - (0.818 - 0.014 * axt)) / 0.0105) \
             * band(axt, 0.10, w["clav_out"], w["clav_soft"])
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


# Someone who trains but is not a bodybuilder: muscle groups carry real volume and the
# pectoral has a readable lower edge, while the gym-poster cues stay off — `abs` is kept
# low on purpose, because a visible six-pack is the single thing that tips a figure from
# "fit" into "bodybuilder", and `stern` is eased back now that the pec plate creates the
# sternal separation on its own.
MALE = dict(pec=1.00, pecedge=1.10, stern=0.50, clav=0.50, clav_out=1.10, clav_soft=0.22, abs=0.32, obliq=0.40, spine=0.62, scap=0.52, lat=0.58,
            trap=0.56, glute=0.80, delt=0.60, bic=0.50, tri=0.50, fore=0.45,
            quad=0.62, knee=0.58, calf=0.66, shin=0.40, ham=0.52)

FEMALE = dict(pec=0.0, pecedge=0.0, stern=0.25, clav=0.60, clav_out=1.30, clav_soft=0.25, abs=0.10, obliq=0.22, spine=0.50, scap=0.35, lat=0.28,
              trap=0.28, glute=0.85, delt=0.25, bic=0.22, tri=0.22, fore=0.22,
              quad=0.35, knee=0.45, calf=0.40, shin=0.25, ham=0.40)
