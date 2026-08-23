import { useState, useRef } from 'react';
import { X, Plus, Trash2, Paperclip, FileText, ImagePlus, BookOpen, MapPin, Image, Link2, NotebookPen } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useGraphStore } from '../../store/graphStore';
import { useMysteryStore } from '../../store/mysteryStore';
import { useBacklinksStore, type BacklinkRef } from '../../store/backlinksStore';
import { getAllTags } from '../../graph/graphOps';
import { assetMap } from '../../hooks/useAutoSave';
import { cacheAsset, getCachedAsset } from '../../lib/assetCache';
import { NODE_TYPE_CONFIG, ALL_NODE_TYPES } from '../../lib/nodeTypeConfig';
import { LocationPickerDialog } from '../dialogs/LocationPickerDialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TagInput } from '../ui/tag-input';
import { Textarea } from '../ui/textarea';
import { PlayingCardView } from '../play/PlayingCard';
import type { NodeAttachment, DocumentRef } from '../../types';
import { CASE_NOTES_ID, clueCardsOf } from '../../types';
import type { ThreatKind, Suit } from '../../game/types';

interface Props {
  nodeId: string;
  onClose: () => void;
  onOpenDocument: (ref: DocumentRef) => void;
}

// Stable empty-array fallback — a fresh `[]` literal returned from a zustand
// selector on every call breaks useSyncExternalStore's snapshot caching and
// causes an infinite render loop.
const EMPTY_BACKLINKS: BacklinkRef[] = [];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">{children}</div>
  );
}

