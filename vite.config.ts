import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    // pdfWorkerEntry.ts (the pdfjs worker, see src/components/pdf/) uses a
    // top-level `await import(...)` so it can re-export a binding pdfjs's
    // own fake-worker fallback needs — top-level await isn't supported in
    // Vite's default 'iife' worker output. pdfjs already requests a module
    // worker itself (`new Worker(url, { type: 'module' })`), so this just
    // matches what it was already asking for.
    format: 'es',
  },
})
