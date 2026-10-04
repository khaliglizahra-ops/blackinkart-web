import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

const SITE_URL = 'https://www.blackinkart.com.tr';

// Yerelde .env dosyasındaki analitik kimliklerini (GA_MEASUREMENT_ID, GTM_ID)
// okur; yayında (GitHub Actions) değerler ortamdan gelir. Gerçek kimlik yoksa
// ikisi de boş kalır ve site hiçbir analitik kodu yüklemez (bkz. .env.example).
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
for (const key of ['GA_MEASUREMENT_ID', 'GTM_ID']) {
  if (env[key] && !process.env[key]) process.env[key] = env[key];
}

// Arama sonuçlarında olmaması gereken sayfalar (sayfanın kendisi de noindex).
// Yeni bir noindex sayfa eklenirse buraya da ekleyin — `npm test` ikisinin
// tutarlı olduğunu denetler.
const SITEMAP_EXCLUDE = new Set([
  '/404',
  '/en/404',
  '/kvkk',
  '/cerez-politikasi',
  '/yas-ve-onam-politikasi',
  '/gizlilik-politikasi',
  '/kullanim-sartlari',
  '/en/privacy-notice',
  '/en/cookie-policy',
  '/en/age-and-consent-policy',
  '/en/privacy-policy',
  '/en/terms-of-use',
]);

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE.has(new URL(page).pathname.replace(/\/$/, '') || '/'),
    }),
  ],
  image: {
    domains: [],
  },
});
