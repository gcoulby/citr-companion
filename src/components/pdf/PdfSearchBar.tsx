import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { PdfSearchApi } from './usePdfSearch'

interface PdfSearchBarProps {
  search: PdfSearchApi
  onClose: () => void
}

export function PdfSearchBar({ search, onClose }: PdfSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasQuery = search.query.trim().length > 0

  return (
    <div className="flex items-center gap-1 bg-card px-2 py-1.5 border-b border-border shrink-0">
      <Input
        ref={inputRef}
        value={search.query}
        onChange={(e) => search.find(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) search.findPrevious()
            else search.findNext()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder="Find in document"
        className="h-7 text-xs"
      />
      <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
        {hasQuery
          ? search.notFound
            ? 'Not found'
            : `${search.matches.current} / ${search.matches.total}`
          : ''}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={search.findPrevious}
        disabled={!hasQuery}
        title="Previous match"
      >
        <ChevronUp size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={search.findNext}
        disabled={!hasQuery}
        title="Next match"
      >
        <ChevronDown size={14} />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close search">
        <X size={14} />
      </Button>
    </div>
  )
}
