// Real entry point for pdfjs's worker (set as GlobalWorkerOptions.workerSrc
// in pdfjsSetup.ts, instead of pointing at pdf.worker.mjs directly). A Web
// Worker is a separate JS realm with its own globals — the index.html
// polyfills only patch the *main* thread, and pdf.worker.mjs unguardedly
// calls the same generation (2024-2025) of JS built-ins the moment it's
// evaluated inside the worker: `Promise.try`, `Promise.withResolvers`,
// `Uint8Array.prototype.toHex`, `Uint8Array.fromBase64`,
// `Map`/`WeakMap.prototype.getOrInsertComputed` (used a dozen+ times —
// core to how pdfjs caches things, not an edge case), and
// `ReadableStream.prototype[Symbol.asyncIterator]` (getTextContent's
// `for await` loop). Same story as the main-thread ones, needs patching
// again here for this realm.
//
// The dynamic import() below (not a static `import` — those are hoisted and
// would evaluate before this file's own top-level code, defeating the
// ordering this exists for) defers loading the real worker script until
// after these run. Types for Promise.try/Uint8Array.toHex/fromBase64 and for
// the pdf.worker.mjs specifier live in pdfjs-worker-globals.d.ts.
//
// When a real Worker can't be instantiated at all (seen on the same older
// iPads this whole file exists for — module Worker support is flaky there),
// pdfjs falls back to a "fake worker" that runs the parsing code on the
// *main* thread instead, by doing `await import(workerSrc)` itself and
// reading `.WorkerMessageHandler` off the resulting module namespace
// (pdf.mjs's `PDFWorker._setupFakeWorkerGlobal`) — i.e. it imports this
// exact file a second way and expects it to behave like a normal module
// with that named export, not just a script with side effects. The
// top-level `await` (not a fire-and-forget `void import(...)`) is what
// makes that work: it holds this module's own evaluation open until
// pdf.worker.mjs has actually loaded, so anyone else awaiting an import of
// *this* file gets the real, populated export — not `undefined`.

if (typeof Promise.try !== 'function') {
  Promise.try = function <T>(fn: (...args: unknown[]) => T, ...args: unknown[]): Promise<T> {
    return new Promise((resolve) => resolve(fn(...args)))
  }
}
if (typeof Uint8Array.prototype.toHex !== 'function') {
  const HEX_CHARS = '0123456789abcdef'
  Uint8Array.prototype.toHex = function () {
    let hex = ''
    for (let i = 0; i < this.length; i++) {
      const byte = this[i]
      hex += HEX_CHARS[byte >> 4] + HEX_CHARS[byte & 0x0f]
    }
    return hex
  }
}
if (typeof Uint8Array.fromBase64 !== 'function') {
  Uint8Array.fromBase64 = function (base64: string) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
}
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Map.prototype.getOrInsertComputed = function (key, callback) {
    if (this.has(key)) return this.get(key)
    const value = callback(key)
    this.set(key, value)
    return value
  }
}
if (typeof WeakMap.prototype.getOrInsertComputed !== 'function') {
  WeakMap.prototype.getOrInsertComputed = function (key, callback) {
    if (this.has(key)) return this.get(key)
    const value = callback(key)
    this.set(key, value)
    return value
  }
}
// `for await (const chunk of readableStream)` on a native ReadableStream —
// async iteration support is itself a fairly recent Streams-spec addition.
// Polyfilled via the always-available getReader()/read() primitives.
if (typeof ReadableStream.prototype[Symbol.asyncIterator] !== 'function') {
  ReadableStream.prototype[Symbol.asyncIterator] = function () {
    const reader = this.getReader()
    return {
      next: () => reader.read(),
      return: (value: unknown) => {
        reader.releaseLock()
        return Promise.resolve({ value, done: true as const })
      },
    }
  }
}

const realWorker = await import('pdfjs-dist/build/pdf.worker.mjs')
export const WorkerMessageHandler = realWorker.WorkerMessageHandler
