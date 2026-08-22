import { useState, useCallback, useEffect } from 'react';
import { useGraphStore } from './store/graphStore';
import { useCanvasStore } from './store/canvasStore';
import { useFileStore } from './store/fileStore';
import { useInvestigatorStore } from './store/investigatorStore';
import { useMysteryStore } from './store/mysteryStore';
import { useApplyTheme } from './hooks/useApplyTheme';
import { Button } from './components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Separator } from './components/ui/separator';
import { SidebarProvider } from './components/ui/sidebar';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import {
  openCitrFile,
  createCitrFile,
  writeCitrFile,
  downloadBlob,
  saveHandleToIDB,
  saveCaseBlobToIDB,
  getCaseBlobFromIDB,
  listCases,
  upsertCaseEntry,
  removeCaseEntry,
  type CaseEntry,
  type CaseStorage,
} from './file/fileHandle';
import { readCitr } from './file/citrReader';
import { writeCitr } from './file/citrWriter';
import { isEncryptedBuffer, decryptBlob, encryptBlob } from './lib/crypto';
import { nanoid } from 'nanoid';
import { OpenOrCreateDialog } from './components/dialogs/OpenOrCreateDialog';
import { CaseFilesScreen } from './components/dialogs/CaseFilesScreen';
import { PasswordDialog } from './components/dialogs/PasswordDialog';
import { NewNodeDialog } from './components/dialogs/NewNodeDialog';
import { EdgeDialog } from './components/dialogs/EdgeDialog';
import { InfoPanel } from './components/dialogs/InfoPanel';
import { FileExplorer } from './components/dialogs/FileExplorer';
import { ContentEditor } from './components/editor/ContentEditor';
import { CaseBoard } from './components/canvas/CaseBoard';
import { ContextMenu, type ContextMenuItem } from './components/canvas/ContextMenu';
import { NodePanel } from './components/panels/NodePanel';
import { SidebarPanel } from './components/panels/SidebarPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { useAutoSave, setCurrentFileBlob, getCurrentFileBlob, assetMap } from './hooks/useAutoSave';
import { useLayout } from './hooks/useLayout';
import { cacheAsset } from './lib/assetCache';
import {
  Network,
  GitFork,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Pencil,
  Trash2,
  Plus,
  Maximize2,
  Copy,
  HelpCircle,
  Layers2,
  Archive,
  Lock,
  Dices,
  Settings,
  FolderClosed,
  Download,
} from 'lucide-react';
import type { CaseManifest, NodeType } from './types';
import { PlayPanel } from './components/play/PlayPanel';

// ── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator() {
  const saveStatus  = useFileStore((s) => s.saveStatus);
  const isEncrypted = useFileStore((s) => s.isEncrypted);
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono">
      {isEncrypted && (
        <span title="File is encrypted"><Lock size={11} className="text-primary/70" /></span>
      )}
      {saveStatus === 'saving' && (
        <><Loader2 size={12} className="animate-spin text-primary" /><span className="text-primary">saving…</span></>
      )}
      {saveStatus === 'saved' && (
        <><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-muted-foreground">saved</span></>
      )}
      {saveStatus === 'unsaved' && (
        <><Clock size={12} className="text-muted-foreground" /><span className="text-muted-foreground">unsaved</span></>
      )}
      {saveStatus === 'error' && (
        <><AlertCircle size={12} className="text-destructive" /><span className="text-destructive">error</span></>
      )}
    </div>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  onSearch: () => void;
  onDagre: () => void;
  onForce: () => void;
  onFitView: () => void;
  onInfo: () => void;
  onFiles: () => void;
  onPlay: () => void;
  onSettings: () => void;
  onCloseCase: () => void;
  onExport: () => void;
}

