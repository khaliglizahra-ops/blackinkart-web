/**
 * Mevcut logodan (public/brand/logo-mark.png ve favicon-192.png) favicon
 * dosyalarını üretir — yeni bir logo çizmez, yalnızca aynı işareti farklı
 * boyutlara getirir.
 *
 *   public/favicon.ico            16/32/48 px (tarayıcıların ve botların kök istediği dosya)
 *   public/brand/icon-512.png     web manifest, "any"
 *   public/brand/icon-maskable-512.png  web manifest, "maskable" (güvenli bölge içinde)
 *   public/brand/logo-mark-640.png  başlık/alt bilgi/404 ve mobil hero için hafif logo (kayıpsız)
 *   public/brand/piercingland-logo-600.png  ana sayfa Piercingland görseli için hafif sürüm
 *
 * favicon-32/192 ve apple-touch-icon zaten vardı. Logonun vektör (SVG) ana
 * dosyası projede olmadığı için SVG favicon üretilmiyor — taranmış bir PNG'yi
 * SVG'ye sarmak kalite kazandırmaz. Vektör dosya gelirse eklenebilir.
 *
 * Çalıştırma: node scripts/make-favicons.mjs  (çıktılar depoya eklenir)
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const brand = path.join(root, 'public/brand');

// Arka plan rengi: mevcut favicon-192.png'nin köşe pikselinden okunuyor.
const probe = await sharp(path.join(brand, 'favicon-192.png')).raw().toBuffer({ resolveWithObject: true });
const bg = { r: probe.data[0], g: probe.data[1], b: probe.data[2], alpha: 1 };

async function squareIcon(size, markRatio) {
  const markWidth = Math.round(size * markRatio);
  const mark = await sharp(path.join(brand, 'logo-mark.png')).resize({ width: markWidth }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Mevcut 192 px ikondaki işaret oranı (≈ %73) korunuyor.
await fs.writeFile(path.join(brand, 'icon-512.png'), await squareIcon(512, 0.73));
// Maskable: platform kenarları kırpabilir; işaret merkezdeki %60'lık güvenli bölgeye sığıyor.
await fs.writeFile(path.join(brand, 'icon-maskable-512.png'), await squareIcon(512, 0.5));

// Sayfalarda gösterilen logo en fazla ~300 CSS px (mobil) / 620 px (masaüstü);
// 1298 px'lik özgün dosya yalnızca retina masaüstü hero için srcset'te kalıyor.
await fs.writeFile(
  path.join(brand, 'logo-mark-640.png'),
  await sharp(path.join(brand, 'logo-mark.png')).resize({ width: 640 }).png({ compressionLevel: 9, effort: 10 }).toBuffer(),
);
await fs.writeFile(
  path.join(brand, 'piercingland-logo-600.png'),
  await sharp(path.join(brand, 'piercingland-logo.png')).resize({ width: 600 }).png({ compressionLevel: 9, effort: 10 }).toBuffer(),
);

// favicon.ico — PNG gömülü kareler (tüm güncel tarayıcılar destekler).
const sizes = [16, 32, 48];
const frames = [];
for (const s of sizes) {
  frames.push(await sharp(path.join(brand, 'favicon-192.png')).resize(s, s, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer());
}
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // ayrılmış
header.writeUInt16LE(1, 2); // tür: simge
header.writeUInt16LE(frames.length, 4);
let offset = 6 + 16 * frames.length;
const entries = frames.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i], 0); // genişlik
  e.writeUInt8(sizes[i], 1); // yükseklik
  e.writeUInt8(0, 2); // palet yok
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); // renk düzlemi
  e.writeUInt16LE(32, 6); // bit derinliği
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
await fs.writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries, ...frames]));
console.log('favicon.ico, icon-512.png, icon-maskable-512.png, logo-mark-640.png, piercingland-logo-600.png üretildi (arka plan', JSON.stringify(bg), ')');
