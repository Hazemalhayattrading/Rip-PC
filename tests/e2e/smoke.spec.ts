import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import {
  KNOWN_ROUTES,
  BASE_PATH,
  htmlFileOf,
  matchPath,
  metaOf,
  pathOf,
} from '../../src/app/routes.ts';
import { GARAGE_TEXT } from '../../src/components/garage/garage-text.ts';
import { projectMeta } from '../lib/project-meta.ts';
import { expect, test } from './fixtures.ts';

// Every test here also runs under the shared fixture (./fixtures.ts), which fails it on any
// console error, page error, unhandled rejection, failed same-origin request or crash.

// ---------------------------------------------------------------------------------------------
// Helpers

/** Records the path of every request the page makes. */
function collectRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (request) => {
    paths.push(new URL(request.url()).pathname);
  });
  return paths;
}

/** Records every http(s) request the page makes, as a URL. */
function collectHttpRequests(page: Page): URL[] {
  const urls: URL[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') urls.push(url);
  });
  return urls;
}

/** Requests that did not go to this site under the Pages base path, e.g. a build with the wrong base. */
function outsideTheSite(requests: readonly URL[], pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  return requests
    .filter((url) => url.origin !== origin || !url.pathname.startsWith(BASE_PATH))
    .map((url) => url.href);
}

/** Route paths are relative to the base; drop the leading slash so baseURL's /Rip-PC/ is kept. */
function relative(path: string): string {
  return path.slice(1);
}

function heading(page: Page) {
  return page.getByRole('heading', { level: 1 });
}

// ---------------------------------------------------------------------------------------------
// The build output, read from the Vite manifest

interface ManifestChunk {
  readonly file: string;
  readonly imports?: readonly string[];
  readonly isDynamicEntry?: boolean;
}

const DIST = resolve(import.meta.dirname, '../../dist');
const GARAGE_MODULE = 'src/three/Garage.tsx';
const manifest = JSON.parse(readFileSync(resolve(DIST, '.vite/manifest.json'), 'utf8')) as Readonly<
  Record<string, ManifestChunk>
>;

