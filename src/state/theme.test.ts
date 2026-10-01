import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { THEME_COLOR, THEME_STORAGE_KEY, applyTheme, currentTheme, type ThemeTarget } from './theme';

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const tokensCss = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');

/** A theme's `--stage` in tokens.css: theme-color must match it (docs/design/tokens.md §1.2). */
function stageColor(theme: 'dark' | 'light'): string {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(tokensCss)?.[1];
  return /--stage:\s*(#[0-9a-f]{6});/.exec(block ?? '')?.[1] ?? `no --stage for ${theme}`;
}
const STAGE = { dark: stageColor('dark'), light: stageColor('light') };

/** The page index.html describes before any script runs. */
const htmlTheme = /<html\b[^>]*\sdata-theme="([^"]*)"/.exec(indexHtml)?.[1];
const htmlThemeColor = /<meta\s+name="theme-color"\s+content="([^"]*)"/.exec(indexHtml)?.[1];

/** The inline (classic, attribute-less) scripts in index.html. */
const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  ([, body]) => body ?? '',
);

type StorageMode = 'ok' | 'blocked' | 'calls-throw';

/** A fresh page as index.html opens it, with storage in the given state. */
function freshPage({
  stored,
  storage = 'ok',
  themeColorTag = true,
}: { stored?: string; storage?: StorageMode; themeColorTag?: boolean } = {}) {
  const dataset: DOMStringMap = { theme: htmlTheme };
  const themeColor = themeColorTag ? { content: htmlThemeColor ?? 'missing' } : null;
  const saved = new Map<string, string>();
  if (stored !== undefined) saved.set(THEME_STORAGE_KEY, stored);
  const store: Pick<Storage, 'getItem' | 'setItem'> = {
    getItem(key) {
      if (storage === 'calls-throw') throw new Error('SecurityError: storage is disabled');
      return saved.get(key) ?? null;
    },
    setItem(key, value) {
      if (storage === 'calls-throw') throw new Error('QuotaExceededError');
      saved.set(key, value);
    },
  };
  const target: ThemeTarget = {
    root: { dataset },
    themeColor,
    storage: () => {
      if (storage === 'blocked') throw new Error('SecurityError: the operation is insecure');
      return store;
    },
  };
  /** Runs index.html's inline script against this page, the way the browser would. */
  function boot(): void {
    const document = {
      documentElement: { dataset },
      querySelector: (selector: string) =>
        selector === 'meta[name="theme-color"]' ? themeColor : null,
    };
    const context = createContext({ document });
    Object.defineProperty(context, 'localStorage', {
      get() {
        if (storage === 'blocked') throw new Error('SecurityError: the operation is insecure');
        return store;
      },
    });
    for (const script of inlineScripts) runInContext(script, context);
  }
  return { dataset, themeColor, saved, target, boot };
}

describe('the page index.html serves', () => {
  it('opens dark, with the dark stage as its theme-color', () => {
    expect(htmlTheme).toBe('dark');
    expect(htmlThemeColor).toBe(STAGE.dark);
  });

  it('has exactly one inline script, the theme restore', () => {
    expect(inlineScripts).toHaveLength(1);
  });
});

describe('THEME_COLOR', () => {
  it("is each theme's --stage from tokens.css", () => {
    expect(THEME_COLOR).toEqual(STAGE);
  });
});

describe('currentTheme', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    [undefined, 'dark'],
    ['sepia', 'dark'],
  ])('reads data-theme %j as %s', (attribute, expected) => {
    expect(currentTheme({ dataset: { theme: attribute } })).toBe(expected);
  });
});

describe('applyTheme', () => {
  it('switches the page to light, colours the toolbar and remembers the choice', () => {
    const page = freshPage();
    applyTheme('light', page.target);
    expect(page.dataset.theme).toBe('light');
    expect(page.themeColor?.content).toBe(STAGE.light);
    expect(page.saved.get('rig-lab-theme')).toBe('light');
  });

  it('switches back to dark and remembers that too', () => {
    const page = freshPage({ stored: 'light' });
    applyTheme('light', page.target);
    applyTheme('dark', page.target);
    expect(page.dataset.theme).toBe('dark');
    expect(page.themeColor?.content).toBe(STAGE.dark);
    expect(page.saved.get('rig-lab-theme')).toBe('dark');
  });

  it('still switches the page when it has no theme-color tag', () => {
    const page = freshPage({ themeColorTag: false });
    applyTheme('light', page.target);
    expect(page.dataset.theme).toBe('light');
    expect(page.saved.get('rig-lab-theme')).toBe('light');
  });

  it.each<StorageMode>(['blocked', 'calls-throw'])(
    'still switches the page when storage is %s, and does not throw',
    (storage) => {
      const page = freshPage({ storage });
      expect(() => {
        applyTheme('light', page.target);
      }).not.toThrow();
      expect(page.dataset.theme).toBe('light');
      expect(page.themeColor?.content).toBe(STAGE.light);
    },
  );
});

describe('the inline script in index.html, before the first paint', () => {
  it('restores a stored light choice and colours the toolbar to match', () => {
    const page = freshPage({ stored: 'light' });
    page.boot();
    expect(page.dataset.theme).toBe('light');
    expect(page.themeColor?.content).toBe(STAGE.light);
  });

  it.each([undefined, 'dark', 'Light', 'sepia', ''])(
    'leaves the page dark when storage holds %j',
    (stored) => {
      const page = freshPage(stored === undefined ? {} : { stored });
      page.boot();
      expect(page.dataset.theme).toBe('dark');
      expect(page.themeColor?.content).toBe(STAGE.dark);
    },
  );

  it.each<StorageMode>(['blocked', 'calls-throw'])(
    'leaves the page dark, without throwing, when storage is %s',
    (storage) => {
      const page = freshPage({ stored: 'light', storage });
      expect(() => {
        page.boot();
      }).not.toThrow();
      expect(page.dataset.theme).toBe('dark');
    },
  );

  it('still restores light on a page without a theme-color tag', () => {
    const page = freshPage({ stored: 'light', themeColorTag: false });
    expect(() => {
      page.boot();
    }).not.toThrow();
    expect(page.dataset.theme).toBe('light');
  });
});

describe('what applyTheme stores is what the inline script restores', () => {
  it.each(['light', 'dark'] as const)('round-trips %s through storage', (theme) => {
    const before = freshPage();
    applyTheme(theme, before.target);
    const after = freshPage({ stored: before.saved.get(THEME_STORAGE_KEY) ?? 'nothing' });
    after.boot();
    expect(after.dataset.theme).toBe(theme);
    expect(after.themeColor?.content).toBe(STAGE[theme]);
  });
});
