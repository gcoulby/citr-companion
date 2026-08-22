import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Genre = 'noir' | 'fantasy' | 'horror' | 'scifi';
export type Mode = 'light' | 'dark';

export const GENRES: Genre[] = ['noir', 'fantasy', 'horror', 'scifi'];

export interface Automations {
  autoAdvanceDay: boolean;
}

const DEFAULT_AUTOMATIONS: Automations = { autoAdvanceDay: true };

interface SettingsState {
  genre: Genre;
  mode: Mode;
  automations: Automations;
  setGenre: (genre: Genre) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  setAutomation: <K extends keyof Automations>(key: K, value: Automations[K]) => void;
}

// The only sanctioned localStorage use in this app — a display preference,
// not case data. Case data lives exclusively in the .citr file.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      genre: 'noir',
      mode: 'dark',
      automations: DEFAULT_AUTOMATIONS,
      setGenre: (genre) => set({ genre }),
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
      setAutomation: (key, value) => set((s) => ({ automations: { ...s.automations, [key]: value } })),
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
