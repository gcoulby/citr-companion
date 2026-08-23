import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { assetMap } from '../../hooks/useAutoSave'
import { pdfjsLib } from './pdfjsSetup'

interface CacheEntry {
  loadingTask: ReturnType<typeof pdfjsLib.getDocument>
  docPromise: Promise<PDFDocumentProxy>
  refCount: number
}

// Loaded PDFDocumentProxys, keyed by asset id, so switching tabs and back
// doesn't re-parse the PDF. Ref-counted so the underlying pdfjs resources are
// released once nothing references them.
const cache = new Map<string, CacheEntry>()

async function acquire(assetId: string): Promise<PDFDocumentProxy> {
  let entry = cache.get(assetId)
  if (!entry) {
    const buffer = assetMap.get(assetId)
    if (!buffer) throw new Error('PDF asset not found')
    // pdfjs takes ownership of / detaches the buffer it's given — slice a
    // copy so assetMap's own copy (needed again on the next save) survives.
    const data = buffer.slice(0)
    const loadingTask = pdfjsLib.getDocument({ data })
    entry = { loadingTask, docPromise: loadingTask.promise, refCount: 0 }
    cache.set(assetId, entry)
  }
  entry.refCount++
  return entry.docPromise
}

function release(assetId: string): void {
  const entry = cache.get(assetId)
  if (!entry) return
  entry.refCount--
  if (entry.refCount <= 0) {
    cache.delete(assetId)
    void entry.loadingTask.destroy()
  }
}

interface UsePdfDocumentResult {
  pdfDoc: PDFDocumentProxy | null
  error: string | null
}

/** Resolves a `PdfEmbed.assetId` to a loaded `PDFDocumentProxy`. */
export function usePdfDocument(assetId: string): UsePdfDocumentResult {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset synchronously when assetId changes, adjusted during render (the
  // sanctioned pattern for "reset derived state when a key prop changes")
  // rather than at the top of the effect below, which would commit the
  // previous document for one render before correcting itself.
  const [trackedAssetId, setTrackedAssetId] = useState(assetId)
  if (assetId !== trackedAssetId) {
    setTrackedAssetId(assetId)
    setPdfDoc(null)
    setError(null)
  }

  useEffect(() => {
    if (!assetId) return
    let cancelled = false
    acquire(assetId)
      .then((doc) => {
        if (!cancelled) {
          setPdfDoc(doc)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
      release(assetId)
    }
  }, [assetId])

  return { pdfDoc, error }
}
