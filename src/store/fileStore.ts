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
  setHandle: (handle: FileSystemFileHandle | null, filename: string, storageMode: CaseStorage) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSaved: (ts: string) => void;
  setManifest: (manifest: CaseManifest) => void;
  setEncryption: (isEncrypted: boolean, passphrase: string | null) => void;
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

  setHandle: (handle, filename, storageMode) => set({ handle, filename, storageMode }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
  setManifest: (manifest) => set({ manifest }),
  setEncryption: (isEncrypted, passphrase) => set({ isEncrypted, passphrase }),
  reset: () => set({ handle: null, filename: '', storageMode: 'handle', saveStatus: 'saved', lastSaved: null, manifest: null, isEncrypted: false, passphrase: null }),
}));
