/**
 * Tarayıcı tarafı analitik: GA4 (gtag.js) ya da GTM yükler — ama yalnızca
 * ziyaretçi ilgili kategoriye izin verdikten SONRA. İzin yoksa sayfaya tek
 * bir üçüncü taraf betiği bile eklenmez.
 *
 * Aynı anda yalnızca bir sağlayıcı çalışır (kimlikler data/analytics.ts'de
 * seçilir): GTM varsa GA4 ayrıca yüklenmez, böylece çift sayım olmaz.
 *
 * Kimlik tanımlı değilse (config.provider === null) bu modül hiçbir şey yapmaz.
 */

const COOKIE_RE = /^(_ga|_gid|_gat|_gcl_)/;

const state = {
  config: { provider: null, gaId: '', gtmId: '' },
  loaded: null, // 'ga4' | 'gtm'
  firstViewSent: false,
  lastViewHref: '',
};

export function configureAnalytics(config) {
  state.config = { provider: null, gaId: '', gtmId: '', ...config };
}

export function analyticsAvailable() {
  return state.config.provider !== null;
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag.js "arguments" nesnesinin kendisini bekler; rest parametresi çalışmaz.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
}

function addScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function consentModeUpdate(consent) {
  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
}

function clearGoogleCookies() {
  const host = location.hostname;
  const bare = host.replace(/^www\./, '');
  const domains = ['', host, `.${host}`, `.${bare}`];
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (!COOKIE_RE.test(name)) return;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    }
  });
}

/** Onay durumu değiştiğinde (ve sayfa açılışında) çağrılır. */
export function applyAnalyticsConsent(consent) {
  const { provider, gaId, gtmId } = state.config;
  if (!provider) return;

  const wantGtm = provider === 'gtm' && Boolean(consent && (consent.analytics || consent.marketing));
  const wantGa = provider === 'ga4' && Boolean(consent && consent.analytics);

  if (!wantGtm && !wantGa) {
    if (state.loaded) {
      // İzin geri çekildi. Yüklenmiş Google betikleri sayfadan sökülemez: izni
      // "reddedildi" yapıp çerezleri siliyor ve sayfayı bir kez yeniliyoruz.
      ensureDataLayer();
      consentModeUpdate({ analytics: false, marketing: false });
      clearGoogleCookies();
      state.loaded = null;
      location.reload();
    }
    return;
  }

  ensureDataLayer();

  if (wantGtm) {
    if (!state.loaded) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      });
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`);
      state.loaded = 'gtm';
    }
    consentModeUpdate(consent);
    return;
  }

  if (wantGa && !state.loaded) {
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
    window.gtag('js', new Date());
    // Sayfa görüntülemelerini kendimiz gönderiyoruz: ClientRouter sayfa
    // geçişlerinde tam yükleme olmuyor, otomatik gönderim yalnızca ilkini sayardı.
    window.gtag('config', gaId, { send_page_view: false });
    state.loaded = 'ga4';
    pageView();
  }
}

/** Sayfa görüntüleme (ClientRouter geçişlerinde her yeni sayfada çağrılır). */
export function pageView() {
  if (!state.loaded) return;
  // Aynı adres için tek kayıt: ilk açılışta hem yükleme hem astro:page-load
  // bu fonksiyonu çağırıyor, çift sayım olmasın.
  if (state.lastViewHref === location.href) return;
  state.lastViewHref = location.href;
  const params = { page_title: document.title, page_location: location.href, page_path: location.pathname };
  if (state.loaded === 'ga4') {
    window.gtag('event', 'page_view', params);
    state.firstViewSent = true;
  } else if (state.loaded === 'gtm') {
    // GTM kapsayıcısı ilk yüklemede kendi "tüm sayfalar" tetikleyicisiyle sayıyor;
    // yalnızca sonraki geçişleri biz bildiriyoruz.
    if (state.firstViewSent) window.dataLayer.push({ event: 'page_view', ...params });
    state.firstViewSent = true;
  }
}

/** Önemli eylemler (CTA, form gönderimi). İzin/ID yoksa sessizce hiçbir şey yapmaz. */
export function track(name, params = {}) {
  if (!state.loaded) return;
  if (state.loaded === 'ga4') window.gtag('event', name, params);
  else window.dataLayer.push({ event: name, ...params });
}
