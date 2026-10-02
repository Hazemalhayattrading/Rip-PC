/**
 * The shared console fixture (tests/e2e/fixtures.ts), tested end to end in a real Chromium.
 *
 * A gate that silently stops failing is the worst kind of QA bug, so this runs the self-test in
 * tests/harness/guard/ on every `npm run test` and `npm run verify`. For each self-test it checks
 * the outcome, and for each failure its cause: exactly which kinds of problem the fixture
 * reported, and that the fixture itself failed the test. Owner: qa-lead.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Problem, ProblemKind } from '../e2e/problems.ts';

const CONFIG = path.join(import.meta.dirname, 'guard', 'playwright.config.ts');
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli');
/** Part of the fixture's failure message, so a failure from anything else is told apart. */
const FIXTURE_FAILURE = 'tests/e2e/fixtures.ts';

interface Outcome {
  /** How the test ended. Tests the fixture must fail are marked test.fail(). */
  readonly status: 'passed' | 'failed';
  /** The kinds of problem the fixture failed it for, sorted. */
  readonly unexpected: readonly ProblemKind[];
  /** The allow-list entries that let problems through, sorted. */
  readonly allowed: readonly string[];
}

const passes = (extra: Partial<Outcome> = {}): Outcome => ({
  status: 'passed',
  unexpected: [],
  allowed: [],
  ...extra,
});
const failsFor = (unexpected: readonly ProblemKind[], extra: Partial<Outcome> = {}): Outcome => ({
  status: 'failed',
  unexpected,
  allowed: [],
  ...extra,
});

const NOT_FOUND_ALLOWED = ['not-found-page-console', 'not-found-page-status'];

/** Titles from tests/harness/guard/guard.selftest.ts, with describe blocks joined by " › ". */
const EXPECTED: Readonly<Record<string, Outcome>> = {
  'a clean page passes': passes(),
  'console.error fails': failsFor(['console.error']),
  'a console warning fails': failsFor(['console.warning']),
  "ANGLE's ReadPixels notice, logged by the page itself, passes": passes({
    allowed: ['gpu-readpixels-stall-notice'],
  }),
  'the same notice from a script file fails': failsFor(['console.warning']),
  'any other GL driver message fails': failsFor(['console.warning']),
  'an uncaught error fails': failsFor(['pageerror']),
  'an unhandled rejection fails': failsFor(['pageerror', 'unhandledrejection']),
  'a rejection with a string reason fails': failsFor(['pageerror', 'unhandledrejection']),
  'a same-origin 404 fails': failsFor(['console.error', 'http-error']),
  'a same-origin request that fails is a failure': failsFor(['console.error', 'requestfailed']),
  'a same-origin 500 fails': failsFor(['console.error', 'http-error']),
  'a third-party 404 fails through its console error only': failsFor(['console.error']),
  'a request aborted by navigating away passes': passes(),
  'a page that answers 404 fails without the declaration': failsFor([
    'console.error',
    'http-error',
  ]),
  'with expectNotFoundDocument › a page that answers 404 passes': passes({
    allowed: NOT_FOUND_ALLOWED,
  }),
  'with expectNotFoundDocument › a 404 image on that page still fails': failsFor(
    ['console.error', 'http-error'],
    { allowed: NOT_FOUND_ALLOWED },
  ),
  'an uncaught error in a worker fails': failsFor(['pageerror']),
  'console.error in a worker fails': failsFor(['console.error']),
  'console.error in a popup fails': failsFor(['console.error']),
  'a page crash fails': failsFor(['crash']),
  'a context the test makes itself fails once watched': failsFor(['console.error']),
};

