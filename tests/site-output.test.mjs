/**
 * Derlenmiş sitenin (dist/) üretim denetimi. Önce `npm run build` gerekir;
 * dist yoksa bu testler atlanır (birim testleri yine çalışır).
 *
 * Kapsam: başlık/açıklama/canonical/h1, paylaşım etiketleri, JSON-LD, görsel
 * alt metni, site içi bağlantıların hedefi, sitemap ↔ noindex tutarlılığı,
 * 404 sayfaları, yasal sayfalar, çerez onayından önce harici betik olmaması.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const SITE = 'https://www.blackinkart.com.tr';
const hasDist = fs.existsSync(path.join(DIST, 'index.html'));
const opts = { skip: hasDist ? false : 'dist/ yok — önce `npm run build`' };

// Panel (Decap) ve API kendi kuralıyla çalışıyor; araç dosyaları sayfa değil.
const SKIP_DIRS = new Set(['admin', 'api', '_astro', 'images', 'models', 'brand']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (dir === DIST && SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function pageInfo(file) {
  const html = fs.readFileSync(file, 'utf8');
  let pathname = '/' + path.relative(DIST, file).replace(/\\/g, '/');
  pathname = pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
  const meta = (re) => {
    const m = html.match(re);
    return m ? decode(m[1]) : undefined;
  };
  return {
    file,
    html,
    pathname,
    isEn: pathname === '/en' || pathname.startsWith('/en/'),
    title: meta(/<title>([^<]*)<\/title>/),
    description: meta(/<meta name="description" content="([^"]*)"/),
    canonical: meta(/<link rel="canonical" href="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
    h1: (html.match(/<h1[\s>]/g) || []).length,
    lang: meta(/<html[^>]*\slang="([^"]*)"/),
  };
}

const pages = hasDist ? walk(DIST).map(pageInfo) : [];
const is404 = (p) => p.pathname === '/404' || p.pathname === '/en/404';

test('sayfalar bulundu', opts, () => {
  assert.ok(pages.length > 60, `beklenenden az sayfa: ${pages.length}`);
});

test('her sayfada benzersiz-uygun başlık, açıklama, canonical, tek h1 ve dil var', opts, () => {
  const problems = [];
  for (const p of pages) {
    if (!p.title || p.title.length < 10) problems.push(`${p.pathname}: başlık eksik/kısa`);
    else if (p.title.length > 85) problems.push(`${p.pathname}: başlık çok uzun (${p.title.length})`);
    if (!p.description || p.description.length < 40) problems.push(`${p.pathname}: açıklama eksik/kısa`);
    else if (p.description.length > 200) problems.push(`${p.pathname}: açıklama çok uzun (${p.description.length})`);
    if (!p.canonical || !p.canonical.startsWith(SITE + '/') && p.canonical !== SITE + '/' && p.canonical !== SITE) problems.push(`${p.pathname}: canonical hatalı (${p.canonical})`);
    if (p.h1 !== 1) problems.push(`${p.pathname}: h1 sayısı ${p.h1}`);
    if (!['tr', 'en'].includes(p.lang)) problems.push(`${p.pathname}: html lang=${p.lang}`);
    if (p.isEn !== (p.lang === 'en')) problems.push(`${p.pathname}: dil/yol uyumsuz`);
  }
  assert.deepEqual(problems, []);
});

test('canonical adresi sayfanın kendi yoluyla eşleşir (404 hariç)', opts, () => {
  const bad = pages
    .filter((p) => !is404(p))
    .filter((p) => p.canonical !== new URL(p.pathname, SITE).toString())
    .map((p) => `${p.pathname} → ${p.canonical}`);
  assert.deepEqual(bad, []);
});

test('aynı dildeki sayfaların başlıkları ve açıklamaları tekrar etmez', opts, () => {
  const seen = new Map();
  const dups = [];
  for (const p of pages.filter((x) => !is404(x))) {
    for (const [kind, v] of [['başlık', p.title], ['açıklama', p.description]]) {
      const key = `${p.lang}|${kind}|${v}`;
      if (seen.has(key)) dups.push(`${kind} "${v?.slice(0, 50)}": ${seen.get(key)} ve ${p.pathname}`);
      else seen.set(key, p.pathname);
    }
  }
  assert.deepEqual(dups, []);
});

test('Open Graph ve Twitter etiketleri tam', opts, () => {
  const required = ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:type', 'og:locale'];
  const problems = [];
  for (const p of pages) {
    for (const prop of required) {
      if (!new RegExp(`<meta property="${prop}" content="[^"]+"`).test(p.html)) problems.push(`${p.pathname}: ${prop} yok`);
    }
    for (const name of ['twitter:card', 'twitter:title', 'twitter:image']) {
      if (!new RegExp(`<meta name="${name}" content="[^"]+"`).test(p.html)) problems.push(`${p.pathname}: ${name} yok`);
    }
    const img = p.html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
    if (img && !img.startsWith('https://')) problems.push(`${p.pathname}: og:image mutlak adres değil`);
  }
  assert.deepEqual(problems, []);
});

test('JSON-LD blokları geçerli JSON', opts, () => {
  const problems = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const data = JSON.parse(m[1]);
        if (!data['@context'] || !data['@type']) problems.push(`${p.pathname}: @context/@type yok`);
      } catch (e) {
        problems.push(`${p.pathname}: ${e.message}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('SSS sayfalarında FAQPage şeması görünen sorularla birebir aynı', opts, () => {
  const withFaq = pages.filter((p) => p.html.includes('"FAQPage"'));
  assert.ok(withFaq.length >= 6, 'SSS bulunan sayfa sayısı beklenenden az');
  for (const p of withFaq) {
    const schema = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((d) => d['@type'] === 'FAQPage');
    const visible = [...p.html.matchAll(/class="faq-q"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]).trim());
    assert.deepEqual(schema.mainEntity.map((q) => q.name), visible, p.pathname);
  }
});

test('her <img> alt niteliğine sahip', opts, () => {
  const missing = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt=/.test(m[0])) missing.push(`${p.pathname}: ${m[0].slice(0, 80)}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('site içi bağlantılar ve görseller var olan bir hedefe gidiyor', opts, () => {
  const exists = (urlPath) => {
    const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
    if (!clean || clean === '/') return true;
    const rel = clean.replace(/^\//, '');
    return [rel, rel + '.html', path.join(rel, 'index.html')].some((c) => {
      const f = path.join(DIST, c);
      return fs.existsSync(f) && fs.statSync(f).isFile();
    });
  };
  // Sunucuda PHP / panel tarafından karşılanan adresler dist'te dosya olarak yok.
  const SERVER_SIDE = [/^\/iletisim\.php$/, /^\/api(\/|$)/, /^\/admin(\/|$)/];
  const broken = [];
  let checked = 0;
  for (const p of pages) {
    for (const m of p.html.matchAll(/\s(?:href|src|action)="(\/[^"]*)"/g)) {
      const target = decode(m[1]);
      if (target.startsWith('//') || SERVER_SIDE.some((re) => re.test(target.split(/[?#]/)[0]))) continue;
      checked++;
      if (!exists(target)) broken.push(`${p.pathname} → ${target}`);
    }
  }
  assert.ok(checked > 1000, `çok az bağlantı denetlendi (${checked}) — ayrıştırma bozulmuş olabilir`);
  assert.deepEqual([...new Set(broken)], []);
});

test('sitemap noindex sayfaları içermez ve her adresi derlenmiş bir sayfaya çıkar', opts, () => {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(urls.length > 40);
  const byPath = new Map(pages.map((p) => [p.pathname, p]));
  const problems = [];
  for (const u of urls) {
    const pathname = new URL(u).pathname.replace(/\/$/, '') || '/';
    const page = byPath.get(pathname);
    if (!page) problems.push(`sitemap'te var, sayfa yok: ${u}`);
    else if (page.noindex) problems.push(`noindex sayfa sitemap'te: ${u}`);
  }
  const listed = new Set(urls.map((u) => new URL(u).pathname.replace(/\/$/, '') || '/'));
  for (const p of pages) {
    if (!p.noindex && !is404(p) && !listed.has(p.pathname)) problems.push(`indekslenebilir sayfa sitemap'te yok: ${p.pathname}`);
  }
  assert.deepEqual(problems, []);
});

test('robots.txt sitemap adresini veriyor ve yönetim alanını kapatıyor', opts, () => {
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/www\.blackinkart\.com\.tr\/sitemap-index\.xml$/m);
  assert.match(robots, /Disallow: \/admin/);
  assert.doesNotMatch(robots, /^Disallow: \/\s*$/m, 'tüm siteyi engellememeli');
});

test('llms.txt, favicon ve manifest yerinde', opts, () => {
  assert.match(fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8'), /^# Black Ink Art/m);
  assert.ok(fs.statSync(path.join(DIST, 'favicon.ico')).size > 100);
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'site.webmanifest'), 'utf8'));
  assert.ok(manifest.icons.length >= 2);
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(DIST, icon.src)), icon.src);
});

test('özel 404 sayfaları var, noindex ve yönlendirme .htaccess ile bağlı', opts, () => {
  for (const f of ['404.html', 'en/404/index.html']) {
    const html = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.match(html, /name="robots" content="[^"]*noindex/, f);
  }
  const root = fs.readFileSync(path.join(DIST, '.htaccess'), 'utf8');
  assert.match(root, /ErrorDocument 404 \/404\.html/);
  const en = fs.readFileSync(path.join(DIST, 'en/.htaccess'), 'utf8');
  assert.match(en, /ErrorDocument 404 \/en\/404\/index\.html/);
});

test('yasal sayfalar iki dilde mevcut ve altbilgiden bağlı', opts, () => {
  const need = ['/gizlilik-politikasi', '/kullanim-sartlari', '/cerez-politikasi', '/kvkk', '/en/privacy-policy', '/en/terms-of-use', '/en/cookie-policy', '/en/privacy-notice'];
  const have = new Set(pages.map((p) => p.pathname));
  assert.deepEqual(need.filter((n) => !have.has(n)), []);
  const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  for (const href of ['/gizlilik-politikasi', '/kullanim-sartlari', '/cerez-politikasi']) assert.ok(home.includes(`href="${href}"`), href);
  assert.ok(home.includes('data-consent-open'), 'Çerez Tercihleri düğmesi yok');
});

test('onaydan önce harici betik yok; CSP yalnızca gerekli kaynaklara izin veriyor', opts, () => {
  const problems = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<script\b[^>]*\ssrc="(https?:)?\/\/[^"]*"/g)) problems.push(`${p.pathname}: harici betik ${m[0].slice(0, 90)}`);
    const csp = p.html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
    if (!csp) problems.push(`${p.pathname}: CSP yok`);
    else {
      if (!/object-src 'none'/.test(csp) || !/base-uri 'self'/.test(csp)) problems.push(`${p.pathname}: CSP eksik yönergeler`);
      if (/\*(?![.])/.test(csp.replace(/https:\/\/\*\.[a-z.-]+/g, ''))) problems.push(`${p.pathname}: CSP'de joker`);
    }
    if (/gtag\(|googletagmanager|google-analytics/.test(p.html.replace(/http-equiv="Content-Security-Policy"[^>]*>/, ''))) {
      // Kimlik tanımlıysa tarayıcı betiği (analytics-client) bunları yalnızca onaydan sonra ekler;
      // sayfa HTML'inde doğrudan yer almamalı.
      problems.push(`${p.pathname}: HTML içinde doğrudan Google analitik kodu`);
    }
  }
  assert.deepEqual(problems, []);
});

test('.htaccess güvenlik başlıklarını ve gizli dosya korumasını içeriyor', opts, () => {
  const ht = fs.readFileSync(path.join(DIST, '.htaccess'), 'utf8');
  for (const h of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security', 'Permissions-Policy']) {
    assert.ok(ht.includes(h), `${h} yok`);
  }
  assert.match(ht, /Options -Indexes/);
  assert.match(ht, /ftp-deploy-sync-state/);
});

test('dist içinde .env, kaynak harita ya da yerel adres sızıntısı yok', opts, () => {
  const leaks = [];
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) scan(full);
      else {
        if (/^\.env/.test(e.name) || e.name.endsWith('.map')) leaks.push(path.relative(DIST, full));
        else if (/\.(html|js|mjs|css|json|txt|xml)$/.test(e.name) && !/ort[.-]/.test(e.name)) {
          const body = fs.readFileSync(full, 'utf8');
          if (/localhost:\d{2,5}|127\.0\.0\.1/.test(body) && !/\/admin\//.test(full)) leaks.push(`${path.relative(DIST, full)}: yerel adres`);
        }
      }
    }
  };
  scan(DIST);
  assert.deepEqual(leaks, []);
});
