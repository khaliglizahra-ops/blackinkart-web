import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: set to the real domain once purchased (see project decisions).
const SITE_URL = 'https://blackinkart.netlify.app';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [sitemap()],
  image: {
    domains: [],
  },
});