export function NodePanel({ nodeId, onClose, onOpenDocument }: Props) {
  const node = useGraphStore((s) => s.nodes[nodeId]);
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const allNodes = useGraphStore((s) => s.nodes);
  const renameThreat = useMysteryStore((s) => s.renameThreat);
  const updateThreat = useMysteryStore((s) => s.updateThreat);
  // Read live from mysteryStore (the source of truth) rather than the
  // node's own bridged snapshot, which otherwise goes stale the moment the
  // clue set changes again without another "add to board" round-trip.
  const liveClueSet = useMysteryStore((s) => (node?.clue ? s.clueSets[node.clue.rank] : undefined));
  const backlinks = useBacklinksStore((s) => s.index[nodeId] ?? EMPTY_BACKLINKS);

  const [newPropKey, setNewPropKey] = useState('');
  const [newPropVal, setNewPropVal] = useState('');
  const [imgDragOver, setImgDragOver] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  if (!node) return null;

  const allTags = getAllTags(allNodes);
  const thumbnailUrl = node.thumbnail ? getCachedAsset(node.thumbnail) : undefined;

  // ── Image upload ──────────────────────────────────────────────────────────

  const uploadThumbnail = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const assetId = `${nanoid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    assetMap.set(assetId, buffer);
    cacheAsset(assetId, buffer, file.type);
    updateNode(nodeId, { thumbnail: assetId });
  };

  // ── File attachment upload ─────────────────────────────────────────────────

  const uploadAttachment = async (file: File) => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const assetId = `${nanoid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    assetMap.set(assetId, buffer);
    if (file.type.startsWith('image/')) cacheAsset(assetId, buffer, file.type);
    const attachment: NodeAttachment = { id: assetId, filename: file.name, size: file.size, mimeType: file.type };
    updateNode(nodeId, { attachments: [...(node.attachments ?? []), attachment] });
  };

  const removeAttachment = (id: string) => {
    updateNode(nodeId, { attachments: (node.attachments ?? []).filter((a) => a.id !== id) });
  };

  const downloadAttachment = (att: NodeAttachment) => {
    const buffer = assetMap.get(att.id);
    if (!buffer) return;
    const url = URL.createObjectURL(new Blob([buffer], { type: att.mimeType }));
    const a = document.createElement('a');
    a.href = url; a.download = att.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (b: number) =>
    b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col overflow-hidden shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Node</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}><X size={14} /></Button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Thumbnail */}
        <div className="border-b border-border/60">
          {thumbnailUrl ? (
            <div className="relative group">
              <img src={thumbnailUrl} alt="" className="w-full h-36 object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => imgInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs bg-card text-foreground rounded border border-border hover:border-primary/60">
                  Replace
                </button>
                <button onClick={() => updateNode(nodeId, { thumbnail: undefined })}
                  className="px-3 py-1.5 text-xs bg-card text-red-400 rounded border border-red-400/30 hover:border-red-400/60">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImgDragOver(false); const f = e.dataTransfer.files[0]; if (f) void uploadThumbnail(f); }}
              onClick={() => imgInputRef.current?.click()}
              className={[
                'flex flex-col items-center gap-1.5 py-5 mx-4 my-3 rounded border border-dashed cursor-pointer transition-colors',
                imgDragOver ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40 hover:text-muted-foreground',
              ].join(' ')}
            >
              <ImagePlus size={18} />
              <span className="text-[11px]">Drop image or click to upload</span>
            </div>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumbnail(f); }} />
        </div>

        <div className="p-4 space-y-4">

          {/* Node type — 13 types in a wrap grid */}
          <div>
            <SectionLabel>Type</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateNode(nodeId, { nodeType: undefined })}
                className={[
                  'px-2 py-0.5 rounded border text-[10px] transition-colors',
                  !node.nodeType ? 'border-muted-foreground/40 text-foreground bg-muted' : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40',
                ].join(' ')}
              >
                None
              </button>
              {ALL_NODE_TYPES.map((type) => {
                const cfg = NODE_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => updateNode(nodeId, { nodeType: type })}
                    className={[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors',
                      node.nodeType === type ? cfg.color : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40 hover:text-muted-foreground',
                    ].join(' ')}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mystery metadata — populated by the Play panel, editable here */}
          {(node.clue || node.truth || node.threat) && (
            <div className="px-3 py-2.5 rounded border border-border bg-background text-[11px] space-y-2">
              {node.clue && (() => {
                const clueCards = liveClueSet?.cards ?? clueCardsOf(node.clue);
                return (
                  <div className="flex items-start gap-2">
                    {clueCards.length > 0 && (
                      <PlayingCardView
                        card={clueCards[clueCards.length - 1]}
                        suits={clueCards.map((c) => c.suit).filter((s): s is Suit => s !== null)}
                        size="sm"
                      />
                    )}
                    <div className="font-mono text-foreground">Clue {node.clue.rank} · <span className="text-muted-foreground">{node.clue.status}</span></div>
                  </div>
                );
              })()}
              {node.truth && (
                <div className="flex items-start gap-2">
                  {node.truth.card && <PlayingCardView card={node.truth.card} size="sm" />}
                  <div className="font-mono text-yellow-300">{node.truth.connection || 'Confirmed truth'}</div>
                </div>
              )}
              {node.threat && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={node.threat.kind}
                      onChange={(e) => {
                        const kind = e.target.value as ThreatKind;
                        updateNode(nodeId, { threat: { ...node.threat!, kind } });
                        if (node.threat!.threatId) updateThreat(node.threat!.threatId, { kind });
                      }}
                      className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-foreground"
                    >
                      <option value="threat">Threat</option>
                      <option value="rival">Rival</option>
                    </select>
                    <select
                      value={node.threat.level}
                      onChange={(e) => {
                        const level = Number(e.target.value) as 1 | 2 | 3;
                        updateNode(nodeId, { threat: { ...node.threat!, level } });
                        if (node.threat!.threatId) updateThreat(node.threat!.threatId, { level });
                      }}
                      className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-foreground"
                    >
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                      <option value={3}>Level 3</option>
                    </select>
                    {node.threat.defeated && <span className="text-[10px] text-muted-foreground/70">defeated</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 normal-case">
                    Name is set via the Label field above{node.threat.threatId ? ' and stays in sync with the Play panel' : ''}.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Label */}
          <div>
            <SectionLabel>Label</SectionLabel>
            <Input value={node.label}
              onChange={(e) => {
                updateNode(nodeId, { label: e.target.value });
                if (node.threat?.threatId) renameThreat(node.threat.threatId, e.target.value);
              }}
            />
          </div>

          {/* Summary */}
          <div>
            <SectionLabel>Summary</SectionLabel>
            <Textarea value={node.summary ?? ''} rows={2}
              onChange={(e) => updateNode(nodeId, { summary: e.target.value })}
              placeholder="Brief one-liner…"
              className="resize-none"
            />
          </div>

          {/* Quick notes */}
          <div>
            <SectionLabel>Quick Notes</SectionLabel>
            <Textarea value={node.notes ?? ''} rows={4}
              onChange={(e) => updateNode(nodeId, { notes: e.target.value })}
              placeholder="Rapid observations, source URLs, short intel…"
              className="text-[12px] leading-relaxed resize-y font-mono"
            />
          </div>

          {/* Document editor */}
          <div>
            <SectionLabel>Document</SectionLabel>
            <button
              onClick={() => onOpenDocument({ kind: 'node', nodeId })}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group text-left"
            >
              <BookOpen size={14} className={node.hasContent ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-primary'} />
              <div>
                <div className={`text-[12px] font-medium ${node.hasContent ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {node.hasContent ? 'Open document' : 'Create document'}
                </div>
                <div className="text-[10px] text-muted-foreground/70">
                  {node.hasContent ? 'Block-based rich text editor' : 'Headings, lists, tables, images…'}
                </div>
              </div>
            </button>
          </div>

          {/* Referenced in — backlinks from @-mentions in Case Notes / other docs */}
          {backlinks.length > 0 && (
            <div>
              <SectionLabel>Referenced In</SectionLabel>
              <div className="space-y-1">
                {backlinks.map(({ docId }) => {
                  const isCaseNotes = docId === CASE_NOTES_ID;
                  const sourceLabel = isCaseNotes ? 'Case Notes' : (allNodes[docId]?.label ?? 'Untitled');
                  return (
                    <button
                      key={docId}
                      onClick={() => onOpenDocument(isCaseNotes ? { kind: 'case' } : { kind: 'node', nodeId: docId })}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                    >
                      {isCaseNotes ? <NotebookPen size={11} className="text-primary shrink-0" /> : <Link2 size={11} className="text-muted-foreground/70 shrink-0" />}
                      <span className="text-[11px] text-foreground truncate">{sourceLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <SectionLabel>Location</SectionLabel>
            {node.location ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 px-2 py-2 rounded bg-background border border-border">
                  <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {node.location.label && (
                      <div className="text-[11px] text-foreground leading-tight mb-0.5 truncate">{node.location.label}</div>
                    )}
                    <div className="text-[10px] font-mono text-muted-foreground/80">
                      {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocationPicker(true)}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => updateNode(nodeId, { location: undefined, featureDisplay: undefined })}
                    className="text-muted-foreground/70 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* Feature selector — only when both image and location exist */}
                {node.thumbnail && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1 font-mono">Card Feature</div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateNode(nodeId, { featureDisplay: 'image' })}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors',
                          (node.featureDisplay ?? 'image') === 'image'
                            ? 'border-primary/60 text-primary bg-primary/10'
                            : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40',
                        ].join(' ')}
                      >
                        <Image size={10} /> Image
                      </button>
                      <button
                        onClick={() => updateNode(nodeId, { featureDisplay: 'map' })}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors',
                          node.featureDisplay === 'map'
                            ? 'border-primary/60 text-primary bg-primary/10'
                            : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40',
                        ].join(' ')}
                      >
                        <MapPin size={10} /> Map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center gap-2 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors"
              >
                <MapPin size={11} /> Add location pin
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <SectionLabel>Tags</SectionLabel>
            <TagInput
              tags={node.tags}
              suggestions={allTags}
              placeholder="Add tag and press Enter…"
              onAdd={(tag) => updateNode(nodeId, { tags: [...node.tags, tag] })}
              onRemove={(tag) => updateNode(nodeId, { tags: node.tags.filter((t) => t !== tag) })}
            />
          </div>

          {/* Properties */}
          <div>
            <SectionLabel>Properties</SectionLabel>
            <div className="space-y-1.5">
              {Object.entries(node.properties).map(([k, v]) => (
                <div key={k} className="flex gap-1.5 items-center">
                  <Input value={k}
                    onChange={(e) => {
                      const props = { ...node.properties }; delete props[k]; props[e.target.value] = v;
                      updateNode(nodeId, { properties: props });
                    }}
                    className="w-24 h-7 text-[10px] text-muted-foreground font-mono"
                  />
                  <Input value={v}
                    onChange={(e) => updateNode(nodeId, { properties: { ...node.properties, [k]: e.target.value } })}
                    className="flex-1 h-7 text-[11px]"
                  />
                  <button onClick={() => { const p = { ...node.properties }; delete p[k]; updateNode(nodeId, { properties: p }); }}
                    className="text-muted-foreground/70 hover:text-red-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <Input value={newPropKey} placeholder="key"
                onChange={(e) => setNewPropKey(e.target.value)}
                className="w-24 h-7 text-[10px] text-muted-foreground font-mono"
              />
              <Input value={newPropVal} placeholder="value"
                onChange={(e) => setNewPropVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPropKey.trim()) {
                    updateNode(nodeId, { properties: { ...node.properties, [newPropKey.trim()]: newPropVal.trim() } });
                    setNewPropKey(''); setNewPropVal('');
                  }
                }}
                className="flex-1 h-7 text-[11px]"
              />
              <button onClick={() => {
                if (newPropKey.trim()) {
                  updateNode(nodeId, { properties: { ...node.properties, [newPropKey.trim()]: newPropVal.trim() } });
                  setNewPropKey(''); setNewPropVal('');
                }
              }} className="text-primary hover:text-primary"><Plus size={14} /></button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <SectionLabel>Attachments</SectionLabel>
            {(node.attachments ?? []).length === 0 ? (
              <div className="text-[11px] text-muted-foreground/40 mb-2">No files attached</div>
            ) : (
              <div className="space-y-1 mb-2">
                {(node.attachments ?? []).map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border border-border group">
                    <FileText size={10} className="text-muted-foreground/70 shrink-0" />
                    <button onClick={() => downloadAttachment(att)}
                      className="flex-1 text-left text-[11px] text-muted-foreground hover:text-foreground truncate transition-colors">
                      {att.filename}
                    </button>
                    <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">{formatSize(att.size)}</span>
                    <button onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground/70 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => attachInputRef.current?.click()}
              className="flex items-center gap-2 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors">
              <Paperclip size={11} />Attach file
            </button>
            <input ref={attachInputRef} type="file" className="hidden" multiple
              onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => void uploadAttachment(f)); e.target.value = ''; }} />
          </div>

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground/40 font-mono space-y-0.5 pb-2">
            <div>created {new Date(node.createdAt).toLocaleString()}</div>
            <div>updated {new Date(node.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-border shrink-0">
        <Button variant="destructive" className="w-full" onClick={() => { deleteNode(nodeId); onClose(); }}>
          Delete Node
        </Button>
      </div>

      {showLocationPicker && (
        <LocationPickerDialog
          initial={node.location}
          onConfirm={(loc) => {
            updateNode(nodeId, { location: loc });
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}
