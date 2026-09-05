/**
 * Shrinks any oversized image in public/images before the site is built.
 *
 * The admin panel uploads photos straight from a phone or camera, which can be
 * 4000px and several megabytes. Without this, the site would get slow as soon as
 * the owner adds pictures. Runs on every build (locally and on Netlify), only
 * touches files that are actually too big, and records what it has already done
 * so repeat builds stay fast.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd(), 'public/images');
const CACHE = path.resolve(process.cwd(), 'node_modules/.cache/image-optimize.json');
const MAX_DIM = 1600;
const QUALITY = 78;
const SKIP_DIRS = new Set(['tattoo-templates']); // transparent PNGs must stay untouched

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
      if (!SKIP_DIRS.has(e.name)) await walk(full, out);
    } else if (/\.(jpe?g|png)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

async function loadCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE, 'utf8'));
  } catch {
    return {};
  }
}

const files = await walk(ROOT);
const cache = await loadCache();
let optimized = 0;
let savedBytes = 0;

for (const file of files) {
  const stat = await fs.stat(file);
  const key = path.relative(process.cwd(), file);
  const stamp = `${stat.size}:${Math.round(stat.mtimeMs)}`;
  if (cache[key] === stamp) continue; // already handled, unchanged since

  try {
    const image = sharp(file);
    const meta = await image.metadata();
    const tooBig = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_DIM;
    const heavy = stat.size > 400 * 1024;
    if (!tooBig && !heavy) {
      cache[key] = stamp;
      continue;
    }

    // Re-encode in the file's own format — writing JPEG bytes into a .png would
    // produce a file whose contents don't match its extension.
    const isPng = path.extname(file).toLowerCase() === '.png';
    let pipeline = image.rotate();
    if (tooBig) pipeline = pipeline.resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true });
    const buf = isPng
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

    if (buf.length < stat.size) {
      await fs.writeFile(file, buf);
      savedBytes += stat.size - buf.length;
      optimized++;
      const after = await fs.stat(file);
      cache[key] = `${after.size}:${Math.round(after.mtimeMs)}`;
    } else {
      cache[key] = stamp;
    }
  } catch (err) {
    console.warn(`  ! atlandı: ${key} (${err.message})`);
  }
}

await fs.mkdir(path.dirname(CACHE), { recursive: true });
await fs.writeFile(CACHE, JSON.stringify(cache, null, 0));

console.log(
  optimized
    ? `[görsel] ${optimized} görsel optimize edildi, ${(savedBytes / 1024 / 1024).toFixed(1)} MB kazanıldı`
    : `[görsel] ${files.length} görsel kontrol edildi, hepsi zaten uygun`
);
