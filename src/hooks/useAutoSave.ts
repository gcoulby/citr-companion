import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useCanvasStore } from '../store/canvasStore';
import { useFileStore } from '../store/fileStore';
import { useInvestigatorStore } from '../store/investigatorStore';
import { useMysteryStore } from '../store/mysteryStore';
import { useCaseSettingsStore } from '../store/caseSettingsStore';
import { writeCitr } from '../file/citrWriter';
import { writeCitrFile, downloadBlob, upsertCaseEntry, saveCaseBlobToIDB } from '../file/fileHandle';
import { encryptBlob } from '../lib/crypto';
import type { CaseManifest, GraphState, CanvasState } from '../types';
import type { Investigator, Mystery } from '../game/types';

const DEBOUNCE_MS = 1500;

// Asset map lives outside Zustand
export const assetMap = new Map<string, ArrayBuffer>();
export const contentMap = new Map<string, unknown>();
export const contentDirty = new Set<string>();

let currentFileBlob: Blob | null = null;
export function setCurrentFileBlob(blob: Blob) { currentFileBlob = blob; }
export function getCurrentFileBlob() { return currentFileBlob; }

// ── Shared write logic ────────────────────────────────────────────────────────

async function performSave(
  handle: FileSystemFileHandle | null,
  filename: string,
  manifest: CaseManifest,
  nodes: GraphState['nodes'],
  edges: GraphState['edges'],
  positions: Record<string, { x: number; y: number }>,
  viewport: { x: number; y: number; zoom: number },
  layout: CanvasState['layout'],
  investigator: Investigator,
  mystery: Mystery,
): Promise<void> {
  const { setSaveStatus, setLastSaved, passphrase, storageMode } = useFileStore.getState();
  const blob = await writeCitr({
    manifest, nodes, edges, positions, viewport, layout, investigator, mystery,
    existingFile: currentFileBlob, contentDirty, contentMap, assetMap,
    settings: useCaseSettingsStore.getState().settings,
  });

  // Keep the unencrypted blob in memory for future merges
  currentFileBlob = blob;
  contentDirty.clear();

  // Encrypt before writing to disk if a passphrase is active
  const diskBlob = passphrase ? await encryptBlob(blob, passphrase) : blob;

  const savedAt = new Date().toISOString();
  if (handle) {
    await writeCitrFile(handle, diskBlob);
    if (manifest.id) {
      void upsertCaseEntry({ id: manifest.id, title: manifest.title, handle, storage: 'handle', created: manifest.created, modified: savedAt });
    }
  } else if (storageMode === 'idb' && manifest.id) {
    await saveCaseBlobToIDB(manifest.id, diskBlob);
    void upsertCaseEntry({ id: manifest.id, title: manifest.title, handle: null, storage: 'idb', created: manifest.created, modified: savedAt });
  } else {
    downloadBlob(diskBlob, filename);
  }

  setSaveStatus('saved');
  setLastSaved(savedAt);
}

// ── Imperative save (bypasses debounce) ───────────────────────────────────────

export async function saveNow(): Promise<void> {
  const { nodes, edges } = useGraphStore.getState();
  const { positions, viewport, layout } = useCanvasStore.getState();
  const { handle, filename, manifest, setSaveStatus } = useFileStore.getState();
  const investigator = useInvestigatorStore.getState();
  const mystery = useMysteryStore.getState();
  if (!manifest) return;
  setSaveStatus('saving');
  try {
    await performSave(handle, filename, manifest, nodes, edges, positions, viewport, layout, investigator, mystery);
  } catch (err) {
    console.error('saveNow failed', err);
    setSaveStatus('error');
  }
}

// ── Debounced auto-save hook ───────────────────────────────────────────────────

export function useAutoSave() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const positions = useCanvasStore((s) => s.positions);
  const viewport = useCanvasStore((s) => s.viewport);
  const layout = useCanvasStore((s) => s.layout);
  const investigator = useInvestigatorStore();
  const mystery = useMysteryStore();
  const caseSettings = useCaseSettingsStore((s) => s.settings);
  const { handle, filename, manifest, setSaveStatus, contentRevision } = useFileStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!manifest) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setSaveStatus('unsaved');
    timerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      void (async () => {
        try {
          await performSave(handle, filename, manifest, nodes, edges, positions, viewport, layout, investigator, mystery);
        } catch (err) {
          console.error('Auto-save failed', err);
          setSaveStatus('error');
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, positions, viewport, layout, investigator, mystery, contentRevision, caseSettings]);
}
