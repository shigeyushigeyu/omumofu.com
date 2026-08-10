import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),

  // ← 必須！（Cloudflare Functions互換モード）
  mode: 'nodejs',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});