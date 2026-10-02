/**
 * The rules behind the shared Playwright fixture (tests/e2e/fixtures.ts): what counts as a problem,
 * and the only problems a test may have. Pure data and functions, so the rules are unit-tested
 * without a browser (tests/harness/problems.test.ts), and the fixture itself is tested end to end
 * by tests/harness/guard.test.ts.
 *
 * BUILD_PROMPT.md §8: "Zero console errors. Zero unhandled promise rejections." Console warnings
 * fail too (the Director, 2026-10-01), except two notices from the browser's own WebGL stack,
 * allowed below.
 * tests/perf/budget.json `console`: every count is 0. docs/qa/test-plan.md §13. Owner: qa-lead.
 */

export type ProblemKind =
  | 'console.error'
  | 'console.warning'
  | 'pageerror'
  | 'unhandledrejection'
  | 'requestfailed'
  | 'http-error'
  | 'crash';

export interface Problem {
  readonly kind: ProblemKind;
  /** The console text, error message, rejection reason, network error or HTTP status line. */
  readonly text: string;
  /** Where it came from: the console message's source, or the request URL. Empty when unknown. */
  readonly url: string;
  /** The page it happened on, at that moment. Empty when there was no page. */
  readonly documentUrl: string;
  /** For requests: what was requested (document, script, image, fetch, ...). */
  readonly resourceType?: string;
  /** For requests: true when this is the navigation of a page's main frame, the page itself. */
  readonly mainFrameDocument?: boolean;
  /** For 'http-error': the status code. */
  readonly status?: number;
}

/** What a test says about itself, through fixture options (tests/e2e/fixtures.ts). */
export interface Declarations {
  /** The test asks for a page that does not exist, so that page answers 404 on purpose. */
  readonly expectNotFoundDocument: boolean;
}

/** One test's declarations and every problem it produced: what an allow-list entry may look at. */
export interface GuardRun extends Declarations {
  readonly problems: readonly Problem[];
}

export interface AllowedProblem {
  /** Stable id, shown in the report next to every problem it allowed. */
  readonly id: string;
  readonly matches: (problem: Problem, run: GuardRun) => boolean;
  /** Why this is not a bug. Required. */
  readonly reason: string;
  /** The team that owns the exception: one of TEAMS. */
  readonly owner: string;
  /**
   * 'permanent', the last day it applies (an ISO date, YYYY-MM-DD, compared in UTC), or an https
   * link to the issue whose fix removes it. An expired date stops the whole run.
   */
  readonly until: string;
}

/** The teams that may own an exception (CLAUDE.md, "Who's who"). */
export const TEAMS = ['data-lead', 'build-lead', 'design-lead', 'qa-lead'] as const;

/** What Chromium 1194 logs when a resource, the page itself included, answers 404 (test plan §13.1). */
export const CHROMIUM_404_CONSOLE_TEXT =
  'Failed to load resource: the server responded with a status of 404 (Not Found)';

/**
 * The same notice over HTTP/2, which has no reason phrase, so the brackets are empty. GitHub Pages
 * answers over HTTP/2, and Chromium-family browsers and WebKit log this text for a 404 there
 * (the live navigation run, 2026-10-02). The local preview answers over HTTP/1.1.
 */
export const HTTP2_404_CONSOLE_TEXT =
  'Failed to load resource: the server responded with a status of 404 ()';

/**
 * Chromium's notice when WebGL falls back to its software renderer, SwiftShader, without the
 * --enable-unsafe-swiftshader flag (seen by build-lead, 2026-10-01). The whole text, in the
 * wording of Chromium 141 (Playwright 1.56.1's build) and of Chromium's current source, which
 * drops the about:flags part. The optional prefix is one of the two that Chromium's GPU logger
 * writes, with an id that changes per GPU process. Every e2e project passes the flag, so this
 * should not appear at all (QA-P0-032, QA-P0-038).
 */
