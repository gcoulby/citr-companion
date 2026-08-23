import { useCallback, useEffect, useRef, useState } from 'react'
import { FindState, type EventBus, type PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs'

export interface PdfSearchApi {
  query: string
  matches: { current: number; total: number }
  notFound: boolean
  find: (query: string) => void
  findNext: () => void
  findPrevious: () => void
  close: () => void
}

/** Bridges pdfjs's `PDFFindController` (created once per viewer instance in
 *  `PdfViewer.tsx`, alongside the `linkService`) to React state, the same way
 *  page/zoom are bridged from the `PDFViewer`'s own EventBus. */
export function usePdfSearch(
  eventBus: EventBus | null,
  findController: PDFFindController | null,
): PdfSearchApi {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState({ current: 0, total: 0 })
  const [notFound, setNotFound] = useState(false)
  const lastQueryRef = useRef('')

  useEffect(() => {
    if (!eventBus) return
    const onMatchesCount = (evt: { matchesCount: { current: number; total: number } }) =>
      setMatches(evt.matchesCount)
    const onControlState = (evt: {
      state: number
      matchesCount: { current: number; total: number }
    }) => {
      setMatches(evt.matchesCount)
      setNotFound(evt.state === FindState.NOT_FOUND)
    }
    eventBus.on('updatefindmatchescount', onMatchesCount)
    eventBus.on('updatefindcontrolstate', onControlState)
    return () => {
      eventBus.off('updatefindmatchescount', onMatchesCount)
      eventBus.off('updatefindcontrolstate', onControlState)
    }
  }, [eventBus])

  const dispatchFind = useCallback(
    (nextQuery: string, type: string, findPrevious = false) => {
      if (!eventBus) return
      eventBus.dispatch('find', {
        source: findController,
        type,
        query: nextQuery,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious,
        matchDiacritics: true,
      })
    },
    [eventBus, findController],
  )

  const find = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery)
      if (!nextQuery.trim()) {
        setMatches({ current: 0, total: 0 })
        setNotFound(false)
        lastQueryRef.current = ''
        return
      }
      const isNewQuery = nextQuery !== lastQueryRef.current
      lastQueryRef.current = nextQuery
      dispatchFind(nextQuery, isNewQuery ? '' : 'again', false)
    },
    [dispatchFind],
  )

  const findNext = useCallback(() => {
    if (!query.trim()) return
    dispatchFind(query, 'again', false)
  }, [dispatchFind, query])

  const findPrevious = useCallback(() => {
    if (!query.trim()) return
    dispatchFind(query, 'again', true)
  }, [dispatchFind, query])

  const close = useCallback(() => {
    setQuery('')
    setMatches({ current: 0, total: 0 })
    setNotFound(false)
    lastQueryRef.current = ''
    eventBus?.dispatch('findbarclose', { source: findController })
  }, [eventBus, findController])

  return { query, matches, notFound, find, findNext, findPrevious, close }
}
