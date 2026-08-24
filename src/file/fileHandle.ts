export const hasFileSystemAccess = (): boolean =>
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

// ── IndexedDB persistence for FileSystemFileHandle ──────────────────────────

const IDB_NAME = 'citr-companion-v1';
const IDB_STORE = 'handles';
const IDB_CASES_STORE = 'cases';
const IDB_BLOBS_STORE = 'caseBlobs';
const IDB_PDFS_STORE = 'pdfBlobs';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 4);
    req.onupgradeneeded = (e) => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      if (e.oldVersion < 2 && !req.result.objectStoreNames.contains(IDB_CASES_STORE)) {
        req.result.createObjectStore(IDB_CASES_STORE, { keyPath: 'id' });
      }
      if (e.oldVersion < 3 && !req.result.objectStoreNames.contains(IDB_BLOBS_STORE)) {
        req.result.createObjectStore(IDB_BLOBS_STORE);
      }
      if (e.oldVersion < 4 && !req.result.objectStoreNames.contains(IDB_PDFS_STORE)) {
        req.result.createObjectStore(IDB_PDFS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Recent Case Files list ──────────────────────────────────────────────────
// Each remembered case is either a FileSystemFileHandle (structured-clone-safe,
// desktop Chrome/Edge) or a case whose whole .citr blob is stored directly in
// IndexedDB — the latter is how cases persist on browsers without the File
// System Access API (Safari, mobile), where the alternative is re-downloading
// the file on every save. Removing an entry never touches a file on disk, but
// does delete the IDB-stored blob for 'idb' entries since that *is* the case.

export type CaseStorage = 'handle' | 'idb';

export interface CaseEntry {
  id: string;
  title: string;
  handle: FileSystemFileHandle | null;
  storage: CaseStorage;
  created: string;
  modified: string;
}

export async function listCases(): Promise<CaseEntry[]> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_CASES_STORE, 'readonly');
      const req = tx.objectStore(IDB_CASES_STORE).getAll();
      req.onsuccess = () => resolve((req.result as CaseEntry[]).sort((a, b) => b.modified.localeCompare(a.modified)));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function upsertCaseEntry(entry: CaseEntry): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CASES_STORE, 'readwrite');
    tx.objectStore(IDB_CASES_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeCaseEntry(id: string): Promise<void> {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_CASES_STORE, 'readwrite');
    tx.objectStore(IDB_CASES_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await deleteCaseBlobFromIDB(id);
}

// ── IDB-stored case blobs (the whole .citr, for browsers without real files) ─

export async function saveCaseBlobToIDB(id: string, blob: Blob): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_BLOBS_STORE, 'readwrite');
    tx.objectStore(IDB_BLOBS_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCaseBlobFromIDB(id: string): Promise<Blob | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_BLOBS_STORE, 'readonly');
    const req = tx.objectStore(IDB_BLOBS_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCaseBlobFromIDB(id: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_BLOBS_STORE, 'readwrite');
      tx.objectStore(IDB_BLOBS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// ── IDB-stored PDF binaries (kept out of the .citr file entirely) ────────────
// Imported PDFs (rulebooks, handouts) are saved here, keyed by assetId, so
// that sharing/exporting a .citr case never bundles the PDF along with it —
// see PdfEmbed / usePdfImport for why that separation matters.

export async function savePdfBlobToIDB(assetId: string, buffer: ArrayBuffer): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_PDFS_STORE, 'readwrite');
    tx.objectStore(IDB_PDFS_STORE).put(buffer, assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPdfBlobFromIDB(assetId: string): Promise<ArrayBuffer | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_PDFS_STORE, 'readonly');
    const req = tx.objectStore(IDB_PDFS_STORE).get(assetId);
    req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePdfBlobFromIDB(assetId: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_PDFS_STORE, 'readwrite');
      tx.objectStore(IDB_PDFS_STORE).delete(assetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function saveHandleToIDB(handle: FileSystemFileHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, 'lastHandle');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHandleFromIDB(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('lastHandle');
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete('lastHandle');
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function openCitrFile(): Promise<{ handle: FileSystemFileHandle | null; file: File }> {
  if (hasFileSystemAccess()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'Caught in the Rain Case', accept: { 'application/zip': ['.citr'] } }],
      multiple: false,
    });
    const file = await handle.getFile();
    return { handle, file };
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.citr';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('No file selected')); return; }
        resolve({ handle: null, file });
      };
      input.click();
    });
  }
}

export async function createCitrFile(title: string): Promise<{ handle: FileSystemFileHandle | null; filename: string }> {
  const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.citr`;
  if (hasFileSystemAccess()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'Caught in the Rain Case', accept: { 'application/zip': ['.citr'] } }],
    });
    return { handle, filename: handle.name };
  }
  return { handle: null, filename };
}

export async function writeCitrFile(handle: FileSystemFileHandle, data: Blob): Promise<void> {
  // queryPermission/requestPermission are part of the File System Access API
  // but not yet in all TypeScript DOM lib versions; cast to access them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  if (typeof h.queryPermission === 'function') {
    const perm = await h.queryPermission({ mode: 'readwrite' }) as string;
    if (perm !== 'granted') {
      const req = await h.requestPermission({ mode: 'readwrite' }) as string;
      if (req !== 'granted') throw new Error('Write permission denied');
    }
  }
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
