/**
 * Self-test of the shared fixture in tests/e2e/fixtures.ts. Each test makes one kind of problem
 * on purpose, or does one thing that must not count as a problem. tests/harness/guard.test.ts runs
 * this file with ./playwright.config.ts and checks that the fixture failed exactly the tests it
 * should, for exactly the reasons it should.
 *
 * A test the fixture must fail is marked test.fail(): if the fixture ever stops catching that
 * problem, the test passes unexpectedly and the run fails. Expected failures also keep the
 * worker alive, where an ordinary failure would restart it.
 *
 * Every page is served by routes on made-up origins, so nothing touches the network and no build
 * is needed. Never part of the e2e suite. Owner: qa-lead.
 */
import type { BrowserContext, Route } from '@playwright/test';
import { expect, test, type ProblemGuard } from '../../e2e/fixtures.ts';
import type { ProblemKind } from '../../e2e/problems.ts';

const SITE = 'http://guard.test';
const ELSEWHERE = 'http://elsewhere.test';

function html(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>guard self-test</title></head><body><h1>guard self-test</h1>${body}</body></html>`;
}

interface Served {
  readonly status?: number;
  readonly contentType?: string;
  readonly body: string;
}

const SERVED: Readonly<Record<string, Served>> = {
  '/clean': { body: html('<p>Nothing is wrong here.</p>') },
  '/console-error': {
    body: html('<script>console.error("guard self-test: console.error")</script>'),
  },
  '/console-warning': {
    body: html('<script>console.warn("guard self-test: console.warn")</script>'),
  },
  '/uncaught': {
    body: html(
      '<script>setTimeout(() => { throw new Error("guard self-test: uncaught") }, 0)</script>',
    ),
  },
  '/rejection': {
    body: html('<script>Promise.reject(new Error("guard self-test: rejection"))</script>'),
  },
  '/rejection-string': {
    body: html('<script>Promise.reject("guard self-test: string rejection")</script>'),
  },
  '/missing-image': { body: html('<img alt="" src="/missing.png">') },
  '/failing-image': { body: html('<img alt="" src="/fails.png">') },
  '/server-error': {
    body: html('<script>fetch("/api/broken").catch(() => {})</script>'),
  },
  '/elsewhere-missing': { body: html(`<img alt="" src="${ELSEWHERE}/missing.png">`) },
  '/hanging-image': { body: html('<img alt="" src="/hangs.png">') },
  '/not-found': { status: 404, body: html('<p>There is no page here.</p>') },
  '/not-found-with-missing-image': {
    status: 404,
    body: html('<p>There is no page here.</p><img alt="" src="/missing.png">'),
  },
  '/worker-throws': { body: html('<script>new Worker("/throws.js")</script>') },
  '/throws.js': {
    contentType: 'text/javascript',
    body: 'throw new Error("guard self-test: worker");',
  },
  '/worker-console': { body: html('<script>new Worker("/logs.js")</script>') },
  '/logs.js': {
    contentType: 'text/javascript',
    body: 'console.error("guard self-test: worker console.error");',
  },
  '/popup': {
    body: html('<button type="button" onclick="window.open(\'/console-error\')">Open</button>'),
  },
  '/api/broken': { status: 500, contentType: 'application/json', body: '{"error":"broken"}' },
};

async function answer(route: Route): Promise<void> {
  const { pathname } = new URL(route.request().url());
  if (pathname === '/fails.png') {
    await route.abort('failed');
    return;
  }
  // Never answered: the test navigates away while it is in flight, so the browser aborts it.
  if (pathname === '/hangs.png') return;
  const served = SERVED[pathname];
  await route.fulfill(
    served === undefined
      ? { status: 404, contentType: 'text/plain', body: 'not found' }
      : {
          status: served.status ?? 200,
          contentType: served.contentType ?? 'text/html; charset=utf-8',
          body: served.body,
        },
  );
}

async function serve(context: BrowserContext): Promise<void> {
  await context.route(`${SITE}/**`, answer);
  await context.route(`${ELSEWHERE}/**`, (route) =>
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }),
  );
}

function kinds(guard: ProblemGuard): ProblemKind[] {
  return guard.problems().map((problem) => problem.kind);
}

test.beforeEach(async ({ context }) => {
  await serve(context);
});

test('a clean page passes', async ({ page }) => {
  await page.goto('/clean');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('console.error fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/console-error');
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('a console warning is reported and passes', async ({ page }) => {
  await page.goto('/console-warning');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('an uncaught error fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/uncaught');
  await expect.poll(() => kinds(problemGuard)).toContain('pageerror');
});

test('an unhandled rejection fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/rejection');
  await expect.poll(() => kinds(problemGuard)).toContain('unhandledrejection');
  await expect.poll(() => kinds(problemGuard)).toContain('pageerror');
});

test('a rejection with a string reason fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/rejection-string');
  await expect.poll(() => kinds(problemGuard)).toContain('unhandledrejection');
  await expect.poll(() => kinds(problemGuard)).toContain('pageerror');
});

test('a same-origin 404 fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/missing-image');
  await expect.poll(() => kinds(problemGuard)).toContain('http-error');
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('a same-origin request that fails is a failure', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/failing-image');
  await expect.poll(() => kinds(problemGuard)).toContain('requestfailed');
});

test('a same-origin 500 fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/server-error');
  await expect.poll(() => kinds(problemGuard)).toContain('http-error');
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('a third-party 404 fails through its console error only', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/elsewhere-missing');
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('a request aborted by navigating away passes', async ({ page }) => {
  const started = page.waitForRequest(`${SITE}/hangs.png`);
  await page.goto('/hanging-image', { waitUntil: 'commit' });
  await started;
  await page.goto('/clean');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a page that answers 404 fails without the declaration', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  const response = await page.goto('/not-found');
  expect(response?.status()).toBe(404);
  await expect.poll(() => kinds(problemGuard)).toContain('http-error');
});

test.describe('with expectNotFoundDocument', () => {
  test.use({ expectNotFoundDocument: true });

  test('a page that answers 404 passes', async ({ page, problemGuard }) => {
    const response = await page.goto('/not-found');
    expect(response?.status()).toBe(404);
    await expect.poll(() => kinds(problemGuard)).toContain('console.error');
  });

  test('a 404 image on that page still fails', async ({ page, problemGuard }) => {
    test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
    await page.goto('/not-found-with-missing-image');
    await expect
      .poll(() => problemGuard.problems().filter((problem) => problem.url.endsWith('/missing.png')))
      .toHaveLength(2);
  });
});

test('an uncaught error in a worker fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/worker-throws');
  await expect.poll(() => kinds(problemGuard)).toContain('pageerror');
});

test('console.error in a worker fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/worker-console');
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('console.error in a popup fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/popup');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open' }).click();
  await (await popup).waitForLoadState();
  await expect.poll(() => kinds(problemGuard)).toContain('console.error');
});

test('a page crash fails', async ({ page, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  await page.goto('/clean');
  const session = await page.context().newCDPSession(page);
  // The renderer dies before it can answer, so the command never settles cleanly.
  void session.send('Page.crash').catch(() => undefined);
  await expect.poll(() => kinds(problemGuard)).toContain('crash');
});

test('a context the test makes itself fails once watched', async ({ browser, problemGuard }) => {
  test.fail(); // the guard must fail this test; tests/harness/guard.test.ts checks why
  const context = await browser.newContext();
  try {
    await problemGuard.watch(context);
    await serve(context);
    const page = await context.newPage();
    await page.goto(`${SITE}/console-error`);
    await expect.poll(() => kinds(problemGuard)).toContain('console.error');
  } finally {
    await context.close();
  }
});
