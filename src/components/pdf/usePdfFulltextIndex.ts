import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface PdfPageText {
  page: number
  text: string
}

interface UsePdfFulltextIndexResult {
  pages: PdfPageText[]
  loading: boolean
}

const cache = new WeakMap<PDFDocumentProxy, PdfPageText[]>()

/** Extracts every page's plain text once per `pdfDoc`, for the fuzzy search
 *  tab. Cached by `PDFDocumentProxy` identity so switching tabs and back
 *  doesn't re-extract. */
export function usePdfFulltextIndex(
  pdfDoc: PDFDocumentProxy | null,
): UsePdfFulltextIndexResult {
  const [pages, setPages] = useState<PdfPageText[]>(
    () => (pdfDoc && cache.get(pdfDoc)) ?? [],
  )
  const [loading, setLoading] = useState(false)

  const [trackedPdfDoc, setTrackedPdfDoc] = useState(pdfDoc)
  if (pdfDoc !== trackedPdfDoc) {
    setTrackedPdfDoc(pdfDoc)
    const cached = pdfDoc ? cache.get(pdfDoc) : undefined
    setPages(cached ?? [])
    setLoading(!!pdfDoc && !cached)
  }

  useEffect(() => {
    if (!pdfDoc || cache.has(pdfDoc)) return
    let cancelled = false

    void (async () => {
      const extracted: PdfPageText[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return
        const page = await pdfDoc.getPage(i)
        if (cancelled) return
        const content = await page.getTextContent()
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        extracted.push({ page: i, text })
      }
      if (cancelled) return
      cache.set(pdfDoc, extracted)
      setPages(extracted)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [pdfDoc])

  return { pages, loading }
}
