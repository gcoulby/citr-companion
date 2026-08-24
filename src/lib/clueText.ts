// A clue's text has exactly one owner: its board node's `summary`, once a
// node exists — which is now immediate, every drawn clue creates one (see
// mysteryStore's drawClueCard). Every place that shows or edits "what is
// this clue?" reads and writes through here so the clue-set panel, the
// drawn-card preview, and the board node's own editor can never drift into
// two different descriptions of the same clue. Before a node exists (or on
// old save data that predates auto-add), it falls back to the clue set's
// own `description` field.
import { useGraphStore } from '../store/graphStore';
import { useMysteryStore } from '../store/mysteryStore';
import type { ClueSet } from '../game/types';

export function useClueText(cs: ClueSet): string {
  const node = useGraphStore((s) => (cs.boardNodeId ? s.nodes[cs.boardNodeId] : undefined));
  return node ? (node.summary ?? '') : cs.description;
}

export function setClueText(cs: ClueSet, text: string): void {
  if (cs.boardNodeId) {
    useGraphStore.getState().updateNode(cs.boardNodeId, { summary: text });
  } else {
    useMysteryStore.getState().setClueDescription(cs.rank, text);
  }
}
