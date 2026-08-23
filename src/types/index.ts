import type { PlayingCard } from '../game/types';

export type NodeId = string;
export type EdgeId = string;
export type AssetId = string;

// Pseudo node-id for the case-wide Case Notes document — reuses the same
// content/<id>.json storage slot as per-node documents so the writer/reader
// and contentMap/contentDirty machinery need no changes for it.
export const CASE_NOTES_ID = '__case_notes__';

// Identifies which BlockNote document is open in the editor overlay.
export type DocumentRef = { kind: 'node'; nodeId: NodeId } | { kind: 'case' };

export function documentRefToId(ref: DocumentRef): string {
  return ref.kind === 'case' ? CASE_NOTES_ID : ref.nodeId;
}

export type NodeType =
  | 'person'
  | 'organization'
  | 'location'
  | 'object'
  | 'event'
  | 'document'
  | 'fieldnote'
  | 'clue'
  | 'truth'
  | 'threat';

export interface NodeAttachment {
  id: AssetId;
  filename: string;
  size: number;
  mimeType: string;
}

export interface NodeLocation {
  lat: number;
  lng: number;
  label?: string;
}

// Metadata carried by `clue`/`truth`/`threat` typed nodes, mirroring the
// mechanical state in mysteryStore. These are populated by the "add to
// board" bridging actions rather than free-hand edited.
export interface ClueNodeMeta {
  rank: string; // 'A'-'10'
  status: 'established' | 'strengthened' | 'truth' | 'falseLead';
  cards?: PlayingCard[]; // every literal card drawn into this clue set, oldest first
}

// Reads a clue's cards, tolerating cases saved before `cards` replaced the
// older single `card` field — so nodes created before that change still
// show their card instead of going blank.
export function clueCardsOf(clue: ClueNodeMeta | undefined): PlayingCard[] {
  if (!clue) return [];
  if (clue.cards) return clue.cards;
  const legacyCard = (clue as ClueNodeMeta & { card?: PlayingCard }).card;
  return legacyCard ? [legacyCard] : [];
}

export interface TruthNodeMeta {
  connection: string; // "what connection confirms this truth" — captured during the Truth scene
  card?: PlayingCard; // the literal truth card drawn for this connection, once known
}

export interface ThreatNodeMeta {
  threatId?: string; // links back to mysteryStore.threats[] so edits stay in sync
  level: 1 | 2 | 3;
  kind: 'threat' | 'rival';
  defeated: boolean;
}

export interface GraphNode {
  id: NodeId;
  label: string;
  summary?: string;
  notes?: string;
  tags: string[];
  thumbnail?: AssetId;
  location?: NodeLocation;
  featureDisplay?: 'image' | 'map';   // which feature shows on the card when both exist
  nodeType?: NodeType;
  clue?: ClueNodeMeta;
  truth?: TruthNodeMeta;
  threat?: ThreatNodeMeta;
  attachments?: NodeAttachment[];
  hasContent: boolean;          // true when a BlockNote doc exists in content/<id>.json
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface GraphState {
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasState {
  positions: Record<NodeId, CanvasPosition>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  pinnedNodes: Set<NodeId>;
}

export interface CaseManifest {
  id: string; // stable identity for the Case Files list — survives handle/IDB loss
  version: number;
  title: string;
  created: string;
  modified: string;
}

// Per-case settings, stored in settings.json inside the .citr file (unlike
// the device-level display prefs in settingsStore, which live in localStorage).
export interface CaseSettings {
  /** Asset id (under assets/) of the custom single-image map, when the map
   *  style is set to 'image'. Its own natural pixel size, needed to size the
   *  Leaflet image overlay and to convert node pin coordinates to percentages. */
  mapImageAssetId?: string;
  mapImageWidth?: number;
  mapImageHeight?: number;
}

export const DEFAULT_CASE_SETTINGS: CaseSettings = {};

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface FileState {
  handle: FileSystemFileHandle | null;
  filename: string;
  saveStatus: SaveStatus;
  lastSaved: string | null;
}
