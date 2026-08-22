import { Moon, Sun, Check, Clock4 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useSettingsStore, GENRES, type Genre } from '../../store/settingsStore';

const GENRE_LABEL: Record<Genre, string> = {
  noir: 'Noir',
  fantasy: 'Fantasy',
  horror: 'Horror',
  scifi: 'Sci-fi',
};

const GENRE_SAMPLE: Record<Genre, string> = {
  noir: 'The Case',
  fantasy: 'The Realm',
  horror: 'The Dread',
  scifi: 'The Signal',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const genre = useSettingsStore((s) => s.genre);
  const mode = useSettingsStore((s) => s.mode);
  const setGenre = useSettingsStore((s) => s.setGenre);
  const toggleMode = useSettingsStore((s) => s.toggleMode);
  const autoAdvanceDay = useSettingsStore((s) => s.automations.autoAdvanceDay);
  const setAutomation = useSettingsStore((s) => s.setAutomation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Theme preferences, stored on this device only.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-mono">Genre</Label>
            <div className="grid grid-cols-2 gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  data-genre={g}
                  onClick={() => setGenre(g)}
                  className={`relative flex flex-col gap-2 rounded-lg border-2 bg-background p-3 text-left transition-colors ${mode === 'dark' ? 'dark' : ''}`}
                  style={{ borderColor: genre === g ? 'var(--primary)' : 'var(--border)' }}
                >
                  {genre === g && (
                    <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={10} />
                    </span>
                  )}
                  <span className="font-display text-lg text-foreground leading-none">{GENRE_SAMPLE[g]}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                    <span className="size-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                    {GENRE_LABEL[g]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              {mode === 'dark' ? <Moon size={14} className="text-muted-foreground" /> : <Sun size={14} className="text-muted-foreground" />}
              <Label className="text-sm">{mode === 'dark' ? 'Dark' : 'Light'} mode</Label>
            </div>
            <Switch checked={mode === 'dark'} onCheckedChange={toggleMode} />
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-mono">Automations</Label>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Clock4 size={14} className="text-muted-foreground" />
                <div>
                  <Label className="text-sm">Auto-advance day</Label>
                  <div className="text-[11px] text-muted-foreground">When the clock fills, roll straight into the next day</div>
                </div>
              </div>
              <Switch checked={autoAdvanceDay} onCheckedChange={(v) => setAutomation('autoAdvanceDay', v)} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
