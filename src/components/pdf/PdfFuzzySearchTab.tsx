import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import type { PdfPageText } from './usePdfFulltextIndex'

interface PdfFuzzySearchTabProps {
  pages: PdfPageText[]
  loading: boolean
  onSelectPage: (page: number, highlightText?: string) => void
}

const SNIPPET_RADIUS = 60

/** Builds a `[start, end)` snippet around the first match range, so a hit
 *  buried deep in the document doesn't require showing the whole page's
 *  text to see why it matched. */
function buildSnippet(text: string, matchStart: number, matchEnd: number) {
  const start = Math.max(0, matchStart - SNIPPET_RADIUS)
  const end = Math.min(text.length, matchEnd + SNIPPET_RADIUS)
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, matchStart),
    match: text.slice(matchStart, matchEnd),
    after: text.slice(matchEnd, end) + (end < text.length ? '…' : ''),
  }
}

/** Full-document fuzzy search — distinct from the toolbar's exact in-page
 *  Find: this searches every page's extracted text at once and lists
 *  results with page numbers. */
export function PdfFuzzySearchTab({ pages, loading, onSelectPage }: PdfFuzzySearchTabProps) {
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () =>
      new Fuse(pages, {
        keys: ['text'],
        includeMatches: true,
        ignoreLocation: true,
        threshold: 0.3,
        minMatchCharLength: 2,
      }),
    [pages],
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 50)
  }, [fuse, query])

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative shrink-0 px-2 pt-2">
        <Search size={13} className="top-1/2 left-4 absolute text-muted-foreground -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? 'Indexing pages…' : 'Search this PDF'}
          disabled={loading}
          className="pl-7 h-8 text-xs"
        />
      </div>

      {!loading && query.trim() && results.length === 0 && (
        <p className="py-4 text-muted-foreground text-xs text-center">No matches for &quot;{query}&quot;.</p>
      )}

      <div className="flex flex-col gap-1 px-2 pb-2 overflow-y-auto">
        {results.map((result) => {
          const range = result.matches?.[0]?.indices?.[0]
          const snippet = range ? buildSnippet(result.item.text, range[0], range[1] + 1) : null
          return (
            <button
              key={result.item.page}
              type="button"
              onClick={() => onSelectPage(result.item.page, snippet?.match)}
              className="hover:bg-muted px-2 py-1.5 border border-border rounded text-left transition-colors"
            >
              <div className="mb-0.5 font-semibold text-muted-foreground text-[10px]">Page {result.item.page}</div>
              {snippet ? (
                <p className="text-xs leading-snug line-clamp-2">
                  {snippet.before}
                  <mark className="bg-primary/30 rounded-xs text-foreground">{snippet.match}</mark>
                  {snippet.after}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs line-clamp-2">{result.item.text.slice(0, 120)}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
