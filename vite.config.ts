import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/pokemon_gaole/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
