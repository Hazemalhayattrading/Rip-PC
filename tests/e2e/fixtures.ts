/**
 * The shared Playwright `test` for every spec (docs/qa/test-plan.md §13.2). Specs import `test`
 * and `expect` from here, never from '@playwright/test'; tests/harness/spec-imports.test.ts fails
 * the unit tests when one does.
 *
 * The automatic fixture `problemGuard` watches the whole browser context of every test, so pages,
 * popups, new tabs and workers are all covered. It fails the test on any of these, unless an
 * ALLOWED entry in problems.ts covers it:
 * - a console error;
 * - a console warning (the Director, 2026-10-01; two notices from the browser's own WebGL stack
 *   are allowed in problems.ts);
 * - an uncaught error in a page or worker;
 * - an unhandled promise rejection (Chromium also reports these as page errors; our own hook is
 *   defence in depth, test plan §13.1);
 * - a same-origin request that fails for any reason other than net::ERR_ABORTED;
 * - a same-origin response with status 400 or more;
 * - a page crash.
 * BUILD_PROMPT.md §8: "Zero console errors. Zero unhandled promise rejections." Owner: qa-lead.
 */
import {
  expect,
  test as base,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';
import {
  ALLOWED,
  assertValidAllowList,
  classify,
  isReportableFailure,
  isSameOrigin,
  utcDate,
  type Problem,
} from './problems.ts';

// An invalid or expired allow-list entry stops the whole run before any test starts.
assertValidAllowList(ALLOWED, utcDate(new Date()));

/** The page-side name of the unhandled-rejection hook. */
const REJECTION_BINDING = '__rigLabQaUnhandledRejection';

/** How long the fixture waits for a page to hand over the events it has already sent. */
const FLUSH_TIMEOUT_MS = 2000;

export interface ProblemGuard {
  /**
   * Watches one more browser context. A test that makes its own with `browser.newContext()` must
   * call this before it opens a page there; tests/harness/spec-imports.test.ts checks.
   */
  watch(context: BrowserContext): Promise<void>;
  /** Everything collected so far, read-only. Lets a test wait for a problem it causes on purpose. */
  problems(): readonly Problem[];
}

export interface GuardOptions {
  /**
   * The test asks for a page that does not exist. The 404 answer for that page, and the console
   * error Chromium logs for it, are then allowed (problems.ts, `not-found-page-*`). Anything else
   * still fails, including a 404 for any other resource.
   */
  expectNotFoundDocument: boolean;
}

/**
 * Runs in every page before any page script. It is serialised into the browser, so it must not
 * use anything from this module.
 */
function reportUnhandledRejections(binding: string): void {
  addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    let text: string;
    if (reason instanceof Error) {
      text = `${reason.name}: ${reason.message}`;
    } else if (typeof reason === 'string') {
      text = reason;
    } else {
      let json: string | undefined;
      try {
        json = JSON.stringify(reason);
      } catch {
        json = undefined;
      }
      text = json ?? Object.prototype.toString.call(reason);
    }
    const report = (globalThis as unknown as Record<string, unknown>)[binding];
    if (typeof report === 'function') {
      void (report as (text: string) => Promise<void>)(text);
    }
  });
}

function pageUrlOf(page: Page | null): string {
  return page?.url() ?? '';
}

/** The URL of the page that made a request. Requests from a service worker have no page. */
function requestPageUrl(request: Request): string {
  try {
    return request.frame().page().url();
  } catch {
    return '';
  }
}

function isMainFrameDocument(request: Request): boolean {
  try {
    return request.isNavigationRequest() && request.frame().parentFrame() === null;
  } catch {
    return false;
  }
}

/** Gives a page's pending console, error and network events time to arrive. */
async function flush(page: Page): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, FLUSH_TIMEOUT_MS);
  });
  try {
    await Promise.race([page.evaluate(() => 0).then(() => undefined), timeout]);
  } catch {
    // A crashed, closed or navigating page has nothing more to hand over.
  } finally {
    clearTimeout(timer);
  }
}

