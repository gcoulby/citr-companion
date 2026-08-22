import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { Archive, ImageIcon, Lock, Trash2, BookOpen, Loader2, HardDrive, FileJson } from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { getCurrentFileBlob, assetMap, contentMap, contentDirty, saveNow } from '../../hooks/useAutoSave';
import { invalidateAsset, getCachedAsset, cacheAsset } from '../../lib/assetCache';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', txt: 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetEntry {
  id: string;          // assetId (filename without path)
  filename: string;    // original filename stored in assets/
  size: number;
  mimeType: string;
  isImage: boolean;
  referencedBy: string[];  // node labels that reference this asset
}

interface ContentEntry {
  nodeId: string;
  nodeLabel: string;
  size: number;
}

interface CoreEntry {
  name: string;
  size: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 sticky top-0 bg-card z-10">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
      <span className="text-[9px] text-muted-foreground/70 font-mono">({count})</span>
    </div>
  );
}

function CoreFileRow({ entry }: { entry: CoreEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
      <FileJson size={13} className="text-muted-foreground/70 shrink-0" />
      <span className="text-[12px] text-muted-foreground font-mono flex-1">{entry.name}</span>
      <span className="text-[10px] text-muted-foreground/40 font-mono">{fmtBytes(entry.size)}</span>
      <span title="Read-only"><Lock size={10} className="text-muted-foreground/40" /></span>
    </div>
  );
}

function AssetRow({
  entry,
  onDelete,
}: {
  entry: AssetEntry;
  onDelete: (id: string) => void;
}) {
  const url = getCachedAsset(entry.id);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 group">
      {/* Preview */}
      <div className="w-8 h-8 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
        {entry.isImage && url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={12} className="text-muted-foreground/70" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-foreground font-mono truncate">{entry.filename}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-muted-foreground/70 font-mono">{fmtBytes(entry.size)}</span>
          <span className="text-[9px] text-muted-foreground/40 font-mono">{entry.mimeType.split('/')[1]}</span>
        </div>
        {entry.referencedBy.length > 0 && (
          <div className="text-[9px] text-muted-foreground/70 truncate mt-0.5">
            ↳ {entry.referencedBy.join(', ')}
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground/70 hover:text-destructive"
        title="Remove asset"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function ContentRow({
  entry,
  onOpen,
}: {
  entry: ContentEntry;
  onOpen: (nodeId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 group">
      <BookOpen size={13} className="text-primary/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-foreground truncate">{entry.nodeLabel}</div>
        <div className="text-[9px] text-muted-foreground/70 font-mono mt-0.5">{fmtBytes(entry.size)}</div>
      </div>
      <button
        onClick={() => onOpen(entry.nodeId)}
        className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-primary hover:bg-primary/10"
      >
        Open
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onOpenEditor: (nodeId: string) => void;
}

export function FileExplorer({ onClose, onOpenEditor }: Props) {
  const nodes = useGraphStore((s) => s.nodes);
  const updateNode = useGraphStore((s) => s.updateNode);

  const [loading, setLoading] = useState(true);
  const [coreFiles, setCoreFiles] = useState<CoreEntry[]>([]);
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([]);
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  // Build node thumbnail reverse-index: assetId → [nodeLabel, ...]
  const thumbnailIndex = Object.values(nodes).reduce<Record<string, string[]>>((acc, n) => {
    if (n.thumbnail) {
      acc[n.thumbnail] = [...(acc[n.thumbnail] ?? []), n.label];
    }
    (n.attachments ?? []).forEach((a) => {
      acc[a.id] = [...(acc[a.id] ?? []), n.label];
    });
    return acc;
  }, {});

  useEffect(() => {
    const blob = getCurrentFileBlob();
    if (!blob) { setLoading(false); return; }

    void (async () => {
      try {
        const zip = await JSZip.loadAsync(blob);
        const core: CoreEntry[] = [];
        const assets: AssetEntry[] = [];
        const content: ContentEntry[] = [];
        let total = 0;

        for (const [path, file] of Object.entries(zip.files)) {
          if (file.dir) continue;
          const data = await file.async('uint8array');
          const size = data.length;
          total += size;

          if (!path.includes('/')) {
            // Core file
            core.push({ name: path, size });
          } else if (path.startsWith('assets/')) {
            const filename = path.replace('assets/', '');
            const assetId = filename; // stored as-is
            const mimeType = guessMime(filename);
            const isImage = mimeType.startsWith('image/');

            // Ensure it's cached for preview
            if (isImage && !getCachedAsset(assetId)) {
              cacheAsset(assetId, data.buffer as ArrayBuffer, mimeType);
            }

            assets.push({
              id: assetId,
              filename,
              size,
              mimeType,
              isImage,
              referencedBy: thumbnailIndex[assetId] ?? [],
            });
          } else if (path.startsWith('content/')) {
            const nodeId = path.replace('content/', '').replace('.json', '');
            const nodeLabel = nodes[nodeId]?.label ?? nodeId;
            content.push({ nodeId, nodeLabel, size });
          }
        }

        setCoreFiles(core.sort((a, b) => a.name.localeCompare(b.name)));
        setAssetEntries(assets.sort((a, b) => b.size - a.size));
        setContentEntries(content.sort((a, b) => a.nodeLabel.localeCompare(b.nodeLabel)));
        setTotalSize(total);
      } catch (err) {
        console.error('FileExplorer: failed to read archive', err);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteAsset = (assetId: string) => {
    // Remove from in-memory maps
    assetMap.delete(assetId);
    invalidateAsset(assetId);

    // Remove reference from any node that uses it as thumbnail
    Object.values(nodes).forEach((n) => {
      if (n.thumbnail === assetId) {
        updateNode(n.id, { thumbnail: undefined });
      }
      if (n.attachments?.some((a) => a.id === assetId)) {
        updateNode(n.id, { attachments: n.attachments.filter((a) => a.id !== assetId) });
      }
    });

    // Remove from content tracking if somehow mixed in
    contentMap.delete(assetId);
    contentDirty.delete(assetId);

    setAssetEntries((prev) => prev.filter((e) => e.id !== assetId));

    // Save immediately — deletion must be reflected in the ZIP right away
    void saveNow();
  };

  const handleOpenContent = (nodeId: string) => {
    onClose();
    onOpenEditor(nodeId);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-140 max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="h-10 justify-center bg-background border-b border-border px-4">
          <DialogTitle className="flex items-center gap-3 font-normal">
            <Archive size={13} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Archive Browser</span>
            <span className="text-[10px] text-muted-foreground/70 font-mono">.citr</span>
            {!loading && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70 ml-auto mr-6">
                <HardDrive size={10} />
                {fmtBytes(totalSize)} total
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground/70 py-12">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Reading archive…</span>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <SectionHeader label="Case Files" count={coreFiles.length} />
            {coreFiles.map((e) => <CoreFileRow key={e.name} entry={e} />)}

            <SectionHeader label="Assets" count={assetEntries.length} />
            {assetEntries.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-muted-foreground/40">No assets attached yet</div>
            ) : (
              assetEntries.map((e) => (
                <AssetRow key={e.id} entry={e} onDelete={handleDeleteAsset} />
              ))
            )}

            <SectionHeader label="Documents" count={contentEntries.length} />
            {contentEntries.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-muted-foreground/40">No documents created yet</div>
            ) : (
              contentEntries.map((e) => (
                <ContentRow key={e.nodeId} entry={e} onOpen={handleOpenContent} />
              ))
            )}

            <div className="h-4" />
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
