import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset URLs: the same build works at a domain root, under GitHub Pages'
  // /token-to-water/ sub-path, or from any other folder. (Single page, no client routing.)
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // The whole app is one screen; a single chunk avoids a request waterfall on slow mobile links.
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
})