/** A chunk's file plus every file it imports statically, recursively. */
function staticClosure(key: string): Set<string> {
  const files = new Set<string>();
  const visit = (current: string): void => {
    const chunk = manifest[current];
    if (chunk === undefined || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit(key);
  return files;
}

const initialFiles = staticClosure('index.html');
/** Files that only the 3D preview needs: its chunk and anything it imports that `/` does not. */
const garageFiles = [...staticClosure(GARAGE_MODULE)].filter((file) => !initialFiles.has(file));
const isGarageRequest = (path: string) => garageFiles.some((file) => path.endsWith(`/${file}`));
/** A string only three.js contains; it must never appear in the initial JS. */
const THREE_MARKER = 'THREE.WebGLRenderer';

// ---------------------------------------------------------------------------------------------

test.describe('every known route loads directly', { tag: '@smoke' }, () => {
  for (const route of KNOWN_ROUTES) {
    const path = pathOf(route);
    const meta = metaOf(route);

    test(`${path} answers 200 with its own page`, async ({ page }, testInfo) => {
      const requests = collectHttpRequests(page);
      const response = await page.goto(relative(path));

      expect(response?.status()).toBe(200);
      expect(response?.request().redirectedFrom()).toBeNull();
      // The static file for this route, not the 404 page: its title is in the HTML itself.
      expect(await response?.text()).toContain(`<title>${meta.title}</title>`);

      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(heading(page)).toHaveText(meta.heading);
      await expect(page).toHaveTitle(meta.title);
      // English only (CLAUDE.md rule 10), declared for assistive technology.
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      if (route.name === 'build') {
        // Wait for the 3D preview, so errors it logs while starting are caught too.
        await expect(
          page.getByRole('region', { name: GARAGE_TEXT.region }).locator('canvas'),
        ).toBeVisible();
      }
      // Every file comes from this site under /Rip-PC/, as GitHub Pages will serve it.
      expect(outsideTheSite(requests, page.url())).toEqual([]);

      // QA-P0-005: at the soak width, keep watching, so a console error or unhandled rejection
      // that comes a second after these checks still fails here (budget.json console.soakMs).
      // Without it, a rejection 1 s after start passed every smoke test.
      const { soakMs } = projectMeta(testInfo);
      if (soakMs > 0) {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(soakMs);
      }
    });
  }
});

test.describe('unknown paths', { tag: '@smoke' }, () => {
  // These tests ask for pages that do not exist, so the 404 answer for the page itself is
  // expected. Any other failed request still fails them (tests/e2e/problems.ts).
  test.use({ expectNotFoundDocument: true });

  for (const path of ['/no-such-page', '/build/no-such-step', '/build']) {
    test(`${path} answers 404 with the app's 404 view`, async ({ page }) => {
      const requests = collectHttpRequests(page);
      const response = await page.goto(relative(path));
      const meta = metaOf({ name: 'not-found' });

      expect(response?.status()).toBe(404);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(heading(page)).toHaveText(meta.heading);
      await expect(page).toHaveTitle(meta.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      expect(outsideTheSite(requests, page.url())).toEqual([]);
    });
  }

  test('a trailing slash gets a link to the canonical page', async ({ page }) => {
    await page.goto('build/cpu/');
    await expect(heading(page)).toHaveText('Page not found');
    await page.getByRole('link', { name: 'Step 3 of 12: CPU' }).click();
    await expect(page).toHaveURL((url) => url.pathname === `${BASE_PATH}build/cpu`);
    await expect(heading(page)).toHaveText('Step 3 of 12: CPU');
  });
});

// QA-P1-002 (build-lead, WP-E0): a path that ends in /index.html renders its directory's route,
// because the host serves that file with a 200. Each test runs once the route table shows its
// fix is in, so this file stays green whichever lands first; QA checks that they ran when it
// verifies the fix.
test.describe('index.html paths', { tag: '@smoke' }, () => {
  const indexFixed = matchPath('/index.html').name === 'home';
  // Keyed on the file the host serves, which stays put whether the lab's path ends in a slash.
  const labIndex = KNOWN_ROUTES.find((route) => htmlFileOf(route) === 'lab/index.html');

  test('/index.html is the home page, with a 200 and no redirect', async ({ page }) => {
    test.skip(!indexFixed, 'QA-P1-002 is not in yet: matchPath does not map /index.html home');
    const response = await page.goto('index.html');
    const meta = metaOf({ name: 'home' });
    expect(response?.status()).toBe(200);
    expect(response?.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}index.html`);
    await expect(heading(page)).toHaveText(meta.heading);
    await expect(page).toHaveTitle(meta.title);
  });

  test('/lab/index.html is the lab index, with a 200 and no redirect', async ({ page }) => {
    test.skip(
      !indexFixed || labIndex === undefined,
      'waits for QA-P1-002 and for the lab index route (WP-E0)',
    );
    if (labIndex === undefined) return;
    const response = await page.goto('lab/index.html');
    const meta = metaOf(labIndex);
    expect(response?.status()).toBe(200);
    expect(response?.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}lab/index.html`);
    await expect(heading(page)).toHaveText(meta.heading);
    await expect(page).toHaveTitle(meta.title);
  });

  test.describe('a directory without a route', () => {
    test.use({ expectNotFoundDocument: true });

    test('/build/index.html stays not found', async ({ page }) => {
      const response = await page.goto('build/index.html');
      const meta = metaOf({ name: 'not-found' });
      expect(response?.status()).toBe(404);
      await expect(heading(page)).toHaveText(meta.heading);
      await expect(page).toHaveTitle(meta.title);
    });
  });
});

test.describe('the 3D preview', { tag: '@smoke' }, () => {
  test('is a separate lazy chunk, and the initial JS holds no three.js code', () => {
    expect(manifest[GARAGE_MODULE]?.isDynamicEntry).toBe(true);
    expect(garageFiles).toContain(manifest[GARAGE_MODULE]?.file);
    const read = (file: string) => readFileSync(resolve(DIST, file), 'utf8');
    for (const file of initialFiles) {
      expect(read(file), `${file} must not contain three.js`).not.toContain(THREE_MARKER);
    }
    expect(garageFiles.some((file) => read(file).includes(THREE_MARKER))).toBe(true);
  });

  test('is never requested by the landing page', async ({ page }) => {
    const requests = collectRequests(page);
    await page.goto('');
    await expect(heading(page)).toHaveText('Rig Lab');
    await page.waitForLoadState('networkidle');
    expect(requests.length).toBeGreaterThan(1);
    expect(requests.filter(isGarageRequest)).toEqual([]);
  });

  test('loads on a build step and draws into a canvas without shifting the page', async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto('build/cpu');
    const region = page.getByRole('region', { name: GARAGE_TEXT.region });
    await expect(region.locator('canvas')).toBeVisible();
    expect(requests.some(isGarageRequest)).toBe(true);

    // Cumulative layout shift since navigation: the region reserves its box, so it must be 0.
    // Every shift counts, even one flagged as following input: this test gives no input, and
    // under mobile emulation (390 px) Chromium 1194 flags real shifts on this page as recent
    // input anyway, which would hide them (measured 2026-09-30, test plan §6.4).
    const layoutShift = await page.evaluate(
      () =>
        new Promise<number>((resolveShift) => {
          interface LayoutShift extends PerformanceEntry {
            readonly value: number;
          }
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as LayoutShift[]) {
              total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            resolveShift(total);
          }, 500);
        }),
    );
    expect(layoutShift).toBe(0);
  });

  test('without WebGL 2 shows a message and never downloads the chunk', async ({ page }) => {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with .call(this)
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value(this: HTMLCanvasElement, contextId: string, options?: unknown) {
          return contextId === 'webgl2' ? null : original.call(this, contextId, options);
        },
      });
    });
    const requests = collectRequests(page);
    await page.goto('build/cpu');
    const region = page.getByRole('region', { name: GARAGE_TEXT.region });
    await expect(region).toHaveText(GARAGE_TEXT.noWebGL);
    await page.waitForLoadState('networkidle');
    expect(requests.filter(isGarageRequest)).toEqual([]);
  });
});