// The parts of Playwright's JSON report this reads.
interface ReportError {
  readonly message?: string;
}
interface ReportResult {
  readonly status: string;
  readonly errors: readonly ReportError[];
  readonly attachments: readonly { readonly name: string; readonly body?: string }[];
}
interface ReportSuite {
  readonly title: string;
  readonly specs: readonly {
    readonly title: string;
    readonly tests: readonly {
      readonly status: string;
      readonly results: readonly ReportResult[];
    }[];
  }[];
  readonly suites?: readonly ReportSuite[];
}
interface Report {
  readonly suites: readonly ReportSuite[];
  readonly errors: readonly ReportError[];
  readonly stats: {
    readonly expected: number;
    readonly unexpected: number;
    readonly flaky: number;
  };
}
interface Attached {
  readonly unexpected: readonly Problem[];
  readonly allowed: readonly { readonly allowedBy: string }[];
}

const sortedUnique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort();

/** Terminal colour codes in Playwright's error messages. */
const COLOUR_CODES = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** A self-test's own errors, without terminal colours: the "why" behind a wrong outcome. */
function errorText(errors: readonly ReportError[]): string {
  return errors
    .map((error) =>
      (error.message ?? '').replaceAll(COLOUR_CODES, '').split('\n').slice(0, 12).join('\n'),
    )
    .join('\n---\n');
}

interface Found extends Outcome {
  readonly byFixture: boolean;
}

/** Every test in the report: its title (describe blocks joined by " › "), outcome and cause. */
function outcomes(report: Report): {
  found: Map<string, Found>;
  why: Map<string, string>;
} {
  const found = new Map<string, Found>();
  const why = new Map<string, string>();
  const walk = (suite: ReportSuite, trail: readonly string[]): void => {
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        const result = test.results.at(-1);
        if (result === undefined) continue;
        const title = [...trail, spec.title].join(' › ');
        const body = result.attachments.find((a) => a.name === 'page-problems.json')?.body;
        const attached =
          body === undefined
            ? undefined
            : (JSON.parse(Buffer.from(body, 'base64').toString('utf8')) as Attached);
        found.set(title, {
          status: result.status === 'passed' ? 'passed' : 'failed',
          unexpected: sortedUnique((attached?.unexpected ?? []).map((problem) => problem.kind)),
          allowed: sortedUnique((attached?.allowed ?? []).map((entry) => entry.allowedBy)),
          byFixture: result.errors.some((error) => error.message?.includes(FIXTURE_FAILURE)),
        });
        why.set(title, `status ${result.status}\n${errorText(result.errors)}`);
      }
    }
    for (const child of suite.suites ?? []) walk(child, [...trail, child.title]);
  };
  // Each top-level suite is a file. Its title is not part of a test's name, so the trail starts
  // empty and only describe blocks are added to it.
  for (const file of report.suites) walk(file, []);
  return { found, why };
}

describe('the shared console fixture, end to end', () => {
  it(
    'fails exactly the self-tests that make a problem, for exactly that problem',
    { timeout: 120_000 },
    () => {
      const folder = mkdtempSync(path.join(tmpdir(), 'rig-lab-guard-'));
      const reportFile = path.join(folder, 'report.json');
      try {
        const run = spawnSync(
          process.execPath,
          [PLAYWRIGHT_CLI, 'test', '--config', CONFIG, '--reporter=json'],
          {
            encoding: 'utf8',
            env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile },
            timeout: 110_000,
          },
        );
        const report = JSON.parse(readFileSync(reportFile, 'utf8')) as Report;
        expect(report.errors, run.stderr).toEqual([]);

        // Case by case first: a wrong outcome is reported with the self-test's own errors.
        const { found, why } = outcomes(report);
        expect([...found.keys()].sort()).toEqual(Object.keys(EXPECTED).sort());
        for (const [title, expected] of Object.entries(EXPECTED)) {
          expect(
            found.get(title),
            `${title}\nWhat the self-test reported:\n${why.get(title) ?? 'nothing'}`,
          ).toEqual({ ...expected, byFixture: expected.status === 'failed' });
        }
        expect(
          run.status,
          'every self-test ended as marked: test.fail() where the fixture must fail it',
        ).toBe(0);
        expect(report.stats).toMatchObject({ unexpected: 0, flaky: 0 });
      } finally {
        rmSync(folder, { recursive: true, force: true });
      }
    },
  );
});
