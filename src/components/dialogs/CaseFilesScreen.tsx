import { useState } from 'react';
import { Shield, FolderOpen, FilePlus, FolderClosed, Trash2, HardDrive, Database } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import type { CaseEntry } from '../../file/fileHandle';

interface Props {
  cases: CaseEntry[];
  onOpen: (entry: CaseEntry) => void;
  onRemove: (id: string) => void;
  onNewCase: () => void;
  onOpenOther: () => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function CaseRow({ entry, onOpen, onRemove }: { entry: CaseEntry; onOpen: () => void; onRemove: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded border border-border hover:border-primary/40 hover:bg-muted transition-all group">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left flex items-center gap-3">
        <FolderClosed size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{entry.title}</div>
          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
            <span title={entry.storage === 'idb' ? 'Stored in this browser' : 'Linked to a file on disk'}>
              {entry.storage === 'idb' ? <Database size={10} className="inline -mt-0.5" /> : <HardDrive size={10} className="inline -mt-0.5" />}
            </span>
            opened {fmtDate(entry.created)} · edited {fmtDate(entry.modified)}
          </div>
        </div>
      </button>
      {confirmRemove ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground">Remove from list?</span>
          <Button variant="destructive" size="sm" onClick={onRemove}>Remove</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Cancel</Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-destructive"
          onClick={() => setConfirmRemove(true)}
          title="Remove from list (keeps the file on disk)"
        >
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  );
}

export function CaseFilesScreen({ cases, onOpen, onRemove, onNewCase, onOpenOther }: Props) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <Card className="p-8 w-140 max-h-[85dvh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <Shield size={20} className="text-primary" />
          <span className="text-primary text-xs font-mono uppercase tracking-widest">Caught in the Rain</span>
        </div>
        <div className="flex items-end justify-between mb-5 shrink-0">
          <h1 className="font-display text-2xl text-foreground">Case Files</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onOpenOther}>
              <FolderOpen size={13} /> Open other
            </Button>
            <Button size="sm" onClick={onNewCase}>
              <FilePlus size={13} /> New Case
            </Button>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No cases yet — start a new one, or open a .citr file.</div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
            <div className="space-y-2 pb-1">
              {cases.map((c) => (
                <CaseRow key={c.id} entry={c} onOpen={() => onOpen(c)} onRemove={() => onRemove(c.id)} />
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