test.describe('the build in the URL', { tag: '@smoke' }, () => {
  // Synthetic part ids: the codec is generic and knows nothing about the catalogue.
  const build = 'v1.c_test-cpu-a.g_test-gpu-b';
  const at = (path: string) => (url: URL) =>
    url.pathname === `${BASE_PATH}${path}` && url.searchParams.get('b') === build;

  test('survives in-app navigation, Back and reload', async ({ page }) => {
    await page.goto(`build/cpu?b=${build}`);
    await expect(heading(page)).toHaveText('Step 3 of 12: CPU');

    await page.getByRole('link', { name: 'Next: Motherboard' }).click();
    await expect(page).toHaveURL(at('build/motherboard'));
    await expect(heading(page)).toHaveText('Step 4 of 12: Motherboard');
    // Focus moves to the new page, as it would after a full page load.
    await expect(page.getByRole('main')).toBeFocused();

    await page
      .getByRole('navigation', { name: 'Site' })
      .getByRole('link', { name: 'Results' })
      .click();
    await expect(page).toHaveURL(at('results'));
    await expect(heading(page)).toHaveText('Results');

    await page.goBack();
    await expect(page).toHaveURL(at('build/motherboard'));
    await expect(heading(page)).toHaveText('Step 4 of 12: Motherboard');

    await page.reload();
    await expect(page).toHaveURL(at('build/motherboard'));
    await expect(heading(page)).toHaveText('Step 4 of 12: Motherboard');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  for (const [label, value] of [
    ['garbage', '%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
    ['a format from a newer version', 'v2.c_test-cpu-a'],
    ['an unknown category', 'v1.z_test-part'],
  ] as const) {
    test(`drops ${label}, says so, and keeps working`, async ({ page }) => {
      const response = await page.goto(`build/cpu?b=${value}`);
      expect(response?.status()).toBe(200);
      await expect(heading(page)).toHaveText('Step 3 of 12: CPU');
      await expect(page.getByRole('status')).toHaveText(/build in this link could not be read/);
      await expect(page).toHaveURL(
        (url) => url.pathname === `${BASE_PATH}build/cpu` && !url.searchParams.has('b'),
      );
      await expect(page.getByRole('link', { name: 'Next: Motherboard' })).toHaveAttribute(
        'href',
        `${BASE_PATH}build/motherboard`,
      );
    });
  }
});
