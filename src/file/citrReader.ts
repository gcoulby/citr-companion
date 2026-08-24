import JSZip from 'jszip'
import type {
  GraphNode,
  GraphEdge,
  NodeId,
  EdgeId,
  CaseManifest,
  CaseSettings,
  PdfEmbed,
} from '../types'
import { DEFAULT_CASE_SETTINGS, CASE_NOTES_ID } from '../types'
import type { Investigator, Mystery } from '../game/types'
import { deobfuscate } from '../lib/obfuscate'
import { extractMentionedNodeIds } from '../lib/backlinks'
import { mimeFromExt } from '../lib/mime'

export interface LoadedAsset {
  buffer: ArrayBuffer
  mimeType: string
}

function emptyInvestigator(): Investigator {
  return {
    name: '',
    trait: '',
    attributes: { power: 0, insight: 0, method: 0 },
    struckAttributes: [],
    fatigue: 0,
    obligations: [],
    keywords: [],
    experiencePoints: 0,
  }
}

function emptyMystery(): Mystery {
  return {
    problem: { location: '', object: '', treachery: '' },
    motivation: '',
    danger: 0,
    day: 1,
    clockMarks: 0,
    clueSets: {},
    threats: [],
    scene: { active: false, stage: 'discovery', threatIds: [] },
    clueDeck: [],
    clueDiscard: [],
    truthDeck: [],
    truthDiscard: [],
    sealed: [],
    guesses: [],
    revealed: false,
    correctGuessCount: null,
    resolved: false,
    started: false,
    lingeringQuestion: '',
    log: [],
  }
}

export interface CitrData {
  manifest: CaseManifest
  nodes: Record<NodeId, GraphNode>
  edges: Record<EdgeId, GraphEdge>
  positions: Record<NodeId, { x: number; y: number }>
  viewport: { x: number; y: number; zoom: number }
  layout: 'freeform' | 'dagre' | 'force'
  assets: Record<string, LoadedAsset> // key = assetId (filename under assets/)
  settings: CaseSettings
  pdfEmbeds: PdfEmbed[]
  investigator: Investigator
  mystery: Mystery
  // nodeId -> ids of documents (node docs or CASE_NOTES_ID) that @-mention it,
  // seeded eagerly from every content/*.json blob so backlinks are correct
  // even for documents not opened this session.
  backlinks: Record<NodeId, string[]>
}

export async function readCitr(file: File | Blob): Promise<CitrData> {
  const zip = await JSZip.loadAsync(file)

  const manifestRaw = await zip.file('manifest.json')?.async('string')
  if (!manifestRaw) throw new Error('Invalid .citr: missing manifest.json')
  const manifest: CaseManifest = JSON.parse(manifestRaw) as CaseManifest

  const graphRaw = await zip.file('graph.json')?.async('string')
  let nodes: Record<NodeId, GraphNode> = {}
  let edges: Record<EdgeId, GraphEdge> = {}
  if (graphRaw) {
    const graph = JSON.parse(graphRaw) as {
      nodes: GraphNode[]
      edges: GraphEdge[]
    }
    nodes = Object.fromEntries((graph.nodes ?? []).map((n) => [n.id, n]))
    edges = Object.fromEntries((graph.edges ?? []).map((e) => [e.id, e]))
  }

  const canvasRaw = await zip.file('canvas.json')?.async('string')
  let positions: Record<NodeId, { x: number; y: number }> = {}
  let viewport = { x: 0, y: 0, zoom: 1 }
  let layout: 'freeform' | 'dagre' | 'force' = 'freeform'
  if (canvasRaw) {
    const canvas = JSON.parse(canvasRaw) as {
      positions?: Record<NodeId, { x: number; y: number }>
      viewport?: { x: number; y: number; zoom: number }
      layout?: 'freeform' | 'dagre' | 'force'
    }
    positions = canvas.positions ?? {}
    viewport = canvas.viewport ?? viewport
    layout = canvas.layout ?? 'freeform'
  }

  // Load all assets eagerly — they're usually small (thumbnails, attachments)
  const assets: Record<string, LoadedAsset> = {}
  const assetEntries = Object.entries(zip.files).filter(
    ([path]) => path.startsWith('assets/') && !path.endsWith('/'),
  )
  await Promise.all(
    assetEntries.map(async ([path, entry]) => {
      const filename = path.slice('assets/'.length)
      const ext = filename.split('.').pop() ?? ''
      const buffer = await entry.async('arraybuffer')
      assets[filename] = { buffer, mimeType: mimeFromExt(ext) }
    }),
  )

  const settingsRaw = await zip.file('settings.json')?.async('string')
  const settings: CaseSettings = {
    ...DEFAULT_CASE_SETTINGS,
    ...(settingsRaw ? (JSON.parse(settingsRaw) as Partial<CaseSettings>) : {}),
  }

  const pdfsRaw = await zip.file('pdfs.json')?.async('string')
  const pdfEmbeds: PdfEmbed[] = pdfsRaw
    ? (JSON.parse(pdfsRaw) as PdfEmbed[])
    : []

  const investigatorRaw = await zip.file('investigator.json')?.async('string')
  const investigator: Investigator = investigatorRaw
    ? {
        ...emptyInvestigator(),
        ...(JSON.parse(investigatorRaw) as Partial<Investigator>),
      }
    : emptyInvestigator()

  const mysteryRaw = await zip.file('mystery.json')?.async('string')
  const mysteryBase: Mystery = mysteryRaw
    ? { ...emptyMystery(), ...(JSON.parse(mysteryRaw) as Partial<Mystery>) }
    : emptyMystery()

  const decksRaw = await zip.file('decks.json')?.async('string')
  let mystery = mysteryBase
  if (decksRaw) {
    try {
      const decks =
        deobfuscate<
          Pick<
            Mystery,
            | 'clueDeck'
            | 'clueDiscard'
            | 'truthDeck'
            | 'truthDiscard'
            | 'sealed'
            | 'guesses'
            | 'revealed'
            | 'correctGuessCount'
          >
        >(decksRaw)
      mystery = { ...mysteryBase, ...decks }
      console.log('Mystery', mystery)
    } catch {
      // corrupt/foreign decks.json — fall back to an un-started mystery's empty deck state
    }
  }

  // Eager backlinks scan — cheap (JSON parse only, no editor instantiation)
  const backlinks: Record<NodeId, string[]> = {}
  const contentDocIds = [
    CASE_NOTES_ID,
    ...Object.values(nodes)
      .filter((n) => n.hasContent)
      .map((n) => n.id),
  ]
  await Promise.all(
    contentDocIds.map(async (docId) => {
      const raw = await zip.file(`content/${docId}.json`)?.async('string')
      if (!raw) return
      try {
        const blocks = JSON.parse(raw) as unknown
        for (const mentionedId of extractMentionedNodeIds(blocks)) {
          backlinks[mentionedId] = [...(backlinks[mentionedId] ?? []), docId]
        }
      } catch {
        // corrupt content blob — skip, ContentEditor will surface it on open
      }
    }),
  )

  return {
    manifest,
    nodes,
    edges,
    positions,
    viewport,
    layout,
    assets,
    settings,
    pdfEmbeds,
    investigator,
    mystery,
    backlinks,
  }
}

export async function loadNodeContent(
  file: File | Blob,
  nodeId: NodeId,
): Promise<unknown> {
  const zip = await JSZip.loadAsync(file)
  const raw = await zip.file(`content/${nodeId}.json`)?.async('string')
  return raw ? (JSON.parse(raw) as unknown) : null
}
