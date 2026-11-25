import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  server: { port: 4555 },
  vite: { server: { strictPort: true } },
  integrations: [tailwind(), sitemap({ serialize: (item) => ({ ...item, url: new URL(item.url).pathname === '/' ? 'https://buttocarmelo.it/' : item.url }), filter: (page) => !new URL(page).pathname.startsWith('/api/') && !new URL(page).pathname.startsWith('/404') })],
  trailingSlash: 'never',
  compressHTML: true,
  site: 'https://buttocarmelo.it',
});
