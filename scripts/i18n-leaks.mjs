/**
 * İngilizce sayfada Türkçe kalıntı avı — derlenmiş çıktı üzerinde çalışır.
 *
 * Kelime listesi yetmiyordu: "Saati birlikte belirleyelim" gibi özel karakter
 * içermeyen cümleler gözden kaçtı. Bunun yerine her İngilizce sayfanın görünen
 * metin parçaları Türkçe karşılığındakilerle birebir karşılaştırılıyor; iki
 * dilde de aynen geçen parça ya özel isim ya da çevrilmemiş metindir.
 * `npm run build` sonrası: `npm run i18n:leaks`
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
const site = 'https://www.blackinkart.com.tr';
const read = (u) => { const f = join('dist', u.replace(/\/$/, ''), 'index.html'); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
const segs = (h) => { h = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<(noscript|template)[\s\S]*?<\/\1>/g, ' ');
  return new Set((h.split('<body')[1] || h).replace(/<[^>]+>/g, '\n').split('\n').map((x) => x.replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 4 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(x))); };
const term = /^(Türkçe|English|Black Ink Art|Piercingland|WhatsApp|Instagram|Piercing|Dermal|Mandala|Lobe|Helix|Septum|Tragus|Snug|Daith|Rook|Conch|Industrial|Labret|Medusa|Monroe|Madonna|Smiley|Venom|Marley|Frowney|Bioplast|PTFE|316L|Nostril|Fucicort|Blackwork|Minimal|Minimalist|Neo-Traditional|Tribal|dermis|tautau|Meta Platforms|Cover-up|Retro)/i;
const ok = (t) => /^[\d\s+()\-–—.:\/%,·]*(TL|TRY)?[\d\s+()\-–—.:\/%,·]*$/.test(t) || /@|\.com|https?:/.test(t) || /Bahçelievler|Çankaya|Ankara|Hüseyin|Ölmez/.test(t) || (/Piercing$|Bites$|Lobe$/i.test(t) && t.split(' ').length <= 4) || (term.test(t) && t.split(' ').length <= 4) || /^(tragus|snake|transverse|tongue|T-Rex)/.test(t) || /^\d/.test(t);
const pages = []; (function w(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) w(p); else if (e.name === 'index.html') pages.push('/' + relative('dist', p).replace(/index\.html$/, '')); } })('dist/en');
const found = new Map();
for (const u of pages) { const en = read(u); if (!en) continue; const m = en.match(/rel="alternate" hreflang="tr" href="([^"]+)"/); if (!m) continue;
  const tr = read((m[1].replace(site, '') || '/') + '/'); if (!tr) continue; const e = segs(en), t = segs(tr);
  for (const s of e) if (t.has(s) && !ok(s)) { if (!found.has(s)) found.set(s, []); found.get(s).push(u); } }
const rows = [...found.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`İngilizce sayfa: ${pages.length} — şüpheli parça: ${rows.length}`);
rows.forEach(([s, us]) => console.log(`  [${us.length}x] ${s.slice(0, 90)}   <- ${us.slice(0, 2).join(', ')}`));
process.exit(rows.length ? 1 : 0);
