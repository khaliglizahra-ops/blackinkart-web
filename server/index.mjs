// Black Ink Art — küçük yardımcı sunucu (Hostinger Node.js uygulaması olarak çalışır).
//
// İki iş yapar:
//   1. Yönetim paneli (Decap CMS) için GitHub girişi: /auth ve /callback
//      Netlify Identity yerine geçer. Panel GitHub ile giriş yapar, bu sunucu
//      GitHub'dan aldığı erişim anahtarını panele iletir. Anahtar burada saklanmaz.
//   2. İletişim formu: /iletisim — formu e-posta olarak gönderir.
//      Netlify Forms yerine geçer.
//
// Gerekli ortam değişkenleri (Hostinger → uygulama → Ortam değişkenleri):
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET  — GitHub OAuth App bilgileri
//   SITE_URL                                 — https://www.blackinkart.com.tr
// İletişim formu için (isteğe bağlı; yoksa form devre dışı kalır):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO

import http from 'node:http';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || 'https://www.blackinkart.com.tr').replace(/\/$/, '');
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const mailer =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

// Basit hız sınırı: aynı IP'den dakikada en fazla 5 form.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Decap CMS'in beklediği pencere-arası mesajlaşma. Önce "authorizing:github"
// el sıkışması yapılır, panel cevap verince sonuç kendi kökenine gönderilir.
function authResult(status, content) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  return `<!doctype html><html><body><script>
(function () {
  function receive(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`;
}

const states = new Map(); // state -> oluşturulma zamanı (CSRF koruması)

async function handleAuth(req, res, url) {
  if (!CLIENT_ID) return send(res, 500, 'GITHUB_CLIENT_ID ayarlanmamış.');
  const state = crypto.randomBytes(16).toString('hex');
  states.set(state, Date.now());
  const scope = url.searchParams.get('scope') || 'repo';
  const redirectUri = `${origin(req)}/callback`;
  const target = new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id', CLIENT_ID);
  target.searchParams.set('redirect_uri', redirectUri);
  target.searchParams.set('scope', scope);
  target.searchParams.set('state', state);
  redirect(res, target.toString());
}

async function handleCallback(req, res, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const created = states.get(state);
  states.delete(state);
  if (!code || !created || Date.now() - created > 10 * 60_000) {
    return send(res, 400, authResult('error', { message: 'Geçersiz veya süresi dolmuş giriş isteği.' }));
  }
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await r.json();
    if (!data.access_token) {
      return send(res, 401, authResult('error', { message: data.error_description || 'Giriş başarısız.' }));
    }
    send(res, 200, authResult('success', { token: data.access_token, provider: 'github' }));
  } catch (err) {
    send(res, 502, authResult('error', { message: 'GitHub’a ulaşılamadı.' }));
  }
}

function clean(v, max) {
  return String(v || '').replace(/[\r\0]/g, '').trim().slice(0, max);
}

async function handleForm(req, res) {
  const back = (() => {
    const ref = req.headers.referer || '';
    return ref.startsWith(SITE_URL) ? ref.split('#')[0].split('?')[0] : `${SITE_URL}/hakkimizda-iletisim`;
  })();
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    const raw = await readBody(req);
    const f = new URLSearchParams(raw);
    // Bot tuzağı: gerçek kullanıcı bu alanı görmez, doluysa sessizce "gönderildi" de.
    if (f.get('bot-field')) return redirect(res, `${back}?gonderildi=1`);
    if (rateLimited(ip)) return redirect(res, `${back}?hata=1`);
    const name = clean(f.get('name'), 120);
    const contact = clean(f.get('contact'), 200);
    const message = clean(f.get('message'), 5000);
    if (!name || !contact || !message || !mailer) return redirect(res, `${back}?hata=1`);
    await mailer.sendMail({
      from: `"Black Ink Art Web" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO || process.env.SMTP_USER,
      subject: `Web sitesinden mesaj: ${name}`,
      text: `Ad: ${name}\nİletişim: ${contact}\n\n${message}\n\n— ${back}`,
    });
    redirect(res, `${back}?gonderildi=1`);
  } catch (err) {
    redirect(res, `${back}?hata=1`);
  }
}

function origin(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${req.headers.host}`;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/auth') return handleAuth(req, res, url);
    if (req.method === 'GET' && url.pathname === '/callback') return handleCallback(req, res, url);
    if (req.method === 'POST' && url.pathname === '/iletisim') return handleForm(req, res);
    if (url.pathname === '/') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });
    send(res, 404, 'Bulunamadı', { 'Content-Type': 'text/plain; charset=utf-8' });
  })
  .listen(PORT, () => console.log(`blackinkart server on :${PORT}`));
