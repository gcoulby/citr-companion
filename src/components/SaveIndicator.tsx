import { Loader2, CheckCircle2, Clock, AlertCircle, Lock } from 'lucide-react';
import { useFileStore } from '../store/fileStore';

export function SaveIndicator() {
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