function ToolbarButton({ onClick, title, icon, label }: { onClick: () => void; title: string; icon: React.ReactNode; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size={label ? 'sm' : 'icon-sm'} onClick={onClick} className="text-muted-foreground hover:text-primary">
          {icon}{label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function Toolbar({ onSearch, onDagre, onForce, onFitView, onInfo, onFiles, onPlay, onSettings, onCloseCase, onExport }: ToolbarProps) {
  const manifest = useFileStore((s) => s.manifest);
  const storageMode = useFileStore((s) => s.storageMode);
  return (
    <div className="h-10 bg-card border-b border-border flex items-center px-4 gap-1.5 shrink-0">
      <span className="font-display text-[13px] tracking-wide text-foreground mr-2 truncate max-w-60">
        {manifest?.title ?? 'Caught in the Rain'}
      </span>
      <Separator orientation="vertical" className="h-4" />
      <ToolbarButton onClick={onDagre} title="Dagre layout" icon={<GitFork size={12} />} label="Dagre" />
      <ToolbarButton onClick={onForce} title="Force layout" icon={<Network size={12} />} label="Force" />
      <ToolbarButton onClick={onFitView} title="Fit view" icon={<Maximize2 size={12} />} label="Fit" />
      <Separator orientation="vertical" className="h-4" />
      <ToolbarButton onClick={onSearch} title="Search  Ctrl+K" icon={<Search size={12} />} label="Search" />
      <ToolbarButton onClick={onFiles} title="Browse archive" icon={<Archive size={12} />} label="Files" />
      <ToolbarButton onClick={onPlay} title="Play — investigator, mystery, dice & oracles" icon={<Dices size={12} />} label="Play" />
      <div className="flex-1" />
      {storageMode === 'idb' && (
        <ToolbarButton onClick={onExport} title="Stored in browser storage — export a .citr file" icon={<Download size={12} />} label="Export" />
      )}
      <SaveIndicator />
      <Separator orientation="vertical" className="h-4 ml-2" />
      <ToolbarButton onClick={onSettings} title="Settings — theme" icon={<Settings size={14} />} />
      <ToolbarButton onClick={onInfo} title="About Caught in the Rain" icon={<HelpCircle size={14} />} />
      <ToolbarButton onClick={onCloseCase} title="Close case — return to Case Files" icon={<FolderClosed size={14} />} />
    </div>
  );
}

// ── Context menu state ────────────────────────────────────────────────────────

interface CtxMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

// ── Pending edge ──────────────────────────────────────────────────────────────
// When dragging an edge to empty canvas, we store the origin node so we can
// create the edge after the user names the new node.

let _pendingEdgeSource: string | null = null;

// ── Main app ──────────────────────────────────────────────────────────────────

function AppInner() {
  useApplyTheme();
  const { setHandle, setManifest, setSaveStatus, setLastSaved, setEncryption } = useFileStore();
  const { loadGraph, nodes, addNode, deleteNode } = useGraphStore();
  const { loadCanvas, setPosition } = useCanvasStore();
  const loadInvestigator = useInvestigatorStore((s) => s.load);
  const resetInvestigator = useInvestigatorStore((s) => s.reset);
  const loadMystery = useMysteryStore((s) => s.load);
  const resetMystery = useMysteryStore((s) => s.reset);

  const [isOpen, setIsOpen] = useState(false);
  const [cases, setCases] = useState<CaseEntry[]>([]);
  const [createFlow, setCreateFlow] = useState<'choose' | 'create' | null>(null);

  // Encrypted-file unlock flow
  const [pendingEncBlob, setPendingEncBlob] = useState<Blob | null>(null);
  const [pendingEncHandle, setPendingEncHandle] = useState<FileSystemFileHandle | null>(null);
  const [pendingEncFilename, setPendingEncFilename] = useState<string>('');
  const [passwordError, setPasswordError] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [showNewNode, setShowNewNode] = useState<{ x: number; y: number } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<NodeType | null>(null);
  const [editorNodeId, setEditorNodeId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const { applyDagre, applyForce } = useLayout();
  useAutoSave();

  const triggerFitView = useCallback(() => setFitViewTrigger((v) => v + 1), []);

  const refreshCases = useCallback(() => {
    listCases().then(setCases).catch(() => {/* ignore */});
  }, []);

  // Load the remembered Case Files list on mount
  useEffect(() => { refreshCases(); }, [refreshCases]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === 'Escape') { setShowSearch(false); setCtxMenu(null); setShowInfo(false); setShowFiles(false); setShowSettings(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── File operations ────────────────────────────────────────────────────────

  const ingestAssets = useCallback((assets: Record<string, { buffer: ArrayBuffer; mimeType: string }>) => {
    Object.entries(assets).forEach(([id, { buffer, mimeType }]) => {
      assetMap.set(id, buffer);
      cacheAsset(id, buffer, mimeType);
    });
  }, []);

  const loadFromBlob = useCallback(async (
    zipBlob: Blob,
    handle: FileSystemFileHandle | null,
    filename: string,
  ) => {
    const data = await readCitr(zipBlob);
    const manifest = data.manifest.id ? data.manifest : { ...data.manifest, id: nanoid() };
    const storageMode: CaseStorage = handle ? 'handle' : 'idb';
    setCurrentFileBlob(zipBlob);
    setHandle(handle, filename, storageMode);
    setManifest(manifest);
    loadGraph(data.nodes, data.edges);
    loadCanvas(data.positions, data.viewport, data.layout);
    loadInvestigator(data.investigator);
    loadMystery(data.mystery);
    ingestAssets(data.assets);
    setSaveStatus('saved');
    setIsOpen(true);
    setCreateFlow(null);
    triggerFitView();
    if (handle) {
      await upsertCaseEntry({ id: manifest.id, title: manifest.title, handle, storage: 'handle', created: manifest.created, modified: manifest.modified });
    } else {
      // Browsers without File System Access (Safari/mobile) — persist the
      // whole case in IndexedDB so it doesn't need re-downloading on every save.
      await saveCaseBlobToIDB(manifest.id, zipBlob);
      await upsertCaseEntry({ id: manifest.id, title: manifest.title, handle: null, storage: 'idb', created: manifest.created, modified: manifest.modified });
    }
    refreshCases();
  }, [setHandle, setManifest, loadGraph, loadCanvas, loadInvestigator, loadMystery, setSaveStatus, ingestAssets, triggerFitView, refreshCases]);

  const loadFromHandle = useCallback(async (handle: FileSystemFileHandle) => {
    const file    = await handle.getFile();
    const buffer  = await file.arrayBuffer();
    if (isEncryptedBuffer(buffer)) {
      setPendingEncBlob(new Blob([buffer]));
      setPendingEncHandle(handle);
      setPendingEncFilename(handle.name);
      setPasswordError('');
      return;
    }
    await loadFromBlob(new Blob([buffer], { type: 'application/zip' }), handle, handle.name);
  }, [loadFromBlob]);

  const handleOpenCase = useCallback(async (entry: CaseEntry) => {
    try {
      if (entry.storage === 'handle' && entry.handle) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perm = await (entry.handle as any).requestPermission({ mode: 'readwrite' }) as string;
        if (perm !== 'granted') return;
        await loadFromHandle(entry.handle);
        return;
      }
      const blob = await getCaseBlobFromIDB(entry.id);
      if (!blob) return;
      const buffer = await blob.arrayBuffer();
      if (isEncryptedBuffer(buffer)) {
        setPendingEncBlob(new Blob([buffer]));
        setPendingEncHandle(null);
        setPendingEncFilename(entry.title);
        setPasswordError('');
        return;
      }
      await loadFromBlob(new Blob([buffer], { type: 'application/zip' }), null, entry.title);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Open case failed', err);
    }
  }, [loadFromHandle, loadFromBlob]);

  const handleRemoveCase = useCallback((id: string) => {
    removeCaseEntry(id).then(refreshCases).catch(() => {/* ignore */});
  }, [refreshCases]);

  const handleOpen = useCallback(async () => {
    try {
      const { handle, file } = await openCitrFile();
      const buffer = await file.arrayBuffer();
      if (handle) await saveHandleToIDB(handle);
      if (isEncryptedBuffer(buffer)) {
        setPendingEncBlob(new Blob([buffer]));
        setPendingEncHandle(handle);
        setPendingEncFilename(handle?.name ?? file.name);
        setPasswordError('');
        return;
      }
      await loadFromBlob(new Blob([buffer], { type: 'application/zip' }), handle, handle?.name ?? file.name);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Open failed', err);
    }
  }, [loadFromBlob]);

  const handleCreate = useCallback(async (title: string, passphrase?: string) => {
    try {
      const { handle, filename } = await createCitrFile(title);
      const now = new Date().toISOString();
      const manifest: CaseManifest = { id: nanoid(), version: 1, title, created: now, modified: now };
      const storageMode: CaseStorage = handle ? 'handle' : 'idb';
      setManifest(manifest);
      setHandle(handle, filename, storageMode);
      loadGraph({}, {});
      loadCanvas({}, { x: 0, y: 0, zoom: 1 }, 'freeform');
      resetInvestigator();
      resetMystery();
      const investigator = useInvestigatorStore.getState();
      const mystery = useMysteryStore.getState();
      const blob = await writeCitr({
        manifest, nodes: {}, edges: {}, positions: {}, viewport: { x: 0, y: 0, zoom: 1 }, layout: 'freeform',
        investigator, mystery, settings: {},
      });
      setCurrentFileBlob(blob);
      const diskBlob = passphrase ? await encryptBlob(blob, passphrase) : blob;
      if (handle) {
        await writeCitrFile(handle, diskBlob);
        await saveHandleToIDB(handle);
        await upsertCaseEntry({ id: manifest.id, title: manifest.title, handle, storage: 'handle', created: manifest.created, modified: manifest.modified });
      } else {
        // No File System Access (Safari/mobile) — persist to IndexedDB instead
        // of forcing a download every save.
        await saveCaseBlobToIDB(manifest.id, diskBlob);
        await upsertCaseEntry({ id: manifest.id, title: manifest.title, handle: null, storage: 'idb', created: manifest.created, modified: manifest.modified });
      }
      refreshCases();
      if (passphrase) setEncryption(true, passphrase);
      setSaveStatus('saved');
      setLastSaved(now);
      setIsOpen(true);
      setCreateFlow(null);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') console.error('Create failed', err);
    }
  }, [setHandle, setManifest, loadGraph, loadCanvas, resetInvestigator, resetMystery, setSaveStatus, setLastSaved, setEncryption, refreshCases]);

  const handleCloseCase = useCallback(() => {
    setIsOpen(false);
    setSelectedNodeId(null);
    setShowPlay(false);
    useFileStore.getState().reset();
    refreshCases();
  }, [refreshCases]);

  // Lets IndexedDB-stored cases (Safari/mobile) get a real .citr file out —
  // for backup, or moving to a desktop browser with File System Access.
  const handleExport = useCallback(async () => {
    const blob = getCurrentFileBlob();
    const { filename, passphrase } = useFileStore.getState();
    if (!blob || !filename) return;
    const diskBlob = passphrase ? await encryptBlob(blob, passphrase) : blob;
    downloadBlob(diskBlob, filename);
  }, []);

  // ── Canvas interactions ────────────────────────────────────────────────────

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setActiveEdgeId(edgeId);
  }, []);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    setShowNewNode({ x, y });
  }, []);

  const handleNewNode = useCallback((label: string, summary: string) => {
    if (!showNewNode) return;
    const node = addNode({ label, summary, tags: [], hasContent: false, properties: {} });
    setPosition(node.id, showNewNode);
    setShowNewNode(null);
    setSelectedNodeId(node.id);
    triggerFitView();
    // If there's a pending edge source (from drag-to-empty), wire it up
    if (_pendingEdgeSource && _pendingEdgeSource !== node.id) {
      const { addEdge } = useGraphStore.getState();
      addEdge({ source: _pendingEdgeSource, target: node.id });
    }
    _pendingEdgeSource = null;
  }, [showNewNode, addNode, setPosition, triggerFitView]);

  const handleCancelNewNode = useCallback(() => {
    setShowNewNode(null);
    _pendingEdgeSource = null;
  }, []);

  // Edge dragged to empty canvas → create a new node there
  const handleDropCreateNode = useCallback((fromNodeId: string | null, pos: { x: number; y: number }) => {
    _pendingEdgeSource = fromNodeId;
    setShowNewNode(pos);
  }, []);

  // ── Context menus ──────────────────────────────────────────────────────────

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    const node = useGraphStore.getState().nodes[nodeId];
    setCtxMenu({
      x, y,
      items: [
        {
          icon: <Pencil size={12} />,
          label: 'Edit',
          onClick: () => setSelectedNodeId(nodeId),
        },
        {
          icon: <Layers2 size={12} />,
          label: 'Duplicate',
          onClick: () => {
            if (!node) return;
            const { positions } = useCanvasStore.getState();
            const pos = positions[nodeId] ?? { x: 100, y: 100 };
            const dup = addNode({
              label: `${node.label} (copy)`,
              summary: node.summary,
              notes: node.notes,
              tags: [...node.tags],
              nodeType: node.nodeType,
              hasContent: false,
              properties: { ...node.properties },
            });
            setPosition(dup.id, { x: pos.x + 40, y: pos.y + 40 });
          },
        },
        {
          icon: <Copy size={12} />,
          label: 'Copy label',
          onClick: () => { if (node) void navigator.clipboard.writeText(node.label); },
        },
        {
          icon: <Trash2 size={12} />,
          label: 'Delete',
          danger: true,
          separator: true,
          onClick: () => {
            deleteNode(nodeId);
            if (selectedNodeId === nodeId) setSelectedNodeId(null);
          },
        },
      ],
    });
  }, [addNode, deleteNode, setPosition, selectedNodeId]);

  const handleCanvasContextMenu = useCallback((x: number, y: number, flowX: number, flowY: number) => {
    setCtxMenu({
      x, y,
      items: [
        {
          icon: <Plus size={12} />,
          label: 'Add node here',
          onClick: () => setShowNewNode({ x: flowX, y: flowY }),
        },
        {
          icon: <Maximize2 size={12} />,
          label: 'Fit view',
          separator: true,
          onClick: triggerFitView,
        },
        {
          icon: <GitFork size={12} />,
          label: 'Dagre layout',
          onClick: applyDagre,
        },
        {
          icon: <Network size={12} />,
          label: 'Force layout',
          onClick: () => void applyForce(),
        },
      ],
    });
  }, [applyDagre, applyForce, triggerFitView]);

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const handleFocusNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  }, []);

  const handleAddNodeFromSidebar = useCallback(() => {
    setShowNewNode({ x: 200 + Math.random() * 400, y: 150 + Math.random() * 200 });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Unlock an encrypted file
  const handleUnlock = async (passphrase: string) => {
    if (!pendingEncBlob) return;
    try {
      const zipBlob = await decryptBlob(pendingEncBlob, passphrase);
      await loadFromBlob(zipBlob, pendingEncHandle, pendingEncFilename);
      setEncryption(true, passphrase);
      if (pendingEncHandle) await saveHandleToIDB(pendingEncHandle);
      setPendingEncBlob(null);
      setPendingEncHandle(null);
    } catch {
      setPasswordError('Wrong passphrase — try again');
    }
  };

  if (pendingEncBlob) {
    return (
      <PasswordDialog
        mode="unlock"
        filename={pendingEncFilename}
        error={passwordError}
        onSubmit={(pw) => void handleUnlock(pw)}
        onCancel={() => { setPendingEncBlob(null); setPendingEncHandle(null); setPasswordError(''); }}
      />
    );
  }

  if (!isOpen) {
    if (cases.length === 0 || createFlow !== null) {
      return (
        <OpenOrCreateDialog
          onOpen={() => void handleOpen()}
          onCreate={(title, passphrase) => void handleCreate(title, passphrase)}
          initialMode={createFlow ?? 'choose'}
          onBack={cases.length > 0 ? () => setCreateFlow(null) : undefined}
        />
      );
    }
    return (
      <CaseFilesScreen
        cases={cases}
        onOpen={(entry) => void handleOpenCase(entry)}
        onRemove={handleRemoveCase}
        onNewCase={() => setCreateFlow('create')}
        onOpenOther={() => void handleOpen()}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Toolbar
        onSearch={() => setShowSearch((v) => !v)}
        onDagre={applyDagre}
        onForce={() => void applyForce()}
        onFitView={triggerFitView}
        onInfo={() => setShowInfo(true)}
        onFiles={() => setShowFiles(true)}
        onPlay={() => setShowPlay((v) => !v)}
        onSettings={() => setShowSettings(true)}
        onCloseCase={handleCloseCase}
        onExport={() => void handleExport()}
      />

      <SidebarProvider className="flex-1 overflow-hidden min-h-0 w-auto">
        <SidebarPanel
          activeTag={activeTag}
          onTagClick={setActiveTag}
          activeType={activeType}
          onTypeClick={setActiveType}
          onFocusNode={handleFocusNode}
          onAddNode={handleAddNodeFromSidebar}
          selectedNodeId={selectedNodeId}
        />

        <div className="flex-1 relative overflow-hidden">
          <CaseBoard
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeClick={handleEdgeClick}
            onCanvasDoubleClick={handleCanvasDoubleClick}
            onCanvasContextMenu={handleCanvasContextMenu}
            onDropCreateNode={handleDropCreateNode}
            activeTag={activeTag}
            activeType={activeType}
            focusNodeId={focusNodeId}
            onFocusConsumed={() => setFocusNodeId(null)}
            fitViewTrigger={fitViewTrigger}
          />

          {Object.keys(nodes).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-muted-foreground text-sm">Right-click to add a node</div>
                <div className="text-muted-foreground/60 text-xs mt-1">Double-click also works · drag the pin to connect</div>
              </div>
            </div>
          )}
        </div>

        {selectedNodeId && (
          <NodePanel
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
            onOpenEditor={setEditorNodeId}
          />
        )}

        {showPlay && (
          <PlayPanel onClose={() => setShowPlay(false)} />
        )}
      </SidebarProvider>

      {showNewNode && (
        <NewNodeDialog
          onConfirm={handleNewNode}
          onCancel={handleCancelNewNode}
        />
      )}

      {activeEdgeId && (
        <EdgeDialog edgeId={activeEdgeId} onClose={() => setActiveEdgeId(null)} />
      )}

      {showSearch && (
        <SearchPanel
          onSelectNode={(id) => { setSelectedNodeId(id); setFocusNodeId(id); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />
      )}

      {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      {showFiles && (
        <FileExplorer
          onClose={() => setShowFiles(false)}
          onOpenEditor={(id) => { setShowFiles(false); setEditorNodeId(id); }}
        />
      )}

      {editorNodeId && (
        <ContentEditor nodeId={editorNodeId} onClose={() => setEditorNodeId(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AppInner />
    </TooltipProvider>
  );
}
