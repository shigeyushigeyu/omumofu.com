// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // この2行を追加・または変更
  output: 'server',
  adapter: cloudflare(),
  mode: "nodejs"
  // ... 他の設定（もしあれば）...
});