// Pushes a scene's outcome into Case Notes ("Field Notes" in the rulebook's
// language) from outside the BlockNote editor — the Scene tab is a different
// top-level view than Notes (see App.tsx's mutually-exclusive view chain), so
// there is never a mounted editor instance to insert into directly. Instead
// this reads/writes the exact same module-level caches ContentEditor itself
// reads on mount (`contentMap`/`contentDirty` in useAutoSave.ts), so opening
// Case Notes afterward picks the appended block up as if it had always been
// there. This assumption — Scene and Notes never mounted at once — is
// load-bearing; if that ever changes, a live editor handle would be needed
// instead of writing straight to the cache.

import { contentMap, contentDirty, getCurrentFileBlob } from '../hooks/useAutoSave';
import { loadNodeContent } from '../file/citrReader';
import { CASE_NOTES_ID } from '../types';
import { useFileStore } from '../store/fileStore';
import { useMysteryStore } from '../store/mysteryStore';
import { captureSnapshot } from '../components/editor/blocks/snapshotBlock';
import type { SceneType, InvestigationStageOrNone } from '../components/editor/blocks/sceneBlock';
import type { TruthRecordPayload } from '../components/editor/blocks/truthRecordBlock';
import type { InvestigationRecordPayload } from '../components/editor/blocks/investigationRecordBlock';

export interface SceneNoteEntry {
  sceneType: SceneType;
  stage?: InvestigationStageOrNone;
  text: string;
  /** Investigation scenes only — attaches a stamped snapshot block (day/
   *  danger/clock/threats) alongside the free text, per the spec's request
   *  for a structured summary on top of the narrative. */
  includeSnapshot?: boolean;
  /** Truth scenes only — attaches a card-visual record (clue cards, drawn
   *  truth cards, and each card's own note) so Field Notes stays scannable
   *  by card instead of only a paragraph describing them. */
  truthRecord?: TruthRecordPayload;
  /** Investigation scenes only — the stage-by-stage breakdown, rendered as
   *  its own block instead of a flat text dump behind a single stage
   *  dropdown that could only ever describe where the scene ended. When
   *  present, this replaces the generic `scene` block's free-text content. */
  investigationRecord?: InvestigationRecordPayload;
}

export async function appendSceneBlockToCaseNotes(entry: SceneNoteEntry): Promise<void> {
  const m = useMysteryStore.getState();

  let existing = contentMap.get(CASE_NOTES_ID) as unknown[] | undefined;
  if (!existing) {
    const blob = getCurrentFileBlob();
    if (blob) {
      try {
        const doc = await loadNodeContent(blob, CASE_NOTES_ID);
        if (Array.isArray(doc)) existing = doc;
      } catch {
        // No prior Case Notes content — start fresh.
      }
    }
  }

  const blocks: unknown[] = [...(existing ?? [])];

  const text = entry.text.trim();
  const hasStructuredRecord = !!entry.investigationRecord;

  blocks.push({
    type: 'scene',
    props: {
      sceneType: entry.sceneType,
      // The structured investigationRecord block already states where the
      // scene ended in its own header — showing it again here as a badge
      // would just be a duplicate.
      stage: hasStructuredRecord ? '' : (entry.stage ?? ''),
      day: m.day,
      danger: m.danger,
    },
    // When a structured investigationRecord block follows, the free text
    // moves to its own paragraph below it instead of living inside the
    // header block's content.
    content: !hasStructuredRecord && text ? [{ type: 'text', text, styles: {} }] : undefined,
  });

  if (entry.investigationRecord) {
    blocks.push({ type: 'investigationRecord', props: { data: JSON.stringify(entry.investigationRecord) } });
    if (text) {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] });
    }
  }

  if (entry.includeSnapshot) {
    blocks.push({ type: 'snapshot', props: { data: JSON.stringify(captureSnapshot()) } });
  }

  if (entry.truthRecord) {
    blocks.push({ type: 'truthRecord', props: { data: JSON.stringify(entry.truthRecord) } });
  }

  contentMap.set(CASE_NOTES_ID, blocks);
  contentDirty.add(CASE_NOTES_ID);
  useFileStore.getState().bumpContentRevision();
}
