/**
 * Every page in its default state, in each visual project (docs/qa/test-plan.md §11).
 * Skipped until the design lands: see REPO_BASELINES_ENABLED and QA_SNAPSHOT_DIR in ./visual.ts.
 * Owner: qa-lead (visual-tester).
 */
import { KNOWN_ROUTES, metaOf, pathOf, type RouteMatch } from '../../src/app/routes.ts';
import { GARAGE_TEXT } from '../../src/components/garage/garage-text.ts';
import { expect, expectScreenshot, test } from './visual.ts';

/** A stable file name for a page's screenshot, e.g. "build-cpu.png". */
function shotName(match: RouteMatch, path: string): string {
  return match.name === 'not-found'
    ? 'not-found.png'
    : `${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}.png`;
}

const PAGES: readonly { readonly path: string; readonly match: RouteMatch }[] = [
  ...KNOWN_ROUTES.map((route) => ({ path: pathOf(route), match: route })),
  { path: '/no-such-page', match: { name: 'not-found' } },
];

test.describe('every page, default state', { tag: '@visual' }, () => {
  for (const { path, match } of PAGES) {
    test.describe(path, () => {
      if (match.name === 'not-found') test.use({ expectNotFoundDocument: true });

      test(`${path} looks as approved`, async ({ page }) => {
        const response = await page.goto(path.slice(1));
        expect(response?.status()).toBe(match.name === 'not-found' ? 404 : 200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(metaOf(match).heading);
        if (match.name === 'build') {
          await expect(
            page.getByRole('region', { name: GARAGE_TEXT.region }).locator('canvas'),
          ).toBeVisible();
        }
        await expectScreenshot(page, shotName(match, path));
      });
    });
  }
});
