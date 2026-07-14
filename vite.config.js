import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is './' so the built app works when served from a GitHub Pages subpath
export default defineConfig({
  plugins: [react()],
  base: './',
});
