// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // outputの指定はしない（デフォルトの 'static' になる）
  adapter: cloudflare({
    // SSRを有効に　有効にするとmessageboard.astroが動かない
    // SSRされるページ（prerender=false）のために、
    // Node.js互換モードは有効にしておく
    mode: "nodejs_compat"
  })
});