export const SOFTWARE_WEBGL_NOTICE =
  /^(?:\[GroupMarkerNotSet\(crbug\.com\/242999\)!:[0-9A-F]+\]|\[\.WebGL-0x[0-9a-f]+\])?Automatic fallback to software WebGL has been deprecated\. Please use the --enable-unsafe-swiftshader(?: \(about:flags#enable-unsafe-swiftshader\))? flag to opt in to lower security guarantees for trusted content\.$/;

/**
 * ANGLE's performance warning, which Chromium logs as a "GL Driver Message", when a WebGL canvas
 * is read back on SwiftShader. The e2e browsers render WebGL with SwiftShader, on this PC as in
 * CI, and a draw-only page that never calls readPixels gets it too (QA-P0-034). ANGLE logs it at
 * most 4 times per GPU process, the 4th time with the "(this message will no longer repeat)"
 * suffix. The address changes per load. Any other GL driver message does not match.
 */
export const GPU_READPIXELS_STALL_NOTICE =
  /^\[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/;

/**
 * Chromium attributes both notices to the page itself: the message's location is the document's
 * URL. A console call in a script file has that file's URL, so it still fails (QA-P0-033). Code
 * that Chromium compiles with the page's URL has it too: an inline script in the HTML, and an
 * inline event-handler attribute, even one a script file sets (QA-P0-038). That limit is in test
 * plan §13.2.
 */
function fromThePageItself(problem: Problem): boolean {
  return problem.url !== '' && problem.url === problem.documentUrl;
}

/** A page that answered 404: the main-frame document, not a resource inside it. */
export function isNotFoundPage(problem: Problem): boolean {
  return (
    problem.kind === 'http-error' && problem.status === 404 && problem.mainFrameDocument === true
  );
}

/**
 * The allow-list. Every entry needs a reason, an owning team and an end, and is reviewed at each
 * phase exit (test plan §13.2). Keep it short: an entry here hides a problem in every test.
 */
export const ALLOWED: readonly AllowedProblem[] = [
  {
    id: 'not-found-page-status',
    matches: (problem, run) => run.expectNotFoundDocument && isNotFoundPage(problem),
    reason:
      'The test asks for a page that does not exist, so a 404 answer for the page itself is the result under test. A 404 for any other resource, or any other 4xx or 5xx, still fails.',
    owner: 'qa-lead',
    until: 'permanent',
  },
  {
    id: 'not-found-page-console',
    matches: (problem, run) =>
      run.expectNotFoundDocument &&
      problem.kind === 'console.error' &&
      (problem.text === CHROMIUM_404_CONSOLE_TEXT || problem.text === HTTP2_404_CONSOLE_TEXT) &&
      run.problems.some((other) => isNotFoundPage(other) && other.url === problem.url),
    reason:
      "Chromium logs a page that answers 404 as a failed resource, with the reason phrase over HTTP/1.1 and empty brackets over HTTP/2 (GitHub Pages; WebKit logs the same). It is the same 404 the test asked for, so it is allowed only for that page's own URL (moved from build-lead's isOwnDocument404 in the smoke spec).",
    owner: 'qa-lead',
    until: 'permanent',
  },
  {
    id: 'software-webgl-notice',
    matches: (problem) =>
      problem.kind === 'console.warning' &&
      fromThePageItself(problem) &&
      SOFTWARE_WEBGL_NOTICE.test(problem.text),
    reason:
      "Chromium's own notice that WebGL fell back to its software renderer, logged when a browser runs without --enable-unsafe-swiftshader. It is about the test browser, not the app (build-lead's allow-list proposal, 2026-10-01). Only the whole notice, from the page itself; any other warning still fails.",
    owner: 'qa-lead',
    until: 'permanent',
  },
  {
    id: 'gpu-readpixels-stall-notice',
    matches: (problem) =>
      problem.kind === 'console.warning' &&
      fromThePageItself(problem) &&
      GPU_READPIXELS_STALL_NOTICE.test(problem.text),
    reason:
      "ANGLE's performance warning when Chromium reads a WebGL canvas back on SwiftShader, at most 4 times per GPU process. It comes from the browser's software rendering, not the app: a draw-only WebGL page gets it too (build-lead's allow-list proposal, 2026-10-01; QA-P0-034). Only this exact notice, from the page itself; any other GL driver message still fails.",
    owner: 'qa-lead',
    until: 'permanent',
  },
];

/** The verdict on one test's problems. */
export interface Verdict {
  readonly unexpected: readonly Problem[];
  readonly allowed: readonly { readonly problem: Problem; readonly allowedBy: string }[];
}

export function classify(
  problems: readonly Problem[],
  declarations: Declarations,
  allowList: readonly AllowedProblem[] = ALLOWED,
): Verdict {
  const run: GuardRun = { ...declarations, problems };
  const unexpected: Problem[] = [];
  const allowed: { problem: Problem; allowedBy: string }[] = [];
  for (const problem of problems) {
    const entry = allowList.find((candidate) => candidate.matches(problem, run));
    if (entry === undefined) unexpected.push(problem);
    else allowed.push({ problem, allowedBy: entry.id });
  }
  return { unexpected, allowed };
}

/** The UTC calendar date of an instant, as YYYY-MM-DD. */
export function utcDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && utcDate(date) === value;
}

/** Every reason an allow-list is invalid on `today` (YYYY-MM-DD, UTC); empty when it is valid. */
export function allowListErrors(entries: readonly AllowedProblem[], today: string): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  entries.forEach((entry, index) => {
    const label = entry.id.trim() === '' ? `entry ${String(index + 1)}` : `"${entry.id}"`;
    if (entry.id.trim() === '') errors.push(`${label}: id is empty`);
    else if (ids.has(entry.id)) errors.push(`${label}: the id is used twice`);
    ids.add(entry.id);
    if (entry.reason.trim() === '') {
      errors.push(`${label}: reason is empty; say why this is not a bug`);
    }
    if (!(TEAMS as readonly string[]).includes(entry.owner)) {
      errors.push(`${label}: owner "${entry.owner}" is not a team (${TEAMS.join(', ')})`);
    }
    const until = entry.until.trim();
    if (until === 'permanent' || /^https:\/\/\S+$/.test(until)) return;
    if (!isIsoDate(until)) {
      errors.push(
        `${label}: until "${entry.until}" must be 'permanent', a date (YYYY-MM-DD) or an https link to the issue`,
      );
    } else if (until < today) {
      errors.push(
        `${label}: expired after ${until}; fix the cause and remove the entry, or renew it with the Director's approval`,
      );
    }
  });
  return errors;
}

/** Throws when the allow-list is invalid, so the run stops before any test starts. */
export function assertValidAllowList(entries: readonly AllowedProblem[], today: string): void {
  const errors = allowListErrors(entries, today);
  if (errors.length > 0) {
    throw new Error(
      `The console-error allow-list in tests/e2e/problems.ts is invalid:\n- ${errors.join('\n- ')}`,
    );
  }
}

/** Same scheme, host and port. A URL that does not parse, such as data: or blob:, never is. */
export function isSameOrigin(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === origin
    );
  } catch {
    return false;
  }
}

/**
 * A failed request is a problem unless the page itself gave up on it: net::ERR_ABORTED means it
 * navigated away, or the test closed it, while the request was in flight.
 */
export function isReportableFailure(errorText: string): boolean {
  return errorText !== 'net::ERR_ABORTED';
}
