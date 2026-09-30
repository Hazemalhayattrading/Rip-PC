import { describe, expect, it } from 'vitest';
import {
  BUILD_STEPS,
  KNOWN_ROUTES,
  NOT_FOUND_HTML_FILE,
  htmlFileOf,
  isBuildStep,
  matchPath,
  metaOf,
  neighbourSteps,
  pathOf,
  suggestRoute,
} from './routes';

describe('route table', () => {
  it('lists home, the 12 build steps in plan order, then the four result pages', () => {
    expect(KNOWN_ROUTES.map(pathOf)).toEqual([
      '/',
      '/build/use-case',
      '/build/budget',
      '/build/cpu',
      '/build/motherboard',
      '/build/ram',
      '/build/gpu',
      '/build/storage',
      '/build/psu',
      '/build/cooling',
      '/build/case',
      '/build/looks',
      '/build/review',
      '/results',
      '/bottleneck',
      '/buy',
      '/sources',
    ]);
  });

  it('gives every route and the 404 view a unique heading and title', () => {
    const metas = [...KNOWN_ROUTES, { name: 'not-found' } as const].map(metaOf);
    const headings = metas.map((m) => m.heading);
    const titles = metas.map((m) => m.title);
    expect(new Set(headings).size).toBe(headings.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const meta of metas) {
      expect(meta.heading.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });

  it('numbers build step headings from 1 to 12', () => {
    expect(metaOf({ name: 'build', step: 'use-case' }).heading).toBe('Step 1 of 12: Use case');
    expect(metaOf({ name: 'build', step: 'cpu' }).heading).toBe('Step 3 of 12: CPU');
    expect(metaOf({ name: 'build', step: 'review' }).heading).toBe('Step 12 of 12: Review');
    expect(metaOf({ name: 'build', step: 'cpu' }).title).toBe('Step 3 of 12: CPU · Rig Lab');
    expect(metaOf({ name: 'build', step: 'cpu' }).description).toBe(
      'Build step 3 of 12: choose the CPU.',
    );
  });
});

describe('matchPath', () => {
  it('round-trips every known route through its path', () => {
    for (const route of KNOWN_ROUTES) {
      expect(matchPath(pathOf(route))).toEqual(route);
    }
  });

  it.each([
    '/build',
    '/build/',
    '/build/cpu/',
    '/build/CPU',
    '/build/nope',
    '/results/',
    '/Results',
    '/index.html',
    '',
    '//',
    '/build/cpu/extra',
  ])('treats %j as not found', (path) => {
    expect(matchPath(path)).toEqual({ name: 'not-found' });
  });
});

describe('suggestRoute', () => {
  it('suggests the canonical route for a trailing slash or wrong case', () => {
    expect(suggestRoute('/build/cpu/')).toEqual({ name: 'build', step: 'cpu' });
    expect(suggestRoute('/BUILD/CPU')).toEqual({ name: 'build', step: 'cpu' });
    expect(suggestRoute('/Results/')).toEqual({ name: 'results' });
    expect(suggestRoute('//')).toEqual({ name: 'home' });
  });

  it('suggests the canonical route for the .html files GitHub Pages also serves', () => {
    expect(suggestRoute('/index.html')).toEqual({ name: 'home' });
    expect(suggestRoute('/build/cpu.html')).toEqual({ name: 'build', step: 'cpu' });
    expect(suggestRoute('/build/cpu/index.html')).toEqual({ name: 'build', step: 'cpu' });
    expect(suggestRoute('/404.html')).toBeNull();
  });

  it('suggests nothing for exact matches or unrelated paths', () => {
    expect(suggestRoute('/')).toBeNull();
    expect(suggestRoute('/build/cpu')).toBeNull();
    expect(suggestRoute('/build/nope')).toBeNull();
    expect(suggestRoute('/nowhere')).toBeNull();
  });
});

describe('build steps', () => {
  it('recognises only the 12 step ids', () => {
    for (const step of BUILD_STEPS) expect(isBuildStep(step)).toBe(true);
    expect(isBuildStep('CPU')).toBe(false);
    expect(isBuildStep('fans')).toBe(false);
    expect(isBuildStep('')).toBe(false);
  });

  it('links each step to its neighbours, with none before the first or after the last', () => {
    expect(neighbourSteps('use-case')).toEqual({ previous: null, next: 'budget' });
    expect(neighbourSteps('cpu')).toEqual({ previous: 'budget', next: 'motherboard' });
    expect(neighbourSteps('review')).toEqual({ previous: 'looks', next: null });
  });
});

describe('htmlFileOf', () => {
  it('maps routes to flat .html files so GitHub Pages answers 200 without a redirect', () => {
    expect(htmlFileOf({ name: 'home' })).toBe('index.html');
    expect(htmlFileOf({ name: 'build', step: 'cpu' })).toBe('build/cpu.html');
    expect(htmlFileOf({ name: 'sources' })).toBe('sources.html');
    expect(NOT_FOUND_HTML_FILE).toBe('404.html');
  });

  it('never writes x.html next to a directory x/, which GitHub Pages would resolve ambiguously', () => {
    const files = [...KNOWN_ROUTES.map(htmlFileOf), NOT_FOUND_HTML_FILE];
    expect(new Set(files).size).toBe(files.length);
    const directories = new Set(
      files.flatMap((file) => {
        const parts = file.split('/').slice(0, -1);
        return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
      }),
    );
    for (const file of files) {
      expect(directories.has(file.replace(/\.html$/, ''))).toBe(false);
    }
  });
});
