#!/usr/bin/env python3
"""
Önce / sonra fotoğraflarını tek görselde birleştirir (Cover-up & Scar-up için).

  python3 scripts/before-after.py ONCE.jpg SONRA.jpg cikti.jpg [--layout auto|side|stack]
         [--box-aspect 2.0] [--focus-before x,y] [--focus-after x,y]

- İki fotoğraf da dikeyse yan yana (önce solda), ikisi de yataysa üst üste (sonra
  üstte, önce altta — stüdyonun mevcut "yengeç" görseliyle aynı düzen). `--layout`
  ile elle seçilebilir.
- Varsayılan olarak hiçbir fotoğraf kırpılmaz: oranları farklıysa eksik kısım,
  fotoğrafın kendi bulanık/karartılmış kopyasıyla doldurulur.
- Biri yatay biri dikey gibi oranlar çok farklıysa, bulanık şeritler fotoğrafı küçültür.
  O zaman `--box-aspect` (kutu en/boy oranı) ile kutuyu seçip `--focus-before` /
  `--focus-after` (0–1 arası "x,y", dövmenin fotoğraftaki yeri) ile o fotoğrafı
  dövmeye odaklı kırparak kutuyu doldurabilirsiniz.
- Etiketler çift dilli ("ÖNCE · BEFORE", "SONRA · AFTER") ve sitenin yazı tipiyle
  (Manrope) çizilir; kırpma payı için fotoğrafın ortasına konur — ızgara kareye
  kırptığında kenar etiketleri kaybolmasın diye.
- Çıktı: sRGB JPEG, uzun kenar en çok 1600 px, EXIF/GPS yok.

Gereken: Pillow ve `npm ci` (Manrope yazı tipi node_modules'tan okunur).
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'node_modules/@fontsource/manrope/files/manrope-latin-800-normal.woff')

GOLD = (242, 169, 0)       # --color-gold
INK = (10, 10, 10)         # --color-ink-950
IVORY = (242, 237, 225)    # --color-ivory
GAP = 14                   # iki fotoğraf arası (çıktı pikseli, 1600 px ölçeğinde)
MAX_SIDE = 1600


def load(path):
    im = ImageOps.exif_transpose(Image.open(path))
    return im.convert('RGB')


def fit_box(im, box_w, box_h, focus=None):
    """Fotoğrafı kutuya sığdırır. `focus` (x, y; 0–1) verilirse kutuyu doldurana kadar o noktaya
    odaklı kırpar; verilmezse kırpmadan sığdırıp boşlukları kendi bulanık kopyasıyla doldurur."""
    if focus:
        return ImageOps.fit(im, (box_w, box_h), Image.LANCZOS, centering=focus)
    bg = ImageOps.fit(im, (box_w, box_h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
    bg = Image.eval(bg, lambda v: int(v * 0.35))
    scale = min(box_w / im.width, box_h / im.height)
    fg = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    bg.paste(fg, ((box_w - fg.width) // 2, (box_h - fg.height) // 2))
    return bg


def pill(draw, center_x, top, text, fill, text_color, size):
    font = ImageFont.truetype(FONT, size)
    track = size * 0.12
    widths = [draw.textlength(ch, font=font) for ch in text]
    text_w = sum(widths) + track * (len(text) - 1)
    pad_x, pad_y = size * 0.9, size * 0.55
    asc, desc = font.getmetrics()
    w, h = text_w + pad_x * 2, asc + desc + pad_y * 2
    x0, y0 = center_x - w / 2, top
    draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=h / 2, fill=fill)
    x = x0 + pad_x
    for ch, cw in zip(text, widths):
        draw.text((x, y0 + pad_y), ch, font=font, fill=text_color)
        x += cw + track


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('before')
    ap.add_argument('after')
    ap.add_argument('out')
    ap.add_argument('--layout', choices=['auto', 'side', 'stack'], default='auto')
    ap.add_argument('--box-aspect', type=float, help='her fotoğraf kutusunun en/boy oranı (örn. 2.0 = geniş)')
    ap.add_argument('--focus-before', help='önce fotoğrafını "x,y" noktasına odaklı kırp (0–1)')
    ap.add_argument('--focus-after', help='sonra fotoğrafını "x,y" noktasına odaklı kırp (0–1)')
    a = ap.parse_args()

    if not os.path.exists(FONT):
        sys.exit(f'Yazı tipi yok: {FONT} — önce `npm ci` çalıştırın.')

    before, after = load(a.before), load(a.after)
    portrait = (before.height / before.width + after.height / after.width) / 2 >= 1.0
    layout = a.layout if a.layout != 'auto' else ('side' if portrait else 'stack')

    # Kutu boyutu: iki fotoğrafın ortalama oranı, ortalama boyutuyla.
    aspect = a.box_aspect or (before.width / before.height + after.width / after.height) / 2
    if layout == 'side':
        box_h = round((before.height + after.height) / 2)
        box_w = round(box_h * aspect)
        total_w, total_h = box_w * 2 + GAP, box_h
    else:
        box_w = round((before.width + after.width) / 2)
        box_h = round(box_w / aspect)
        total_w, total_h = box_w, box_h * 2 + GAP

    canvas = Image.new('RGB', (total_w, total_h), INK)
    focus = lambda v: tuple(float(p) for p in v.split(',')) if v else None
    b_img = fit_box(before, box_w, box_h, focus(a.focus_before))
    a_img = fit_box(after, box_w, box_h, focus(a.focus_after))
    if layout == 'side':
        b_pos, a_pos = (0, 0), (box_w + GAP, 0)
    else:  # sonra üstte, önce altta
        a_pos, b_pos = (0, 0), (0, box_h + GAP)
    canvas.paste(b_img, b_pos)
    canvas.paste(a_img, a_pos)

    draw = ImageDraw.Draw(canvas, 'RGBA')
    size = round(min(box_w, box_h) * 0.042)
    margin = round(size * 1.4)
    pill(draw, b_pos[0] + box_w / 2, b_pos[1] + margin, 'ÖNCE · BEFORE', (10, 10, 10, 215), IVORY, size)
    pill(draw, a_pos[0] + box_w / 2, a_pos[1] + margin, 'SONRA · AFTER', GOLD + (255,), INK, size)

    scale = MAX_SIDE / max(canvas.size)
    if scale < 1:
        canvas = canvas.resize((round(canvas.width * scale), round(canvas.height * scale)), Image.LANCZOS)
    canvas.save(a.out, 'JPEG', quality=85, optimize=True, progressive=True)
    print(f'{a.out}: {canvas.width}x{canvas.height} ({layout}), {os.path.getsize(a.out) // 1024} KB')


if __name__ == '__main__':
    main()
