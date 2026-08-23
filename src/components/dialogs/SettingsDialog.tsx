import { useRef } from 'react';
import { Moon, Sun, Check, Clock4, Database, Map as MapIcon, Upload, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { DialogTitle, DialogDescription } from '../ui/dialog';
import { DialogShell } from '../ui/dialog-shell';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSettingsStore, GENRES, MAP_STYLES, type Genre, type MapStyle } from '../../store/settingsStore';
import { useCaseSettingsStore } from '../../store/caseSettingsStore';
import { assetMap } from '../../hooks/useAutoSave';
import { cacheAsset, getCachedAsset } from '../../lib/assetCache';
import { mimeFromExt } from '../../lib/mime';
import { hasFileSystemAccess } from '../../file/fileHandle';

const MAP_STYLE_LABEL: Record<MapStyle, string> = {
  dark: 'Dark',
  light: 'Light',
  osm: 'OSM Standard',
  custom: 'Custom',
  image: 'Image',
};

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

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
  const preferBrowserStorage = useSettingsStore((s) => s.preferBrowserStorage);
  const setPreferBrowserStorage = useSettingsStore((s) => s.setPreferBrowserStorage);
  const mapStyle = useSettingsStore((s) => s.mapStyle);
  const setMapStyle = useSettingsStore((s) => s.setMapStyle);
  const customMapUrl = useSettingsStore((s) => s.customMapUrl);
  const setCustomMapUrl = useSettingsStore((s) => s.setCustomMapUrl);
  const mapImageAssetId = useCaseSettingsStore((s) => s.settings.mapImageAssetId);
  const setMapImage = useCaseSettingsStore((s) => s.setMapImage);
  const clearMapImage = useCaseSettingsStore((s) => s.clearMapImage);
  const mapImageInputRef = useRef<HTMLInputElement | null>(null);
  const mapImagePreviewUrl = mapImageAssetId ? getCachedAsset(mapImageAssetId) : undefined;

  const handleMapImageFile = async (file: File) => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const mimeType = file.type || mimeFromExt(ext);
    const buffer = await file.arrayBuffer();
    const probeUrl = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
    try {
      const { width, height } = await imageDimensions(probeUrl);
      if (mapImageAssetId) assetMap.delete(mapImageAssetId);
      const assetId = `map-${nanoid()}.${ext}`;
      assetMap.set(assetId, buffer);
      cacheAsset(assetId, buffer, mimeType);
      setMapImage(assetId, width, height);
    } catch {
      // Not a decodable image — ignore the upload
    } finally {
      URL.revokeObjectURL(probeUrl);
    }
  };

  const handleClearMapImage = () => {
    if (mapImageAssetId) assetMap.delete(mapImageAssetId);
    clearMapImage();
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-md"
      header={
        <>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Theme preferences, stored on this device only.</DialogDescription>
        </>
      }
    >
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

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-mono">Map</Label>
            <div className="rounded-lg border border-border px-3 py-2.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <MapIcon size={14} className="text-muted-foreground" />
                <Label className="text-sm">Map source</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MAP_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={`rounded-md border px-2.5 py-1.5 text-[12px] text-left transition-colors ${
                      mapStyle === style
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                    }`}
                  >
                    {MAP_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
              {mapStyle === 'custom' && (
                <div className="space-y-1">
                  <Input
                    value={customMapUrl}
                    onChange={(e) => setCustomMapUrl(e.target.value)}
                    placeholder="https://{s}.example.com/{z}/{x}/{y}.png"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    A tile URL template with <code>{'{s}'}</code>, <code>{'{z}'}</code>, <code>{'{x}'}</code>, <code>{'{y}'}</code> placeholders.
                  </div>
                </div>
              )}
              {mapStyle === 'image' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-muted-foreground">
                    A single image used as the map instead of real-world tiles — for a fictional or
                    hand-drawn game-world location. Stored in this case file.
                  </div>
                  {mapImagePreviewUrl ? (
                    <div className="relative overflow-hidden rounded-md border border-border">
                      <img src={mapImagePreviewUrl} alt="" className="max-h-32 w-full object-contain bg-background" />
                      <button
                        onClick={handleClearMapImage}
                        className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove map image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
                  <input
                    ref={mapImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleMapImageFile(file);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => mapImageInputRef.current?.click()}>
                    <Upload size={12} />
                    {mapImagePreviewUrl ? 'Replace image' : 'Upload image'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {hasFileSystemAccess() && (
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-mono">Storage</Label>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-muted-foreground" />
                  <div>
                    <Label className="text-sm">Use browser storage for new cases</Label>
                    <div className="text-[11px] text-muted-foreground">Default is a real .citr file on disk — this keeps new cases in this browser instead</div>
                  </div>
                </div>
                <Switch checked={preferBrowserStorage} onCheckedChange={setPreferBrowserStorage} />
              </div>
            </div>
          )}
        </div>
    </DialogShell>
  );
}
