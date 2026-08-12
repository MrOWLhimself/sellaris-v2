import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Preview-only config: bundles everything into one self-contained HTML
// file so it can be shared/previewed as a single artifact. NOT used for
// the real deployment (Vercel build uses the normal vite.config.js).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'preview-build',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
})
