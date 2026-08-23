import { create } from 'zustand';
import type { SaveStatus, CaseManifest } from '../types';
import type { CaseStorage } from '../file/fileHandle';

interface FileStoreState {
  handle: FileSystemFileHandle | null;
  filename: string;
  /** Where this case is persisted: a real file handle, or an IndexedDB blob
   *  (the fallback used automatically wherever the File System Access API
   *  isn't available, e.g. Safari/mobile, so saves don't require re-downloading). */
  storageMode: CaseStorage;
  saveStatus: SaveStatus;
  lastSaved: string | null;
  manifest: CaseManifest | null;
  isEncrypted: boolean;
  passphrase: string | null;
  // Bumped on every BlockNote document edit (Case Notes or a node's own
  // document). contentMap/contentDirty live outside Zustand for perf, so
  // useAutoSave — which only watches store state — needs this counter to
  // notice content-only edits and actually schedule a save for them.
  contentRevision: number;
  setHandle: (handle: FileSystemFileHandle | null, filename: string, storageMode: CaseStorage) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSaved: (ts: string) => void;
  setManifest: (manifest: CaseManifest) => void;
  setEncryption: (isEncrypted: boolean, passphrase: string | null) => void;
  bumpContentRevision: () => void;
  reset: () => void;
}

export const useFileStore = create<FileStoreState>((set) => ({
  handle: null,
  filename: '',
  storageMode: 'handle',
  saveStatus: 'saved',
  lastSaved: null,
  manifest: null,
  isEncrypted: false,
  passphrase: null,
  contentRevision: 0,

  setHandle: (handle, filename, storageMode) => set({ handle, filename, storageMode }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
  setManifest: (manifest) => set({ manifest }),
  setEncryption: (isEncrypted, passphrase) => set({ isEncrypted, passphrase }),
  bumpContentRevision: () => set((s) => ({ contentRevision: s.contentRevision + 1 })),
  reset: () => set({ handle: null, filename: '', storageMode: 'handle', saveStatus: 'saved', lastSaved: null, manifest: null, isEncrypted: false, passphrase: null, contentRevision: 0 }),
}));
