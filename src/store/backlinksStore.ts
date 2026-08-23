import { create } from 'zustand';
import type { NodeId } from '../types';
import { extractMentionedNodeIds } from '../lib/backlinks';

export interface BacklinkRef {
  docId: string; // CASE_NOTES_ID or a source node's id
}

interface BacklinksState {
  // nodeId -> docs that mention it
  index: Record<NodeId, BacklinkRef[]>;
  // Rebuilds one document's contribution to the index from its current
  // block content. Called on every editor.onChange, and once per document
  // at file-load time (see citrReader's eager scan).
  setDocMentions: (docId: string, blocks: unknown) => void;
  removeDoc: (docId: string) => void;
  // Replaces the whole index — used to seed it from citrReader's eager scan on file load.
  seed: (raw: Record<NodeId, string[]>) => void;
  reset: () => void;
}

function withoutDoc(index: Record<NodeId, BacklinkRef[]>, docId: string): Record<NodeId, BacklinkRef[]> {
  const next: Record<NodeId, BacklinkRef[]> = {};
  for (const [nodeId, refs] of Object.entries(index)) {
    const filtered = refs.filter((r) => r.docId !== docId);
    if (filtered.length) next[nodeId] = filtered;
  }
  return next;
}

export const useBacklinksStore = create<BacklinksState>((set) => ({
  index: {},

  setDocMentions: (docId, blocks) => set((s) => {
    const cleared = withoutDoc(s.index, docId);
    const mentioned = extractMentionedNodeIds(blocks);
    for (const nodeId of mentioned) {
      cleared[nodeId] = [...(cleared[nodeId] ?? []), { docId }];
    }
    return { index: cleared };
  }),

  removeDoc: (docId) => set((s) => ({ index: withoutDoc(s.index, docId) })),

  seed: (raw) => set({
    index: Object.fromEntries(
      Object.entries(raw).map(([nodeId, docIds]) => [nodeId, docIds.map((docId) => ({ docId }))])
    ),
  }),

  reset: () => set({ index: {} }),
}));
