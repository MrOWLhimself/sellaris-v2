import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // App-shell caching only (JS/CSS/HTML/icons) — NOT Supabase API
      // responses. Live business data (stock, orders) must never be
      // served stale; the app shell loading offline is what lets the
      // POS offline-sale queue (hand-built separately) actually run.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [], // deliberately empty — no caching of API calls
      },
      manifest: {
        name: 'Sellaris',
        short_name: 'Sellaris',
        description: 'Business OS for African SMEs — POS, inventory, and more.',
        theme_color: '#13111F',
        background_color: '#13111F',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
