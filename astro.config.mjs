import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = 'https://www.blackinkart.com.tr';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [sitemap()],
  image: {
    domains: [],
  },
});
