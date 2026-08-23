// pdfjs-dist is pinned to an exact version (no ^) in package.json — 6.2.108
// has an unguarded top-level `Iterator.prototype.join` reference in
// build/pdf.mjs (no `typeof Iterator !== 'undefined'` check), which throws
// `ReferenceError: Can't find variable: Iterator` the instant this module is
// evaluated on any browser predating the Iterator Helpers proposal (Safari
// <18.4 — i.e. most iPads, which lag iPhones on OS updates). 6.1.200 doesn't
// have that reference. Bump only after confirming a later release removed it.
import * as pdfjsLib from 'pdfjs-dist'

// Must run before any getDocument()/rendering call — resolves through Vite's
// dependency pre-bundling, no bundler config needed.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

export { pdfjsLib }
