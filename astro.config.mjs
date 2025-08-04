import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // ★ ここから追加
  output: 'hybrid', // SSGとSSRの混在モードを明示
  adapter: cloudflare({
    mode: "nodejs_compat" // Node.js互換モードを有効化
  })
  // ★ ここまで
});