import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import electron from 'vite-plugin-electron/simple'
const isElectron = process.env.BUILD_TARGET === 'electron'

export default defineConfig({
  plugins: [
    react(),

    // Web build: service worker so the app loads offline from browser cache
    !isElectron && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'Shakya',
        short_name: 'Shakya',
        theme_color: '#2563EB',
        background_color: '#F1F5F9',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),

    // Electron build: bundle main + preload alongside the React app
    isElectron && electron({
      main: {
        entry: 'electron/main.js',
        // Strip ELECTRON_RUN_AS_NODE from the spawn env — Vite sets it so Node
        // can resolve electron imports during the build, but it makes Electron
        // start as plain Node (disabling module patching and process.type).
        onstart({ startup }) {
          const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env
          startup(['.', '--no-sandbox'], { env: cleanEnv })
        },
        vite: {
          build: {
            lib: { formats: ['cjs'] },
            rolldownOptions: {
              external: [
                'electron',
                'path', 'fs', 'os', 'url', 'module', 'stream',
                'child_process', 'crypto', 'events', 'http', 'https',
                'net', 'util', 'zlib',
              ],
              output: { entryFileNames: '[name].cjs' },
            },
          },
        },
      },
      preload: { input: 'electron/preload.js' },
    }),

  ].filter(Boolean),
})
