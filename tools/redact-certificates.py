#!/usr/bin/env python3
"""
Sertifika görsellerindeki kişisel bilgileri kapatıp siteye uygun hale getirir.

Belgelerin hepsinde T.C. kimlik numarası, anne ve baba adı, bazılarında da tam
doğum tarihi yer alıyor. Bu dörtlü, Türkiye'de kimlik doğrulama ve hesap
kurtarma için kullanılan bilgi setinin ta kendisi — kamuya açık bir sitede
yayınlanması kimlik hırsızlığı riski oluşturur. Bu betik o alanların üzerine
opak bir kutu çizer; belgenin kurum, program, tarih ve isim bilgileri görünür
kalır, yani belge ziyaretçi için hâlâ ikna edici olur.

Karekod ve barkodlar da kapatılıyor: okutulduklarında e-Devlet'te belgenin
sansürlenmemiş tam hâli görüntülenebiliyor.

Çalıştırmak için:  cd tools && python3 redact-certificates.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path("/Users/huseyinolmez/Desktop/web sitesi görselleri/Belgelerim")
OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "sertifikalar"

# Kapatma kutusunun rengi — belgelerin açık zeminine karşı bilinçli bir "burası
# kaldırıldı" izlenimi versin diye koyu seçildi.
INK = (26, 24, 21)

MAX_DIM = 1500

# Her kutu, görselin genişlik/yüksekliğine oranla (x0, y0, x1, y1) olarak tanımlı;
# böylece kaynak dosyanın çözünürlüğü değişse de aynı yerler kapanır.
JOBS = [
    {
        "src": "Ekran Resmi 2023-11-27 15.08.46.png",
        "out": "hijyen-salgin-2022.jpg",
        "boxes": [
            (0.1927, 0.4950, 0.4600, 0.5310),  # T.C. kimlik no
            (0.1927, 0.5570, 0.4600, 0.6210),  # baba adı + anne adı
            (0.6270, 0.4950, 0.9250, 0.5310),  # belge numarası
            (0.1050, 0.7850, 0.3050, 0.8650),  # barkod
            (0.8050, 0.7610, 0.8890, 0.8710),  # karekod
        ],
    },
    {
        "src": "Ekran Resmi 2023-11-27 15.09.11.png",
        "out": "hijyen-guzellik-2022.jpg",
        "boxes": [
            (0.1560, 0.4740, 0.3360, 0.5120),  # T.C. kimlik no
            (0.1560, 0.5290, 0.3360, 0.6040),  # baba adı + anne adı
            (0.6950, 0.4740, 0.9250, 0.5160),  # belge numarası
            (0.1060, 0.7920, 0.3030, 0.8650),  # barkod
            (0.7930, 0.7630, 0.8820, 0.8700),  # karekod
        ],
    },
    {
        "src": "Ekran Resmi 2023-11-27 15.09.32.png",
        "out": "hijyen-gida-2022.jpg",
        "boxes": [
            (0.1560, 0.4740, 0.3360, 0.5120),  # T.C. kimlik no
            (0.1560, 0.5290, 0.3360, 0.6040),  # baba adı + anne adı
            (0.6950, 0.4740, 0.9250, 0.5160),  # belge numarası
            (0.1060, 0.7920, 0.3030, 0.8650),  # barkod
            (0.7930, 0.7630, 0.8820, 0.8700),  # karekod
        ],
    },
    {
        "src": "IMG_7558.JPG",
        "out": "dovme-uygulayiciligi-2017.jpg",
        "boxes": [
            (0.3350, 0.3870, 0.8850, 0.4670),  # kimlik no, ad soyad, baba, ana, doğum
        ],
    },
    {
        "src": "IMG_7559.JPG",
        "out": "ustalik-belgesi-2020.jpg",
        "boxes": [
            (0.3280, 0.3010, 0.6450, 0.4250),  # kimlik no, doğum, baba, ana
            (0.7830, 0.5130, 0.8780, 0.5400),  # belge sıra no
        ],
    },
    {
        "src": "IMG_7560.JPG",
        "out": "kalfalik-belgesi-2020.jpg",
        "boxes": [
            (0.3280, 0.3440, 0.6450, 0.4730),  # kimlik no, doğum, baba, ana
            (0.7830, 0.5710, 0.8780, 0.5990),
        ],
    },
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for job in JOBS:
        path = SRC / job["src"]
        if not path.exists():
            print(f"  ! bulunamadı: {path}")
            continue

        img = Image.open(path).convert("RGB")
        w, h = img.size
        draw = ImageDraw.Draw(img)
        for x0, y0, x1, y1 in job["boxes"]:
            draw.rectangle([x0 * w, y0 * h, x1 * w, y1 * h], fill=INK)

        img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
        target = OUT / job["out"]
        img.save(target, "JPEG", quality=86, optimize=True)
        print(f"  {job['out']}  {img.size[0]}x{img.size[1]}  {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
