// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // ★ "hybrid" ではなく "server" と書くのが現在の正解
  output: 'server', 
  
  adapter: cloudflare({
    // mode: "nodejs_compat" は、pg をSSRで使うための生命線
    mode: "nodejs_compat" 
  })
});