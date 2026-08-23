import { useEffect, useRef, useState } from 'react'
import {
  EventBus,
  PDFFindController,
  PDFLinkService,
  PDFViewer as PdfjsViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs'
import 'pdfjs-dist/web/pdf_viewer.css'
import './pdf-viewer-overrides.css'
import { usePdfDocument } from './usePdfDocument'
import { usePdfSearch } from './usePdfSearch'
import { PdfToolbar } from './PdfToolbar'
import { PdfSearchBar } from './PdfSearchBar'
import { usePdfLibraryStore } from '../../store/pdfLibraryStore'
import type { PdfEmbed } from '../../types'

interface PdfViewerProps {
  embed: PdfEmbed
}

/** Owns a pdfjs `PDFViewer` instance for one `PdfEmbed`. Built directly on
 *  `pdfjs-dist/web/pdf_viewer.mjs` (the reference-viewer pattern), read-only
 *  — no annotation editor, no AcroForm scripting: this app's PDFs are
 *  reference material (rulebook, handouts), not fillable character sheets. */
export function PdfViewer({ embed }: PdfViewerProps) {
  const { pdfDoc, error } = usePdfDocument(embed.assetId)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<PdfjsViewer | null>(null)
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 })
  const [scale, setScale] = useState(1)
  // True until the user manually zooms — while true, the container's own
  // ResizeObserver keeps re-fitting to 'page-width', since a tab can mount
  // while hidden and pagesinit's own page-width computation would otherwise
  // run against a zero-size container and lock in a nonsense scale.
  const autoFitRef = useRef(true)
  const [eventBus, setEventBus] = useState<EventBus | null>(null)
  const [findController, setFindController] = useState<PDFFindController | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const search = usePdfSearch(eventBus, findController)
  const pageJumpRequest = usePdfLibraryStore((s) => s.pageJumpRequest)
  const [fullscreen, setFullscreen] = useState(false)

  // Recreate the viewer whenever the resolved document changes — switching
  // tabs means switching documents, and the library isn't designed for
  // swapping documents on a live instance.
  useEffect(() => {
    const container = containerRef.current
    if (!pdfDoc || !container) return

    container.innerHTML = ''
    const viewerDiv = document.createElement('div')
    viewerDiv.className = 'pdfViewer'
    container.appendChild(viewerDiv)

    const newEventBus = new EventBus()
    const linkService = new PDFLinkService({ eventBus: newEventBus })
    const newFindController = new PDFFindController({ eventBus: newEventBus, linkService })
    const viewer = new PdfjsViewer({
      container,
      viewer: viewerDiv,
      eventBus: newEventBus,
      linkService,
      findController: newFindController,
    })
    linkService.setViewer(viewer)
    linkService.setDocument(pdfDoc)
    viewerRef.current = viewer
    const eventBus = newEventBus
    setEventBus(newEventBus)
    setFindController(newFindController)

    const onPagesInit = () => {
      viewer.currentScaleValue = embed.zoom ? String(embed.zoom) : 'page-width'
      if (embed.currentPage && embed.currentPage > 1) {
        viewer.currentPageNumber = embed.currentPage
      }
    }
    const onPageChanging = (evt: { pageNumber: number }) => {
      setPageInfo((s) => ({ ...s, current: evt.pageNumber }))
      if (usePdfLibraryStore.getState().activeEmbedId === embed.id) {
        usePdfLibraryStore.getState().setActivePage(evt.pageNumber)
      }
      usePdfLibraryStore.getState().setEmbedPage(embed.id, evt.pageNumber)
    }
    const onScaleChanging = (evt: { scale: number }) => {
      setScale(evt.scale)
      // Only persist once the user has taken over from auto-fit — otherwise
      // every auto-fit recompute (initial load, container resize) would get
      // saved as if the user had chosen it.
      if (!autoFitRef.current) {
        usePdfLibraryStore.getState().setEmbedZoom(embed.id, evt.scale)
      }
    }
    eventBus.on('pagesinit', onPagesInit)
    eventBus.on('pagechanging', onPageChanging)
    eventBus.on('scalechanging', onScaleChanging)

    setPageInfo({ current: embed.currentPage ?? 1, total: pdfDoc.numPages })
    if (usePdfLibraryStore.getState().activeEmbedId === embed.id) {
      usePdfLibraryStore.getState().setActivePage(embed.currentPage ?? 1)
    }
    autoFitRef.current = embed.zoom == null
    viewer.setDocument(pdfDoc)

    // Fit once, the first time the container has a real (non-zero) size —
    // covers the tab-mounts-hidden case. Deliberately fires only once:
    // re-fitting on every subsequent resize would keep snapping the scale to
    // whatever page happens to be in view, making zoom jump around while
    // the user scrolls through pages of differing aspect ratio.
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {}
      if (!width || !height || !autoFitRef.current) return
      viewer.currentScaleValue = embed.zoom ? String(embed.zoom) : 'page-width'
      autoFitRef.current = false
      resizeObserver.disconnect()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      eventBus.off('pagesinit', onPagesInit)
      eventBus.off('pagechanging', onPageChanging)
      eventBus.off('scalechanging', onScaleChanging)
      viewer.cleanup()
      viewerRef.current = null
      setEventBus(null)
      setFindController(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, embed.id])

  // Lets the sidebar's Pages/Search tabs jump this embed's viewer to a page.
  // When the request also carries `highlightText` (the fuzzy-search tab's
  // matched substring), briefly flash just that one occurrence.
  useEffect(() => {
    if (!pageJumpRequest || pageJumpRequest.embedId !== embed.id) return
    const viewer = viewerRef.current
    if (viewer) viewer.currentPageNumber = pageJumpRequest.page
    if (!pageJumpRequest.highlightText || !eventBus) return

    eventBus.dispatch('find', {
      source: findController,
      type: '',
      query: pageJumpRequest.highlightText,
      caseSensitive: false,
      entireWord: false,
      highlightAll: false,
      findPrevious: false,
      matchDiacritics: true,
    })
    const clearTimer = setTimeout(() => {
      eventBus.dispatch('findbarclose', { source: findController })
    }, 5000)
    return () => clearTimeout(clearTimer)
  }, [pageJumpRequest, embed.id, eventBus, findController])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    requestAnimationFrame(() => {
      autoFitRef.current = false
      viewer.currentScaleValue = 'page-width'
    })
  }, [fullscreen])

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-destructive text-xs text-center">
        Couldn&apos;t load {embed.fileName}: {error}
      </div>
    )
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col bg-background' : 'flex flex-col h-full'}>
      <PdfToolbar
        page={pageInfo.current}
        pageCount={pageInfo.total}
        onPageChange={(n) => {
          const viewer = viewerRef.current
          if (viewer) viewer.currentPageNumber = n
        }}
        scale={scale}
        onZoomIn={() => {
          autoFitRef.current = false
          const viewer = viewerRef.current
          if (viewer) viewer.currentScaleValue = String(viewer.currentScale * 1.1)
        }}
        onZoomOut={() => {
          autoFitRef.current = false
          const viewer = viewerRef.current
          if (viewer) viewer.currentScaleValue = String(viewer.currentScale / 1.1)
        }}
        onZoomChange={(percent) => {
          autoFitRef.current = false
          const viewer = viewerRef.current
          if (viewer) viewer.currentScaleValue = String(percent / 100)
        }}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          if (searchOpen) search.close()
          setSearchOpen((s) => !s)
        }}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((s) => !s)}
      />
      {searchOpen && (
        <PdfSearchBar
          search={search}
          onClose={() => {
            search.close()
            setSearchOpen(false)
          }}
        />
      )}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 bg-neutral-700 overflow-auto" />
      </div>
    </div>
  )
}
