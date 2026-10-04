/**
 * Yayına çıkmadan önce doldurulması gereken ayarları listeler.
 *
 *   npm run config:check            bilgi verir, her zaman 0 ile çıkar
 *   npm run config:check -- --strict   eksik varsa 1 ile çıkar
 *
 * Projede bulunmayan bilgi (ticaret unvanı, vergi no, Analytics kimliği …)
 * uydurulmaz; burada "CONFIG REQUIRED" olarak görünür. Hiçbir dosyayı değiştirmez.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strict = process.argv.includes('--strict');

// .env (varsa) + ortam değişkenleri
const env = { ...process.env };
try {
  for (const line of read('.env').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {
  /* .env yok: normal */
}

const missing = [];
const ok = [];
const check = (area, label, present, hint) => (present ? ok : missing).push({ area, label, hint });

// 1) Yasal kimlik alanları (src/data/legal.ts içinde `null` olanlar)
const LEGAL_LABELS = {
  companyTitle: 'Ticaret unvanı / işletme adı',
  taxOffice: 'Vergi dairesi',
  taxNumber: 'Vergi kimlik numarası',
  mersisNo: 'MERSİS numarası (varsa)',
  verbisNote: 'VERBİS kaydı bilgisi (gerekiyorsa)',
  kepAddress: 'KEP adresi (varsa)',
};
const legalSrc = read('src/data/legal.ts');
for (const [key, label] of Object.entries(LEGAL_LABELS)) {
  const isNull = new RegExp(`^\\s*${key}:\\s*null\\b`, 'm').test(legalSrc);
  // Yalnızca ilk dört alan zorunlu; MERSİS/KEP isteğe bağlı olduğu için bilgi notu.
  const optional = key === 'mersisNo' || key === 'kepAddress';
  if (optional && isNull) ok.push({ area: 'Yasal', label: `${label} — girilmemiş (isteğe bağlı)` });
  else check('Yasal', label, !isNull, 'src/data/legal.ts içinde doldurun');
}

// 2) Analitik kimlikleri
const GA = /^G-[A-Z0-9]{6,14}$/;
const GTM = /^GTM-[A-Z0-9]{4,10}$/;
const ga = (env.GA_MEASUREMENT_ID || '').trim();
const gtm = (env.GTM_ID || '').trim();
if (ga && !GA.test(ga)) missing.push({ area: 'Analitik', label: `GA_MEASUREMENT_ID biçimi geçersiz ("${ga}")`, hint: 'Örnek biçim: G-ABC123XYZ' });
else if (gtm && !GTM.test(gtm)) missing.push({ area: 'Analitik', label: `GTM_ID biçimi geçersiz ("${gtm}")`, hint: 'Örnek biçim: GTM-ABC1234' });
else check('Analitik', 'GA_MEASUREMENT_ID veya GTM_ID', Boolean(ga || gtm), 'GitHub → Settings → Secrets and variables → Actions → Variables');

// 3) İşletme verisi (panelden yönetilen site.json)
const site = JSON.parse(read('src/data/site.json'));
check('İşletme', 'Telefon', Boolean(site.phone), 'Panel → Genel Bilgiler');
check('İşletme', 'E-posta', Boolean(site.email), 'Panel → Genel Bilgiler');
check('İşletme', 'Adres', Boolean(site.address?.full), 'Panel → Genel Bilgiler');
check('İşletme', 'Harita gömme adresi', Boolean(site.mapsEmbedSrc), 'Panel → Genel Bilgiler');
check('İşletme', 'Instagram', Boolean(site.instagram?.url), 'Panel → Genel Bilgiler');

// Rapor
const group = (list) => list.reduce((acc, i) => ((acc[i.area] ||= []).push(i), acc), {});
console.log('\nYayın öncesi yapılandırma denetimi\n');
for (const [area, items] of Object.entries(group(ok))) for (const i of items) console.log(`  ✓ [${area}] ${i.label}`);
if (missing.length) {
  console.log('\nCONFIG REQUIRED — doldurulmayı bekliyor:\n');
  for (const i of missing) console.log(`  ✗ [${i.area}] ${i.label}${i.hint ? `\n      → ${i.hint}` : ''}`);
}
console.log(`\n${ok.length} tamam, ${missing.length} eksik.\n`);
if (strict && missing.length) process.exit(1);
