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

    // Keeps the installed-PWA titlebar/status-bar colour in sync with
    // whichever of the 8 genre×mode palettes (index.css) is actually on
    // screen — reading the live computed --background rather than
    // duplicating the palette here, since the manifest's own theme_color is
    // static and only covers the pre-mount default.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const background = getComputedStyle(root).getPropertyValue('--background').trim();
    if (background) meta.content = background;
  }, [genre, mode]);
}