export const test = base.extend<GuardOptions & { problemGuard: ProblemGuard }>({
  expectNotFoundDocument: [false, { option: true }],

  problemGuard: [
    async ({ context, baseURL, expectNotFoundDocument }, use, testInfo) => {
      if (baseURL === undefined) {
        throw new Error(
          'problemGuard needs use.baseURL: it tells same-origin requests from third-party ones',
        );
      }
      const origin = new URL(baseURL).origin;
      const problems: Problem[] = [];
      const contexts = new Set<BrowserContext>();
      const pages = new WeakSet<Page>();

      const watchPage = (page: Page): void => {
        if (pages.has(page)) return;
        pages.add(page);
        page.on('crash', () => {
          problems.push({
            kind: 'crash',
            text: 'the page crashed',
            url: '',
            documentUrl: page.url(),
          });
        });
      };

      const onConsole = (message: ConsoleMessage): void => {
        const type = message.type();
        if (type !== 'error' && type !== 'warning') return;
        problems.push({
          kind: type === 'error' ? 'console.error' : 'console.warning',
          text: message.text(),
          url: message.location().url,
          documentUrl: pageUrlOf(message.page()),
        });
      };

      const onRequestFailed = (request: Request): void => {
        const errorText = request.failure()?.errorText ?? 'unknown network error';
        if (!isSameOrigin(request.url(), origin) || !isReportableFailure(errorText)) return;
        problems.push({
          kind: 'requestfailed',
          text: errorText,
          url: request.url(),
          documentUrl: requestPageUrl(request),
          resourceType: request.resourceType(),
          mainFrameDocument: isMainFrameDocument(request),
        });
      };

      const onResponse = (response: Response): void => {
        const status = response.status();
        if (status < 400 || !isSameOrigin(response.url(), origin)) return;
        const request = response.request();
        problems.push({
          kind: 'http-error',
          text: `HTTP ${String(status)} ${response.statusText()}`.trim(),
          url: response.url(),
          documentUrl: requestPageUrl(request),
          resourceType: request.resourceType(),
          mainFrameDocument: isMainFrameDocument(request),
          status,
        });
      };

      const watch = async (watched: BrowserContext): Promise<void> => {
        if (contexts.has(watched)) return;
        contexts.add(watched);
        await watched.exposeBinding(REJECTION_BINDING, (source, text: string) => {
          problems.push({
            kind: 'unhandledrejection',
            text,
            url: '',
            documentUrl: source.page.url(),
          });
        });
        await watched.addInitScript(reportUnhandledRejections, REJECTION_BINDING);
        watched.on('console', onConsole);
        watched.on('weberror', (webError) => {
          const error = webError.error();
          problems.push({
            kind: 'pageerror',
            text: `${error.name}: ${error.message}`,
            url: '',
            documentUrl: pageUrlOf(webError.page()),
          });
        });
        watched.on('requestfailed', onRequestFailed);
        watched.on('response', onResponse);
        watched.on('page', watchPage);
        for (const page of watched.pages()) watchPage(page);
      };

      await watch(context);
      await use({ watch, problems: () => [...problems] });

      for (const watched of contexts) {
        for (const page of watched.pages()) await flush(page);
      }
      const verdict = classify(problems, { expectNotFoundDocument });
      if (problems.length > 0) {
        await testInfo.attach('page-problems.json', {
          body: JSON.stringify(verdict, null, 2),
          contentType: 'application/json',
        });
      }
      expect(
        verdict.unexpected,
        'console errors and warnings, page errors, unhandled rejections, failed same-origin requests and crashes (tests/e2e/fixtures.ts)',
      ).toEqual([]);
    },
    { auto: true, title: 'zero console errors and warnings, page errors and failed requests' },
  ],
});

export { expect };
