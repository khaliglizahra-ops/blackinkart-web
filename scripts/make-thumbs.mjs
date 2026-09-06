/**
 * Generates small grid thumbnails for every gallery photo.
 *
 * The galleries display photos in roughly 220px squares but were serving the full
 * 1200x1600 originals — the portfolio page alone came to 19.4 MB. These thumbnails are
 * ~87% smaller and visually identical at the size they're shown; the lightbox still
 * opens the untouched original via each image's data-full attribute.
 *
 * Output mirrors the source tree under public/images/_thumbs/, so
 * /images/portfolyo/top30/top-01.jpg -> /images/_thumbs/portfolyo/top30/top-01.jpg
 *
 * Runs on every build, after optimize-images.mjs (so thumbnails come from the
 * already-optimised original). Output is gitignored — it is regenerated, not authored.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const IMAGES = path.resolve(process.cwd(), 'public/images');
const OUT = path.join(IMAGES, '_thumbs');
const MAX = 500; // grid tiles never exceed ~250px, so 500 covers retina
const QUALITY = 76;

// Transparent tattoo templates must keep their alpha and exact pixels; the 3D tool
// reads them directly. The output folder itself is skipped so reruns don't recurse.
const SKIP = new Set(['tattoo-templates', '_thumbs', 'sertifikalar', 'yuklemeler']);

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) await walk(full, out);
    } else if (/\.(jpe?g|png)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = await walk(IMAGES);
let made = 0;
let skipped = 0;
let savedBytes = 0;

for (const file of files) {
  const rel = path.relative(IMAGES, file);
  const dest = path.join(OUT, rel);

  try {
    const src = await fs.stat(file);
    // Regenerate only when the original is newer than its thumbnail.
    try {
      const dst = await fs.stat(dest);
      if (dst.mtimeMs >= src.mtimeMs) {
        skipped++;
        continue;
      }
    } catch {
      /* thumbnail doesn't exist yet */
    }

    await fs.mkdir(path.dirname(dest), { recursive: true });
    const isPng = path.extname(file).toLowerCase() === '.png';
    let pipeline = sharp(file).resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true });
    const buf = isPng
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

    await fs.writeFile(dest, buf);
    made++;
    savedBytes += Math.max(0, src.size - buf.length);
  } catch (err) {
    console.warn(`  ! atlandı: ${rel} (${err.message})`);
  }
}

console.log(
  `[küçük resim] ${made} üretildi, ${skipped} güncel` +
    (made ? `, ızgaralarda ${(savedBytes / 1024 / 1024).toFixed(1)} MB tasarruf` : '')
);
