import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],

      manifest: {
        name: 'WarungAI',
        short_name: 'WarungAI',

        description:
          'AI-assisted bookkeeping for Malaysian warung owners and hawkers.',

        lang: 'ms-MY',

        start_url: '/',
        scope: '/',

        display: 'standalone',

        background_color: '#faf7f2',
        theme_color: '#1a7f4b',

        orientation: 'any',

        categories: [
          'business',
          'finance',
          'productivity',
        ],

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],

        navigateFallback: '/index.html',

        cleanupOutdatedCaches: true,

        clientsClaim: true,
        skipWaiting: true,

        runtimeCaching: [],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
