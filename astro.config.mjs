// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://signatureacte.com',
  // Pages stay prerendered. Only the /api routes opt into running on the
  // server, via `export const prerender = false` in each endpoint.
  adapter: vercel(),
});
