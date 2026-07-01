import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  mode: 'nodejs', // ← 必須！（Cloudflare Functions互換モード）
});