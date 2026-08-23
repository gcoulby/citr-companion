import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Maximize, Minimize } from 'lucide-react'
import { Button } from '../ui/button'
import { EditableStat } from './EditableStat'

interface PdfToolbarProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomChange: (percent: number) => void
  searchOpen: boolean
  onToggleSearch: () => void
  fullscreen: boolean
  onToggleFullscreen: () => void
}

/** Page nav, zoom, Find toggle, and fullscreen — no mode switcher (this
 *  viewer is read-only: no AcroForm fill, no markup annotations). */
export function PdfToolbar({
  page,
  pageCount,
  onPageChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  searchOpen,
  onToggleSearch,
  fullscreen,
  onToggleFullscreen,
}: PdfToolbarProps) {
  const clampPage = (n: number) => onPageChange(Math.min(pageCount, Math.max(1, Math.round(n))))

  return (
    <div className="flex items-center gap-1 bg-card px-2 py-1.5 border-b border-border shrink-0">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        title="Previous page"
      >
        <ChevronLeft size={14} />
      </Button>
      <EditableStat display={`${page} / ${pageCount}`} value={page} onCommit={clampPage} title="Go to page" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        title="Next page"
      >
        <ChevronRight size={14} />
      </Button>

      <div className="mx-1 w-px h-4 bg-border" />

      <Button variant="ghost" size="icon-sm" onClick={onZoomOut} title="Zoom out">
        <ZoomOut size={14} />
      </Button>
      <EditableStat
        display={`${Math.round(scale * 100)}%`}
        value={Math.round(scale * 100)}
        onCommit={onZoomChange}
        title="Set zoom"
      />
      <Button variant="ghost" size="icon-sm" onClick={onZoomIn} title="Zoom in">
        <ZoomIn size={14} />
      </Button>

      <div className="mx-1 w-px h-4 bg-border" />

      <Button
        variant={searchOpen ? 'secondary' : 'ghost'}
        size="icon-sm"
        onClick={onToggleSearch}
        title="Find in document"
      >
        <Search size={14} />
      </Button>

      <div className="flex-1" />

      <Button
        variant={fullscreen ? 'secondary' : 'ghost'}
        size="icon-sm"
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
      >
        {fullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </Button>
    </div>
  )
}
