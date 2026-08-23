import { create } from 'zustand';
import type { CaseSettings } from '../types';

interface CaseSettingsStoreState {
  settings: CaseSettings;
  setMapImage: (assetId: string, width: number, height: number) => void;
  clearMapImage: () => void;
  load: (settings: CaseSettings) => void;
  reset: () => void;
}

// Per-case settings (settings.json in the .citr file) — distinct from
// settingsStore, which holds device-level display prefs in localStorage.
export const useCaseSettingsStore = create<CaseSettingsStoreState>((set) => ({
  settings: {},
  setMapImage: (mapImageAssetId, mapImageWidth, mapImageHeight) =>
    set((s) => ({ settings: { ...s.settings, mapImageAssetId, mapImageWidth, mapImageHeight } })),
  clearMapImage: () =>
    set((s) => {
      const rest = { ...s.settings };
      delete rest.mapImageAssetId;
      delete rest.mapImageWidth;
      delete rest.mapImageHeight;
      return { settings: rest };
    }),
  load: (settings) => set({ settings }),
  reset: () => set({ settings: {} }),
}));
