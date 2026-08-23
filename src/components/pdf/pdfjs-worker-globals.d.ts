// Ambient types for pdfWorkerEntry.ts's polyfills. Kept in a separate,
// import/export-free .d.ts (rather than a `declare global {}` block inside
// pdfWorkerEntry.ts itself) because that file needs `import()`, which makes
// it a module — and inside a module, `declare module 'literal'` is treated
// as an augmentation of an already-resolved module rather than a fresh
// ambient declaration, which fails for pdf.worker.mjs since pdfjs-dist ships
// no types for that deep path. A non-module ambient .d.ts doesn't have that
// restriction and applies project-wide without needing an import.
interface PromiseConstructor {
  try<T>(fn: (...args: unknown[]) => T, ...args: unknown[]): Promise<T>
  withResolvers<T>(): {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}
interface Uint8Array {
  toHex(): string
}
interface Uint8ArrayConstructor {
  fromBase64(base64: string): Uint8Array
}
interface Map<K, V> {
  getOrInsertComputed(key: K, callback: (key: K) => V): V
}
interface WeakMap<K extends WeakKey, V> {
  getOrInsertComputed(key: K, callback: (key: K) => V): V
}
interface ReadableStream<R> {
  [Symbol.asyncIterator](): AsyncIterator<R>
}
declare module 'pdfjs-dist/build/pdf.worker.mjs'
