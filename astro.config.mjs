import { defineConfig } from 'astro/config';
import staticAdapter from '@astrojs/adapter-static';

export default defineConfig({
  output: 'static',
  adapter: staticAdapter(),
});