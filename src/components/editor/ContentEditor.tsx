import { useCallback, useEffect, useState, type ReactElement } from 'react'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import {
  insertOrUpdateBlockForSlashMenu,
  filterSuggestionItems,
} from '@blocknote/core'
import '@blocknote/mantine/style.css'
import './contentEditor.css'
import {
  BookOpen,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Dices,
  Search,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { useGraphStore } from '../../store/graphStore'
import { useBacklinksStore } from '../../store/backlinksStore'
import { useMysteryStore } from '../../store/mysteryStore'
import { useFileStore } from '../../store/fileStore'
import {
  contentMap,
  contentDirty,
  getCurrentFileBlob,
  assetMap,
} from '../../hooks/useAutoSave'
import { loadNodeContent } from '../../file/citrReader'
import { citrSchema } from './blockSchema'
import { CompactSuggestionMenu } from './CompactSuggestionMenu'
import { captureSnapshot } from './blocks/snapshotBlock'
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig'
import { CASE_NOTES_ID, documentRefToId, type DocumentRef } from '../../types'
import { cacheAsset, getCachedAsset } from '../../lib/assetCache'
import { mimeFromExt } from '../../lib/mime'

// Media blocks (image/video/audio/file) store this custom-scheme URL in the
// document's own JSON instead of a blob: URL — blob URLs are only valid for
// the tab that created them, so they'd break on reload. `resolveFileUrl`
// below turns this back into a fresh blob URL each time the editor renders.
const ASSET_SCHEME = 'citr-asset:'

async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const assetId = `${nanoid()}.${ext}`
  const buffer = await file.arrayBuffer()
  assetMap.set(assetId, buffer)
  cacheAsset(assetId, buffer, file.type || mimeFromExt(ext))
  return `${ASSET_SCHEME}${assetId}`
}

async function resolveFileUrl(url: string): Promise<string> {
  if (!url.startsWith(ASSET_SCHEME)) return url
  const assetId = url.slice(ASSET_SCHEME.length)
  const cached = getCachedAsset(assetId)
  if (cached) return cached
  const buffer = assetMap.get(assetId)
  if (!buffer) return url
  const ext = assetId.split('.').pop() ?? ''
  return cacheAsset(assetId, buffer, mimeFromExt(ext))
}

// ── Inner editor — rendered only once content is ready ────────────────────────

interface EditorInnerProps {
  docId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialContent: any[] | undefined
}

