import * as pdfjsLib from 'pdfjs-dist'

// Must run before any getDocument()/rendering call — resolves through Vite's
// dependency pre-bundling, no bundler config needed.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

export { pdfjsLib }
