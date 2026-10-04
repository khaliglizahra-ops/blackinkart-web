import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { applyAnalyticsConsent, configureAnalytics, pageView, track } from '../src/lib/analytics-client.js';
import { acceptAll, fromChoices, rejectAll } from '../src/lib/consent.js';

// analytics-client tarayıcı ortamı bekliyor; yalnızca kullandığı yüzeyi taklit ediyoruz.
let scripts;
let reloads;
function installDom(href = 'https://www.blackinkart.com.tr/') {
  scripts = [];
  reloads = 0;
  const url = new URL(href);
  globalThis.window = { dataLayer: undefined };
  globalThis.document = {
    title: 'Test',
    cookie: '',
    head: { appendChild: (el) => scripts.push(el.src) },
    createElement: () => ({}),
  };
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { href: url.href, pathname: url.pathname, hostname: url.hostname, reload: () => reloads++ },
  });
}

// gtag() `arguments` nesnesini, GTM ise düz nesne itiyor; ikisini de diziye çeviriyoruz.
const events = () => (window.dataLayer || []).map((e) => (e && typeof e.length === 'number' ? Array.from(e) : [e]));

beforeEach(() => {
  installDom();
});

// Not: modül durumu testler arasında kalıcı; her testte yeni yapılandırma
// veriyoruz ve izin geri çekme akışıyla yüklenmiş sağlayıcıyı sıfırlıyoruz.
function reset() {
  applyAnalyticsConsent(rejectAll());
  installDom();
}

test('kimlik yoksa hiçbir şey yüklenmez', () => {
  configureAnalytics({ provider: null });
  applyAnalyticsConsent(acceptAll());
  assert.deepEqual(scripts, []);
  assert.equal(window.dataLayer, undefined);
});

test('GA4: izin yokken (karar yok / reddet / yalnızca işlevsel) betik eklenmez', () => {
  configureAnalytics({ provider: 'ga4', gaId: 'G-TEST123456', gtmId: '' });
  applyAnalyticsConsent(null);
  applyAnalyticsConsent(rejectAll());
  applyAnalyticsConsent(fromChoices({ functional: true }));
  assert.deepEqual(scripts, []);
});

test('GA4: analitik izniyle tek betik yüklenir, page_view bir kez gider', () => {
  configureAnalytics({ provider: 'ga4', gaId: 'G-TEST123456', gtmId: '' });
  applyAnalyticsConsent(fromChoices({ analytics: true }));
  applyAnalyticsConsent(fromChoices({ analytics: true })); // tekrar çağrı çift yükleme yapmamalı
  pageView(); // astro:page-load aynı adres için ikinci kez çağırır
  assert.deepEqual(scripts, ['https://www.googletagmanager.com/gtag/js?id=G-TEST123456']);
  const views = events().filter((e) => e[0] === 'event' && e[1] === 'page_view');
  assert.equal(views.length, 1);
  assert.equal(events().find((e) => e[0] === 'config')[2].send_page_view, false);
  reset();
});

test('GA4: sayfa geçişinde yeni adres için yeni page_view, olay izleme çalışır', () => {
  configureAnalytics({ provider: 'ga4', gaId: 'G-TEST123456', gtmId: '' });
  applyAnalyticsConsent(acceptAll());
  installDom('https://www.blackinkart.com.tr/randevu');
  window.dataLayer = []; // yeni sayfa: yalnızca sonrasını görelim
  window.gtag = (...a) => window.dataLayer.push(a);
  pageView();
  track('cta_book', { where: 'hero' });
  const names = events().map((e) => e[1]);
  assert.ok(names.includes('page_view'));
  assert.ok(names.includes('cta_book'));
  reset();
});

test('izin geri çekilince çerezler temizlenir ve sayfa yenilenir', () => {
  configureAnalytics({ provider: 'ga4', gaId: 'G-TEST123456', gtmId: '' });
  applyAnalyticsConsent(acceptAll());
  const before = reloads;
  applyAnalyticsConsent(rejectAll());
  assert.equal(reloads, before + 1);
  const update = events().filter((e) => e[0] === 'consent' && e[1] === 'update').pop();
  assert.equal(update[2].analytics_storage, 'denied');
  // yüklenmemişken geri çekme yenileme yapmaz
  applyAnalyticsConsent(rejectAll());
  assert.equal(reloads, before + 1);
});

test('GTM: önce varsayılan "denied", sonra izin güncellemesi; kapsayıcı bir kez yüklenir', () => {
  configureAnalytics({ provider: 'gtm', gaId: '', gtmId: 'GTM-TEST123' });
  applyAnalyticsConsent(null);
  assert.deepEqual(scripts, []);
  applyAnalyticsConsent(fromChoices({ analytics: true }));
  applyAnalyticsConsent(acceptAll());
  assert.deepEqual(scripts, ['https://www.googletagmanager.com/gtm.js?id=GTM-TEST123']);
  const consentCalls = events().filter((e) => e[0] === 'consent');
  assert.equal(consentCalls[0][1], 'default');
  assert.equal(consentCalls[0][2].analytics_storage, 'denied');
  assert.equal(consentCalls.at(-1)[2].ad_storage, 'granted');
  reset();
});

test('sağlayıcı kimliği URL için kaçışlanır', () => {
  configureAnalytics({ provider: 'ga4', gaId: 'G-A&B=1', gtmId: '' });
  applyAnalyticsConsent(fromChoices({ analytics: true }));
  assert.equal(scripts[0], 'https://www.googletagmanager.com/gtag/js?id=G-A%26B%3D1');
  reset();
});