function EditorInner({ docId, initialContent }: EditorInnerProps) {
  const updateNode = useGraphStore((s) => s.updateNode)
  const setDocMentions = useBacklinksStore((s) => s.setDocMentions)
  const bumpContentRevision = useFileStore((s) => s.bumpContentRevision)
  const editor = useCreateBlockNote({
    schema: citrSchema,
    initialContent: initialContent?.length ? initialContent : undefined,
    uploadFile,
    resolveFileUrl,
  })

  // Persist content to contentMap on every change, and keep the backlinks
  // index in sync with any @-mentions the document currently contains.
  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      contentMap.set(docId, editor.document)
      contentDirty.add(docId)
      if (docId !== CASE_NOTES_ID) updateNode(docId, { hasContent: true })
      setDocMentions(docId, editor.document)
      bumpContentRevision()
    })
    return unsubscribe
  }, [editor, docId, updateNode, setDocMentions, bumpContentRevision])

  const getSlashMenuItems = useCallback(
    async (query: string) => {
      const citrItems: DefaultReactSuggestionItem[] = [
        {
          title: 'Scene',
          subtext: 'Investigation / Truth / Obligation / Rest heading',
          group: 'Caught in the Rain',
          icon: <Search size={14} />,
          onItemClick: () => {
            const m = useMysteryStore.getState()
            insertOrUpdateBlockForSlashMenu(editor, {
              type: 'scene',
              props: {
                sceneType: 'other',
                stage: '',
                day: m.day,
                danger: m.danger,
              },
            })
          },
        },
        {
          title: 'Beat',
          subtext: 'What the investigator did / what happened',
          group: 'Caught in the Rain',
          icon: <ArrowRight size={14} />,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor, { type: 'beat' }),
        },
        {
          title: 'Resolve',
          subtext: 'How the scene resolved',
          group: 'Caught in the Rain',
          icon: <CheckCircle2 size={14} />,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor, { type: 'resolve' }),
        },
        {
          title: 'Snapshot',
          subtext: 'Stamp current day / danger / clock / threats',
          group: 'Caught in the Rain',
          icon: <Gauge size={14} />,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor, {
              type: 'snapshot',
              props: { data: JSON.stringify(captureSnapshot()) },
            }),
        },
        {
          title: 'Roll',
          subtext: 'Capture a dice or oracle roll',
          group: 'Caught in the Rain',
          icon: <Dices size={14} />,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor, { type: 'roll' }),
        },
      ]
      return filterSuggestionItems(
        [...citrItems, ...getDefaultReactSlashMenuItems(editor)],
        query,
      )
    },
    [editor],
  )

  const getNodeMentionItems = useCallback(
    async (query: string) => {
      const nodes = Object.values(useGraphStore.getState().nodes)
      const items = nodes.map((n) => ({
        title: n.label || 'Untitled',
        subtext: n.nodeType ? NODE_TYPE_CONFIG[n.nodeType].label : undefined,
        icon: n.nodeType
          ? (NODE_TYPE_CONFIG[n.nodeType].icon as ReactElement)
          : undefined,
        onItemClick: () => {
          editor.insertInlineContent([
            { type: 'nodeMention', props: { nodeId: n.id } },
            ' ',
          ])
        },
      }))
      return filterSuggestionItems(items, query)
    },
    [editor],
  )

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      slashMenu={false}
      style={{ minHeight: '100%' }}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getSlashMenuItems}
        suggestionMenuComponent={CompactSuggestionMenu}
      />
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={getNodeMentionItems}
        suggestionMenuComponent={CompactSuggestionMenu}
      />
    </BlockNoteView>
  )
}

// ── Container — handles async content loading ─────────────────────────────────

interface Props {
  docRef: DocumentRef
  onClose: () => void
}

export function ContentEditor({ docRef, onClose }: Props) {
  const docId = documentRefToId(docRef)
  const node = useGraphStore((s) =>
    docRef.kind === 'node' ? s.nodes[docRef.nodeId] : undefined,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialContent, setInitialContent] = useState<any[] | undefined>(
    undefined,
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setInitialContent(undefined)
    // Already in memory (edited this session)?
    const cached = contentMap.get(docId)
    if (cached) {
      setInitialContent(cached as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
      setLoaded(true)
      return
    }
    // Stored in the ZIP from a previous session?
    const hasStoredContent = docRef.kind === 'case' || node?.hasContent
    if (hasStoredContent) {
      const blob = getCurrentFileBlob()
      if (blob) {
        loadNodeContent(blob, docId)
          .then((doc) => {
            if (Array.isArray(doc) && doc.length) {
              contentMap.set(docId, doc)
              setInitialContent(doc as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
            }
          })
          .catch(() => {
            /* start fresh */
          })
          .finally(() => setLoaded(true))
        return
      }
    }
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  // Dismiss on Escape — but not while a dialog (e.g. Settings, opened from
  // this editor's own header) is on top of it; let that close first.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-slot="dialog-content"]')) onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Document breadcrumb — only for a per-node document, since the main
          toolbar's "Notes" button already shows Case Notes is active. No
          close/settings/play controls here: the main toolbar (always
          visible now) already has them, so there's a single nav, not two. */}
      {docRef.kind === 'node' && (
        <div className="flex items-center gap-2 bg-card px-4 border-border border-b h-8 shrink-0">
          <BookOpen size={12} className="text-primary" />
          <span className="font-medium text-foreground text-[12px] truncate">
            {node?.label}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            · document
          </span>
        </div>
      )}

      {/* Editor area */}
      {!loaded ? (
        <div className="flex flex-1 justify-center items-center gap-2 text-muted-foreground/70">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto px-4 py-10 max-w-3xl">
            <EditorInner
              key={docId}
              docId={docId}
              initialContent={initialContent}
            />
          </div>
        </div>
      )}
    </div>
  )
}
