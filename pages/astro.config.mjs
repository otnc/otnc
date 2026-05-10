// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  outDir: '../docs',
  base: '/otnc/',
  site: 'https://otnc.github.io',
});
