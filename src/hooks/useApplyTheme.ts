import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Syncs the active genre + light/dark mode onto <html> as data-genre / .dark. */
export function useApplyTheme() {
  const genre = useSettingsStore((s) => s.genre);
  const mode = useSettingsStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.genre = genre;
    root.classList.toggle('dark', mode === 'dark');
  }, [genre, mode]);
}
