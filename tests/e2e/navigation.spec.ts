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
 * heading, and the screen looks unchanged. Where it applies, the test records what it saw as an
 * annotation instead of failing, so build-lead's fix can land without touching this file. QA
 * removes the entry when it verifies the fix; every other check here stays in force.
 */
const KNOWN_OFF_SCREEN = {
  defect: 'QA-P1-001',
  /** Viewport widths, so the live runs in every browser (tests/e2e/live) honour it too. */
  widths: [1440],
  starts: STARTS.filter((s) => s.path.startsWith('/build/')).map((s) => s.path),
};

/**
 * design-lead's focus and scroll rules for an in-app page change (2026-10-03; written into
 * docs/design/components.md with WP-DS2 batch 2):
 * 1. A route change scrolls the window to the top at once, never smoothly, and moves focus to the
 *    new page's h1 without scrolling: the header, the site nav and the h1 are on screen, at
 *    scrollY 0.
 * 2. Back and Forward restore the scroll position, and focus goes to the h1 without scrolling.
 * 3. An in-page change (here, the theme toggle) neither scrolls nor moves focus.
 * Rules 1 and 2 are build-lead's fix for QA-P1-001. Until QA verifies that fix, a deviation is
 * recorded as an annotation; QA then sets `enforced` to true. Rule 3 holds today and is enforced.
 */
const FOCUS_RULES = { defect: 'QA-P1-001', enforced: false };

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

/** What the focus and scroll rules look at. */
interface FocusState {
  readonly scrollY: number;
  readonly focusOnH1: boolean;
  /** The h1's top edge in the viewport, in px; on screen means 0 or more. */
  readonly h1Top: number;
  readonly headerOnScreen: boolean;
  readonly siteNavOnScreen: boolean;
}

async function focusState(page: Page): Promise<FocusState> {
  return page.evaluate(() => {
    const onScreen = (el: Element | null) => {
      if (el === null) return false;
      const box = el.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight;
    };
    const h1 = document.querySelector('h1');
    return {
      scrollY: Math.round(window.scrollY),
      focusOnH1: h1 !== null && document.activeElement === h1,
      h1Top: h1 === null ? Number.NEGATIVE_INFINITY : Math.round(h1.getBoundingClientRect().top),
      headerOnScreen: onScreen(document.querySelector('header')),
      siteNavOnScreen: onScreen(document.querySelector('nav[aria-label="Site"]')),
    };
  });
}

/** Rule 1, after a route change: where it falls short, in words. */
function routeChangeDeviations(state: FocusState): string[] {
  const out: string[] = [];
  if (state.scrollY !== 0) out.push(`scrollY ${String(state.scrollY)}, not 0`);
  if (!state.focusOnH1) out.push('focus not on the h1');
  if (state.h1Top < 0) out.push(`the h1's top at ${String(state.h1Top)} px`);
  if (!state.headerOnScreen) out.push('the header off screen');
  if (!state.siteNavOnScreen) out.push('the site nav off screen');
  return out;
}

