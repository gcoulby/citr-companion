import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { pdfjsLib } from './pdfjsSetup'

interface PdfPagePickerProps {
  file: File
  selectedIndex: number | null
  onSelect: (index: number) => void
}

/** Thumbnail grid for picking one page out of a multi-page source, so the
 *  user can see what they're choosing rather than guess a page number blind. */
export function PdfPagePicker({ file, selectedIndex, onSelect }: PdfPagePickerProps) {
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let pdfDoc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null

    void (async () => {
      try {
        const buf = await file.arrayBuffer()
        pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise
        if (cancelled) return
        setPageCount(pdfDoc.numPages)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      cancelled = true
      void pdfDoc?.loadingTask.destroy()
    }
  }, [file])

  useEffect(() => {
    if (!pageCount) return
    let cancelled = false
    let pdfDoc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null

    void (async () => {
      const buf = await file.arrayBuffer()
      pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise
      if (cancelled) return
      const container = containerRef.current
      if (!container) return

      for (let i = 1; i <= pageCount; i++) {
        if (cancelled) break
        const canvas = container.querySelector<HTMLCanvasElement>(`canvas[data-page="${i}"]`)
        if (!canvas) continue
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
      }
    })()

    return () => {
      cancelled = true
      void pdfDoc?.loadingTask.destroy()
    }
  }, [file, pageCount])

  if (error) {
    return <p className="py-6 text-destructive text-xs text-center">{error}</p>
  }
  if (!pageCount) {
    return <p className="py-6 text-muted-foreground text-xs text-center">Loading pages…</p>
  }

  return (
    <div ref={containerRef} className="gap-3 grid grid-cols-3 sm:grid-cols-4 p-1 max-h-80 overflow-y-auto">
      {Array.from({ length: pageCount }, (_, i) => i).map((index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'flex flex-col items-center gap-1 p-1 rounded border transition-colors',
            selectedIndex === index ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border',
          )}
        >
          <canvas data-page={index + 1} className="bg-white shadow-sm w-full h-auto" />
          <span className="text-muted-foreground text-[10px]">p. {index + 1}</span>
        </button>
      ))}
    </div>
  )
}
