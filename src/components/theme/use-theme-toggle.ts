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

export interface ThemeToggleState {
  /** Whether light is on: the toggle's `aria-pressed`. */
  readonly light: boolean;
  /** Switches the page between dark and light, and remembers the choice. */
  readonly toggle: () => void;
}

/**
 * The theme switch's behaviour (tokens.md §1.3), shared by every toggle that draws it: the
 * product's text button and the lab's round button. index.html's inline script has already
 * restored a stored choice, before the first paint.
 */
export function useThemeToggle(): ThemeToggleState {
  const [theme, setTheme] = useState<Theme>(() => currentTheme(document.documentElement));

  function toggle(): void {
    const next: Theme = currentTheme(document.documentElement) === 'light' ? 'dark' : 'light';
    applyTheme(next, pageThemeTarget());
    setTheme(next);
  }

  return { light: theme === 'light', toggle };
}
