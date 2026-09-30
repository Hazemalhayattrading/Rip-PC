import { expect, test, type Page } from '@playwright/test';
import { KNOWN_ROUTES, metaOf, pathOf } from '../../src/app/routes.ts';

interface PageProblem {
  readonly kind: 'console.error' | 'pageerror';
  readonly text: string;
  /** Where a console message came from; empty for page errors. */
  readonly url: string;
}

/** Collects console errors and uncaught page errors from the moment it is called. */
function collectProblems(page: Page): PageProblem[] {
  const problems: PageProblem[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push({ kind: 'console.error', text: message.text(), url: message.location().url });
    }
  });
  page.on('pageerror', (error) => {
    problems.push({ kind: 'pageerror', text: error.message, url: '' });
  });
  return problems;
}

/**
 * Chromium always logs this console error when the document itself comes back 404. On a 404
 * page that is the status we asked for, not an app error, so it is the one message allowed,
 * and only for the document's own URL. A 404 for any other URL still fails the test.
 */
function isOwnDocument404(problem: PageProblem, documentUrl: string): boolean {
  return (
    problem.kind === 'console.error' &&
    problem.url === documentUrl &&
    problem.text ===
      'Failed to load resource: the server responded with a status of 404 (Not Found)'
  );
}

/** Route paths are relative to the base; drop the leading slash so baseURL's /Rip-PC/ is kept. */
function relative(path: string): string {
  return path.slice(1);
}

test.describe('every known route loads directly', { tag: '@smoke' }, () => {
  for (const route of KNOWN_ROUTES) {
    const path = pathOf(route);
    const meta = metaOf(route);

    test(`${path} answers 200 with its own page`, async ({ page }) => {
      const problems = collectProblems(page);
      const response = await page.goto(relative(path));

      expect(response?.status()).toBe(200);
      expect(response?.request().redirectedFrom()).toBeNull();
      // The static file for this route, not the 404 page: its title is in the HTML itself.
      expect(await response?.text()).toContain(`<title>${meta.title}</title>`);

      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(meta.heading);
      await expect(page).toHaveTitle(meta.title);
      expect(problems).toEqual([]);
    });
  }
});

test.describe('unknown paths', { tag: '@smoke' }, () => {
  for (const path of ['/no-such-page', '/build/no-such-step', '/build']) {
    test(`${path} answers 404 with the app's 404 view`, async ({ page }) => {
      const problems = collectProblems(page);
      const response = await page.goto(relative(path));
      const meta = metaOf({ name: 'not-found' });

      expect(response?.status()).toBe(404);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(meta.heading);
      await expect(page).toHaveTitle(meta.title);
      expect(problems.filter((problem) => !isOwnDocument404(problem, page.url()))).toEqual([]);
    });
  }
});
