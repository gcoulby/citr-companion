import { useState } from 'react';
import { FolderOpen, FilePlus, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

interface Props {
  onOpen: () => void;
  onCreate: (title: string, passphrase?: string) => void;
  initialMode?: 'choose' | 'create';
  onBack?: () => void;
}

export function OpenOrCreateDialog({ onOpen, onCreate, initialMode = 'choose', onBack }: Props) {
  const [mode, setMode] = useState<'choose' | 'create'>(initialMode);
  const [title, setTitle]       = useState('');
  const [encrypt, setEncrypt]   = useState(false);
  const [pass, setPass]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);

  const tooShort  = encrypt && pass.length > 0 && pass.length < 8;
  const mismatch  = encrypt && confirm.length > 0 && pass !== confirm;
  const canCreate = title.trim().length > 0 && (!encrypt || (pass.length >= 8 && pass === confirm));

  const doCreate = () => {
    if (!canCreate) return;
    onCreate(title.trim(), encrypt ? pass : undefined);
  };

  if (mode === 'create') {
    return (
      <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
        <Card className="p-8 w-110">
          <h2 className="font-display text-lg text-foreground mb-6">New Case</h2>

          <div className="mb-4 space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Case Title</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) doCreate();
                if (e.key === 'Escape') { if (onBack) onBack(); else setMode('choose'); }
              }}
              placeholder="Operation: Redfield"
            />
          </div>

          <Label className="flex items-center gap-2.5 cursor-pointer mb-4 select-none">
            <Checkbox checked={encrypt} onCheckedChange={(c) => setEncrypt(c === true)} />
            <Lock size={12} className={encrypt ? 'text-primary' : 'text-muted-foreground/70'} />
            <span className="text-[12px] text-muted-foreground">Encrypt with passphrase</span>
          </Label>

          {encrypt && (
            <div className="space-y-2.5 mb-4 pl-5 border-l-2 border-primary/20">
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Passphrase (min 8 chars)"
                  className="pr-9"
                />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                  {show ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <Input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doCreate(); }}
                placeholder="Confirm passphrase"
              />
              {tooShort && <div className="text-[11px] text-primary">Minimum 8 characters</div>}
              {mismatch && <div className="text-[11px] text-destructive">Passphrases do not match</div>}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <Button variant="ghost" onClick={() => (onBack ? onBack() : setMode('choose'))}>Back</Button>
            <Button onClick={doCreate} disabled={!canCreate}>
              {encrypt && <Lock size={12} />}
              {encrypt ? 'Encrypt & Create' : 'Create'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <Card className="p-10 w-120">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={20} className="text-primary" />
          <span className="text-primary text-xs font-mono uppercase tracking-widest">Caught in the Rain</span>
        </div>
        <h1 className="font-display text-3xl text-foreground mb-2">Case Board</h1>
        <p className="text-muted-foreground text-sm mb-8">A companion for the solo mystery RPG. Offline. No telemetry.</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onOpen}
            className="flex flex-col items-center gap-3 p-6 rounded border border-border hover:border-primary/40 hover:bg-muted transition-all group"
          >
            <FolderOpen size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium text-foreground">Open Existing</span>
            <span className="text-[11px] text-muted-foreground">.citr file</span>
          </button>
          <button
            onClick={() => setMode('create')}
            className="flex flex-col items-center gap-3 p-6 rounded border border-border hover:border-primary/40 hover:bg-muted transition-all group"
          >
            <FilePlus size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium text-foreground">New Case</span>
            <span className="text-[11px] text-muted-foreground">Start fresh</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