/** Records focus-rule deviations, or fails on them once the rules are enforced. */
function settleFocusRules(testInfo: TestInfo, deviations: readonly string[]): void {
  if (FOCUS_RULES.enforced) {
    expect(deviations, "design-lead's focus and scroll rules").toEqual([]);
  } else if (deviations.length) {
    testInfo.annotations.push({
      type: 'known defect',
      description: `${FOCUS_RULES.defect}, focus and scroll rules: ${deviations.join('; ')}`,
    });
  }
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
  const focusDeviations: string[] = [];

  for (const [index, link] of links.entries()) {
    const target = new URL(link.href, page.url()).pathname.slice(BASE_PATH.length - 1);
    await test.step(`${touch ? 'tap' : 'click'} "${link.text}" (${link.href})`, async () => {
      await markDocument(page);
      const anchor = page.locator(`a[href^="${BASE_PATH}"]`).nth(index);
      await expect(anchor).toHaveText(link.text);
      // Bring the link into view first, so the scroll position at the moment of the click is known.
      await anchor.scrollIntoViewIfNeeded();
      const scrollAtClick = (await focusState(page)).scrollY;
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
      if (target === start.path) return; // a link to the page itself changes no route

      for (const d of routeChangeDeviations(await focusState(page)))
        focusDeviations.push(`"${link.text}": ${d}`);

      // Back returns to where the visitor was, so the next link starts from the same page.
      await page.goBack();
      await expect.poll(() => routePath(page), { message: 'the URL after Back' }).toBe(start.path);
      await expect(heading).toHaveText(startHeading);
      // Rule 2: the browser restores the scroll position, and focus goes to the h1.
      const restored = await expect
        .poll(async () => (await focusState(page)).scrollY, { timeout: 1000 })
        .toBe(scrollAtClick)
        .then(() => true)
        .catch(() => false);
      const back = await focusState(page);
      if (!restored)
        focusDeviations.push(
          `Back from "${link.text}": scrollY ${String(back.scrollY)}, was ${String(scrollAtClick)}`,
        );
      if (!back.focusOnH1) focusDeviations.push(`Back from "${link.text}": focus not on the h1`);
    });
  }

  const known =
    KNOWN_OFF_SCREEN.widths.includes(testInfo.project.use.viewport?.width ?? 0) &&
    KNOWN_OFF_SCREEN.starts.includes(start.path);
  if (known) {
    testInfo.annotations.push({
      type: 'known defect',
      description: offScreen.length
        ? `${KNOWN_OFF_SCREEN.defect}: the heading was off screen after ${offScreen.join(', ')}`
        : `${KNOWN_OFF_SCREEN.defect} did not reproduce here: QA can take this start off the list`,
    });
  } else {
    expect(offScreen, "links after which the new page's heading is off screen").toEqual([]);
  }
  settleFocusRules(testInfo, focusDeviations);
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

test.describe("focus and scroll on a page change: design-lead's rules @smoke @nav", () => {
  const stepPath = pathOf({ name: 'build', step: 'use-case' });

  test('rule 1 under reduced motion: a route change jumps to the top, never scrolls smoothly', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(stepPath.slice(1));
    const link = page
      .getByRole('navigation', { name: 'Build steps' })
      .getByRole('link', { name: 'Review', exact: true });
    await link.scrollIntoViewIfNeeded();
    const before = (await focusState(page)).scrollY;
    if (usesTouch(testInfo)) await link.tap();
    else await link.click();
    // Three animation frames after the click: each is the old position or the top, nothing between.
    const frames = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const ys: number[] = [];
          const tick = () => {
            ys.push(Math.round(window.scrollY));
            if (ys.length < 3) requestAnimationFrame(tick);
            else resolve(ys);
          };
          requestAnimationFrame(tick);
        }),
    );
    await expect.poll(() => routePath(page)).toBe(pathOf({ name: 'build', step: 'review' }));
    const deviations = [
      ...frames
        .filter((y) => y !== 0 && y !== before)
        .map((y) => `a smooth-scroll frame at ${String(y)}`),
      ...routeChangeDeviations(await focusState(page)).map((d) => `after "Review": ${d}`),
    ];
    settleFocusRules(testInfo, deviations);
  });

  test('rule 3: the theme toggle neither scrolls the page nor moves focus', async ({ page }) => {
    await page.goto(stepPath.slice(1));
    // Scroll a little, so a scroll to the top would show; the toggle sits in the header.
    await page.evaluate(() => {
      window.scrollTo(0, 40);
    });
    const toggle = page.getByRole('button', { name: 'Light theme' });
    await toggle.scrollIntoViewIfNeeded();
    const before = await focusState(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const after = await focusState(page);
    expect(after.scrollY, 'the scroll position after the toggle').toBe(before.scrollY);
    expect(
      await toggle.evaluate((el) => document.activeElement === el),
      'focus stays on the toggle',
    ).toBe(true);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
