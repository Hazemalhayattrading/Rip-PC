import type { Page, TestInfo } from '@playwright/test';
import { BASE_PATH, matchPath, metaOf, pathOf } from '../../src/app/routes.ts';
import { expect, test } from './fixtures.ts';

// In-app navigation by the visitor's own input (test plan §12.1). Hazem reported on 2026-10-02
// that "Build" and "Start a build" seemed to stay on the home page of the live site, while a
// direct load of /build/use-case worked. The smoke test loads every route directly. This spec
// activates every in-site link on one page of each kind, by tap at the touch widths and by mouse
// at 1440 px, and checks what the visitor sees: the URL, the title, and the new page's h1 on
// screen. tests/e2e/live/playwright.config.ts runs it against the live site in five browsers.

interface Start {
  readonly name: string;
  readonly path: string;
}

const STARTS: readonly Start[] = [
  { name: 'the home page', path: pathOf({ name: 'home' }) },
  { name: 'the first build step', path: pathOf({ name: 'build', step: 'use-case' }) },
  { name: 'a middle build step', path: pathOf({ name: 'build', step: 'ram' }) },
  { name: 'the last build step', path: pathOf({ name: 'build', step: 'review' }) },
  { name: 'a summary page', path: pathOf({ name: 'results' }) },
];

/** No file has this path, so the site answers 404, and the app suggests /build/cpu. */
const NOT_FOUND_START: Start = { name: 'the 404 page', path: '/Build/CPU' };

/**
 * QA-P1-001 (open, build-lead, Major): after an in-app navigation the page keeps its scroll
 * position, so at 1440 px a link low on a build step leaves the new page scrolled past its
 * heading, and the screen looks unchanged. Where it applies, the test checks that it still
 * reproduces. When the fix lands that check fails, and the entry comes off this list.
 */
const KNOWN_OFF_SCREEN = {
  defect: 'QA-P1-001',
  /** Viewport widths, so the live runs in every browser (tests/e2e/live) honour it too. */
  widths: [1440],
  starts: STARTS.filter((s) => s.path.startsWith('/build/')).map((s) => s.path),
};

/** The page's path relative to the site base, as the route table writes it. */
function routePath(page: Page): string {
  return new URL(page.url()).pathname.slice(BASE_PATH.length - 1);
}

/** Every link on the page that stays on the site, in document order: nav, calls to action, steps. */
async function inSiteLinks(page: Page): Promise<{ text: string; href: string }[]> {
  return page
    .locator(`a[href^="${BASE_PATH}"]`)
    .evaluateAll((anchors) =>
      anchors.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') ?? '' })),
    );
}

/** A mark on the current document: it survives an in-app navigation, never a full page load. */
async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { qaSameDocument?: boolean }).qaSameDocument = true;
  });
}

async function sameDocument(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as Window & { qaSameDocument?: boolean }).qaSameDocument === true,
  );
}

/** Touch where the project has it (390 and 768 px), the mouse otherwise. */
function usesTouch(testInfo: TestInfo): boolean {
  return testInfo.project.use.hasTouch === true;
}

async function walkEveryLink(page: Page, start: Start, testInfo: TestInfo): Promise<void> {
  const heading = page.getByRole('heading', { level: 1 });
  const startHeading = metaOf(matchPath(start.path)).heading;
  await page.goto(start.path.slice(1));
  await expect(heading).toHaveText(startHeading);
  const links = await inSiteLinks(page);
  expect(links.length, `in-site links on ${start.name}`).toBeGreaterThan(0);
  const touch = usesTouch(testInfo);
  const offScreen: string[] = [];

  for (const [index, link] of links.entries()) {
    const target = new URL(link.href, page.url()).pathname.slice(BASE_PATH.length - 1);
    await test.step(`${touch ? 'tap' : 'click'} "${link.text}" (${link.href})`, async () => {
      await markDocument(page);
      const anchor = page.locator(`a[href^="${BASE_PATH}"]`).nth(index);
      await expect(anchor).toHaveText(link.text);
      if (touch) await anchor.tap();
      else await anchor.click();

      const meta = metaOf(matchPath(target));
      await expect.poll(() => routePath(page), { message: 'the URL' }).toBe(target);
      await expect(page).toHaveTitle(meta.title);
      await expect(heading).toHaveText(meta.heading);
      expect(await sameDocument(page), 'an in-app navigation, not a full page load').toBe(true);
      // What the visitor sees: the new page's heading on screen, not only in the document.
      const onScreen = await heading.evaluate((h) => {
        const box = h.getBoundingClientRect();
        return box.bottom > 0 && box.top < window.innerHeight;
      });
      if (!onScreen) offScreen.push(link.text);

      // Back returns to where the visitor was, so the next link starts from the same page.
      if (target !== start.path) {
        await page.goBack();
        await expect
          .poll(() => routePath(page), { message: 'the URL after Back' })
          .toBe(start.path);
        await expect(heading).toHaveText(startHeading);
      }
    });
  }

  const known =
    KNOWN_OFF_SCREEN.widths.includes(testInfo.project.use.viewport?.width ?? 0) &&
    KNOWN_OFF_SCREEN.starts.includes(start.path);
  if (known) {
    testInfo.annotations.push({
      type: 'known defect',
      description: `${KNOWN_OFF_SCREEN.defect}: heading off screen after ${offScreen.join(', ')}`,
    });
    expect(
      offScreen.length,
      `${KNOWN_OFF_SCREEN.defect} no longer reproduces: take this start off KNOWN_OFF_SCREEN`,
    ).toBeGreaterThan(0);
  } else {
    expect(offScreen, "links after which the new page's heading is off screen").toEqual([]);
  }
}

test.describe('in-app navigation, by tap or by mouse @smoke @nav', () => {
  for (const start of STARTS) {
    test(`every link on ${start.name} opens its page on screen`, async ({ page }, testInfo) => {
      await walkEveryLink(page, start, testInfo);
    });
  }

  test.describe('from a page that does not exist', () => {
    test.use({ expectNotFoundDocument: true });

    test(`every link on ${NOT_FOUND_START.name} opens its page on screen`, async ({
      page,
    }, testInfo) => {
      await walkEveryLink(page, NOT_FOUND_START, testInfo);
    });
  });
});
