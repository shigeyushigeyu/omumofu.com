// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  //output: 'server',        // SSRを有効に
  adapter: cloudflare(),   // Cloudflare向けに最適化
  // mode: "nodejs" は書かない
});