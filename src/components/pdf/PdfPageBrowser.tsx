import { useCallback, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

interface PdfPageBrowserProps {
  pdfDoc: PDFDocumentProxy
  currentPage: number
  onSelect: (page: number) => void
}

const THUMB_SCALE = 0.25

/** Thumbnail grid for jumping to a page. Canvases render lazily — only once
 *  scrolled into view — instead of all up front: eagerly rendering every
 *  page competed with whatever the main viewer was rendering for the same
 *  canvas/GPU resources, and switching pages mid-render could crash the tab. */
export function PdfPageBrowser({ pdfDoc, currentPage, onSelect }: PdfPageBrowserProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Pages already rendered or in flight for the *current* pdfDoc — reset
  // whenever pdfDoc changes (see the effect below).
  const renderedRef = useRef<Set<number>>(new Set())
  const tasksRef = useRef<Map<number, RenderTask>>(new Map())

  const renderThumbnail = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      if (renderedRef.current.has(pageNum)) return
      renderedRef.current.add(pageNum)
      try {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: THUMB_SCALE })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const task = page.render({ canvas, canvasContext: ctx, viewport })
        tasksRef.current.set(pageNum, task)
        await task.promise
        tasksRef.current.delete(pageNum)
      } catch {
        // Cancelled (scrolled away / doc swapped) or failed — either way,
        // forget we tried so it's eligible to render again if revisited.
        renderedRef.current.delete(pageNum)
        tasksRef.current.delete(pageNum)
      }
    },
    [pdfDoc],
  )

  // Observe every thumbnail canvas and render only the ones that actually
  // scroll into view (with a little lookahead margin). Re-runs whenever the
  // document changes, cancelling anything still in flight for the old one.
  useEffect(() => {
    renderedRef.current = new Set()
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const canvas = entry.target as HTMLCanvasElement
          const pageNum = Number(canvas.dataset.page)
          if (!pageNum) continue
          void renderThumbnail(pageNum, canvas)
        }
      },
      { root: container, rootMargin: '200px 0px' },
    )
    container.querySelectorAll<HTMLCanvasElement>('canvas[data-page]').forEach((c) => observer.observe(c))

    const tasks = tasksRef.current
    return () => {
      observer.disconnect()
      tasks.forEach((task) => task.cancel())
      tasks.clear()
    }
  }, [pdfDoc, renderThumbnail])

  useEffect(() => {
    containerRef.current
      ?.querySelector(`[data-page-button="${currentPage}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [pdfDoc, currentPage])

  return (
    <div ref={containerRef} className="gap-2 grid grid-cols-2 p-1">
      {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          data-page-button={n}
          onClick={() => onSelect(n)}
          className={cn(
            'flex flex-col items-center gap-1 p-1 rounded border transition-colors',
            n === currentPage ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border',
          )}
        >
          <canvas data-page={n} className="bg-white shadow-sm w-full h-auto" />
          <span className="text-muted-foreground text-[10px]">p. {n}</span>
        </button>
      ))}
    </div>
  )
}
