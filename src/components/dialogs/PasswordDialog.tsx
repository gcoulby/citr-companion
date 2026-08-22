import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Props {
  mode: 'unlock' | 'set';
  filename?: string;
  error?: string;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

export function PasswordDialog({ mode, filename, error, onSubmit, onCancel }: Props) {
  const [pass, setPass]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);

  const isSet    = mode === 'set';
  const tooShort = isSet && pass.length > 0 && pass.length < 8;
  const mismatch = isSet && confirm.length > 0 && pass !== confirm;
  const canSubmit = isSet ? (pass.length >= 8 && pass === confirm) : pass.length > 0;

  const submit = () => { if (canSubmit) onSubmit(pass); };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-100" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Lock size={16} className="text-primary" />
            {isSet ? 'Encrypt Case File' : 'Encrypted File'}
          </DialogTitle>
          {filename && <div className="text-[10px] font-mono text-muted-foreground/80 truncate">{filename}</div>}
          <DialogDescription>
            {isSet
              ? 'Set a passphrase to encrypt this file. You will need it each time you open it.'
              : 'This file is encrypted. Enter the passphrase to open it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Input
              autoFocus
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={isSet ? 'Passphrase (min 8 chars)' : 'Passphrase'}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {isSet && (
            <Input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Confirm passphrase"
            />
          )}

          {tooShort  && <div className="text-[11px] text-primary">Minimum 8 characters</div>}
          {mismatch  && <div className="text-[11px] text-destructive">Passphrases do not match</div>}
          {error     && <div className="text-[11px] text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>{isSet ? 'Skip encryption' : 'Cancel'}</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            <Lock size={12} />
            {isSet ? 'Encrypt & Create' : 'Unlock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
