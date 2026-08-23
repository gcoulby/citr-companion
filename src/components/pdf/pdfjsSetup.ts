// pdfjs-dist is pinned to an exact version (no ^) in package.json — 6.2.108
// has an unguarded top-level `Iterator.prototype.join` reference in
// build/pdf.mjs (no `typeof Iterator !== 'undefined'` check), which throws
// `ReferenceError: Can't find variable: Iterator` the instant this module is
// evaluated on any browser predating the Iterator Helpers proposal (Safari
// <18.4 — i.e. most iPads, which lag iPhones on OS updates). 6.1.200 doesn't
// have that reference. Bump only after confirming a later release removed it.
import * as pdfjsLib from 'pdfjs-dist'
// `?worker&url` — Vite's dedicated suffix for "bundle this as a worker and
// give me its URL, without instantiating it myself" (pdfjs constructs its
// own Worker internally; we only supply the src string). This is the only
// import form that actually runs pdfWorkerEntry.ts through the real
// transpile+bundle pipeline — a plain `new URL('./pdfWorkerEntry.ts',
// import.meta.url)` only gets that treatment when `new Worker(new URL(...))`
// is written directly in the same expression, which isn't possible here
// since pdfjs's own code (deep in node_modules) is what calls `new
// Worker(workerSrc, ...)`; used indirectly like that, Vite just copies the
// raw, untranspiled .ts source verbatim, which a browser can't execute.
import pdfWorkerUrl from './pdfWorkerEntry.ts?worker&url'

// The worker is a separate JS realm from the main thread — pdfWorkerEntry.ts
// installs its own copies of the same Baseline-2025 API polyfills
// (Promise.try, Uint8Array.prototype.toHex, Uint8Array.fromBase64) that
// index.html installs for the main thread; see that file's own comment.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export { pdfjsLib }
