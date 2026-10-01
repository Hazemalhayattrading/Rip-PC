import { useState } from 'react';
import { applyTheme, currentTheme, type Theme, type ThemeTarget } from '../../state/theme';

/** The live page: `<html>`, its theme-color tag and localStorage. */
function pageThemeTarget(): ThemeTarget {
  return {
    root: document.documentElement,
    themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]'),
    storage: () => window.localStorage,
  };
}

/**
 * The theme switch (docs/design/tokens.md §1.3): a toggle button whose name stays "Light theme",
 * while aria-pressed says whether light is on. Phase 0 shows it as text at the end of the site
 * header; Phase 2 moves it into the top bar's round button.
 */
export function ThemeToggle() {
  // index.html's inline script has already restored a stored choice, before the first paint.
  const [theme, setTheme] = useState<Theme>(() => currentTheme(document.documentElement));

  function toggle() {
    const next: Theme = currentTheme(document.documentElement) === 'light' ? 'dark' : 'light';
    applyTheme(next, pageThemeTarget());
    setTheme(next);
  }

  // min-h-6: Rig Lab's hit areas are at least 24 x 24 px (tokens.md §2.5).
  return (
    <button type="button" className="min-h-6" aria-pressed={theme === 'light'} onClick={toggle}>
      Light theme
    </button>
  );
}
