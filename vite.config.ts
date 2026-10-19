import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = import.meta.dirname

const base = process.env.BASE_URL || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: "Tartil Shafa'i",
        short_name: 'Tartil',
        description:
          "Platform digital mutqin tilawah dan panduan maqra' tartil Al-Qur'an.",
        theme_color: '#9A7738',
        background_color: '#FAFAF7',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          {
            src: `${base}icons/pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${base}icons/pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${base}icons/pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}', 'favicon.ico', 'icons/*.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/quran\/.*\.json$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-json-cache',
              expiration: {
                maxEntries: 114,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/fonts\/.*\.(otf|ttf|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    {
      name: 'copy-404-and-nojekyll',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist')
        const indexPath = resolve(distDir, 'index.html')
        const notFoundPath = resolve(distDir, '404.html')
        const nojekyllPath = resolve(distDir, '.nojekyll')
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, notFoundPath)
        }
        if (!fs.existsSync(nojekyllPath)) {
          fs.writeFileSync(nojekyllPath, '')
        }
      },
    },
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
              return 'vendor-firestore';
            }
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
              return 'vendor-firebase-auth';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase-core';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          }
          if (id.includes('tartil-packages-fixture.json')) {
            return 'curriculum-fixture';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
