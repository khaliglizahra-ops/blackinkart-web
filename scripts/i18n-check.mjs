/**
 * Eksik çeviri anahtarlarını bulur.
 *
 * `t()` eksik anahtarda Türkçesine düşüyor — sayfa bozulmaz ama İngilizce
 * ziyaretçi sessizce Türkçe görür. Bu betik o sessiz düşüşü görünür kılıyor.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/i18n/ui.ts', import.meta.url), 'utf8');

function keysOf(lang) {
  const start = src.indexOf(`  ${lang}: {`);
  if (start === -1) throw new Error(`ui.ts içinde "${lang}" bloğu bulunamadı`);
  const end = src.indexOf('\n  },', start);
  const block = src.slice(start, end);
  return new Set([...block.matchAll(/^\s{4}'([^']+)':/gm)].map((m) => m[1]));
}

const tr = keysOf('tr');
const en = keysOf('en');

const missingEn = [...tr].filter((k) => !en.has(k));
const extraEn = [...en].filter((k) => !tr.has(k));

console.log(`Anahtar sayısı — tr: ${tr.size}, en: ${en.size}`);
if (missingEn.length) {
  console.error(`\nİngilizcede eksik (${missingEn.length}):`);
  missingEn.forEach((k) => console.error('  ' + k));
}
if (extraEn.length) {
  console.error(`\nTürkçede karşılığı yok (${extraEn.length}):`);
  extraEn.forEach((k) => console.error('  ' + k));
}
if (missingEn.length || extraEn.length) process.exit(1);
console.log('İki dil de eksiksiz.');
