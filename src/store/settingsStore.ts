import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GENRES, type Genre } from '../game/types';
import { MAP_STYLES, type MapStyle } from '../lib/locationUtils';

export type { Genre };
export { GENRES };
export type { MapStyle };
export { MAP_STYLES };
export type Mode = 'light' | 'dark';

export interface Automations {
  autoAdvanceDay: boolean;
}

const DEFAULT_AUTOMATIONS: Automations = { autoAdvanceDay: true };

interface SettingsState {
  genre: Genre;
  mode: Mode;
  automations: Automations;
  /** Opt into IndexedDB (browser) storage for new cases even on browsers that
   *  support the File System Access API — which otherwise defaults to real
   *  files. Browsers without file support (Safari/mobile) always use
   *  IndexedDB regardless of this setting. */
  preferBrowserStorage: boolean;
  /** Map tile source used for location pins on the board and in the picker. */
  mapStyle: MapStyle;
  /** Tile URL template (e.g. `https://{s}.example.com/{z}/{x}/{y}.png`) used when mapStyle is 'custom'. */
  customMapUrl: string;
  setGenre: (genre: Genre) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  setAutomation: <K extends keyof Automations>(key: K, value: Automations[K]) => void;
  setPreferBrowserStorage: (value: boolean) => void;
  setMapStyle: (style: MapStyle) => void;
  setCustomMapUrl: (url: string) => void;
}

// The only sanctioned localStorage use in this app — a display preference,
// not case data. Case data lives exclusively in the .citr file.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      genre: 'noir',
      mode: 'dark',
      automations: DEFAULT_AUTOMATIONS,
      preferBrowserStorage: false,
      mapStyle: 'dark',
      customMapUrl: '',
      setGenre: (genre) => set({ genre }),
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
      setAutomation: (key, value) => set((s) => ({ automations: { ...s.automations, [key]: value } })),
      setPreferBrowserStorage: (preferBrowserStorage) => set({ preferBrowserStorage }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      setCustomMapUrl: (customMapUrl) => set({ customMapUrl }),
    }),
    {
      name: 'citr-companion-settings',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SettingsState>),
        automations: { ...DEFAULT_AUTOMATIONS, ...(persisted as Partial<SettingsState>)?.automations },
      }),
    },
  ),
);
