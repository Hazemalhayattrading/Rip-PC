/**
 * The page theme (docs/design/tokens.md §1.3). Rig Lab opens dark on every first visit; light
 * is the visitor's choice, never the operating system's (`prefers-color-scheme` is ignored), and
 * never part of a share link.
 *
 * `data-theme` on `<html>` switches every colour token at once. The choice is stored in
 * localStorage, and the inline script in index.html restores it before the first paint, so the
 * names and colours there must match these (theme.test.ts runs that script to prove it).
 */
export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'rig-lab-theme';

/** The phone browser's toolbar colour: each theme's `--stage` in src/styles/tokens.css. */
export const THEME_COLOR: Readonly<Record<Theme, string>> = {
  dark: '#131416',
  light: '#f3f3f1',
};

/** The parts of the page a theme change touches. */
export interface ThemeTarget {
  /** `<html>`. */
  readonly root: { readonly dataset: DOMStringMap };
  /** `<meta name="theme-color">`, or `null` when the page has none. */
  readonly themeColor: { content: string } | null;
  /** localStorage. Even reading it can throw (private windows, blocked site data). */
  readonly storage: () => Pick<Storage, 'setItem'>;
}

/** The theme the page shows. Anything but `light` is the dark default. */
export function currentTheme(root: { readonly dataset: DOMStringMap }): Theme {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Shows `theme`, and remembers it for the next visit when storage allows. */
export function applyTheme(theme: Theme, target: ThemeTarget): void {
  target.root.dataset.theme = theme;
  if (target.themeColor !== null) target.themeColor.content = THEME_COLOR[theme];
  try {
    target.storage().setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is blocked: the choice lasts until the page is closed.
  }
}
