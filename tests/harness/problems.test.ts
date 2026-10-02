/**
 * The rules of the shared console fixture (tests/e2e/problems.ts), without a browser.
 * tests/harness/guard.test.ts covers the same rules end to end in Chromium. Owner: qa-lead.
 */
import { describe, expect, it } from 'vitest';
import {
  ALLOWED,
  CHROMIUM_404_CONSOLE_TEXT,
  allowListErrors,
  assertValidAllowList,
  classify,
  isReportableFailure,
  isSameOrigin,
  utcDate,
  type AllowedProblem,
  type Problem,
} from '../e2e/problems.ts';

const SITE = 'http://127.0.0.1:4173';
const PAGE_404 = `${SITE}/Rip-PC/no-such-page`;

const notFoundPage: Problem = {
  kind: 'http-error',
  text: 'HTTP 404 Not Found',
  url: PAGE_404,
  documentUrl: 'about:blank',
  resourceType: 'document',
  mainFrameDocument: true,
  status: 404,
};
const notFoundPageConsole: Problem = {
  kind: 'console.error',
  text: CHROMIUM_404_CONSOLE_TEXT,
  url: PAGE_404,
  documentUrl: PAGE_404,
};
const missingImage: Problem = {
  kind: 'http-error',
  text: 'HTTP 404 Not Found',
  url: `${SITE}/Rip-PC/missing.png`,
  documentUrl: PAGE_404,
  resourceType: 'image',
  mainFrameDocument: false,
  status: 404,
};
const missingImageConsole: Problem = {
  kind: 'console.error',
  text: CHROMIUM_404_CONSOLE_TEXT,
  url: `${SITE}/Rip-PC/missing.png`,
  documentUrl: PAGE_404,
};

const entry = (overrides: Partial<AllowedProblem>): AllowedProblem => ({
  id: 'example',
  matches: () => false,
  reason: 'Why this is not a bug.',
  owner: 'qa-lead',
  until: 'permanent',
  ...overrides,
});

describe('the allow-list', () => {
  it('is valid today: an expired entry fails the unit tests as well as the e2e run', () => {
    expect(allowListErrors(ALLOWED, utcDate(new Date()))).toEqual([]);
  });

  it('gives every entry an id, a reason, a team and an end', () => {
    for (const allowed of ALLOWED) {
      expect(allowed.id).toMatch(/^[a-z0-9-]+$/);
      expect(allowed.reason.length).toBeGreaterThan(40);
      expect(allowed.owner).toBe('qa-lead');
    }
  });

  it('rejects an empty reason, an unknown owner and a repeated id', () => {
    const errors = allowListErrors(
      [entry({ reason: '  ' }), entry({ owner: 'someone' }), entry({ id: '' })],
      '2026-09-30',
    );
    expect(errors).toEqual([
      '"example": reason is empty; say why this is not a bug',
      '"example": the id is used twice',
      '"example": owner "someone" is not a team (data-lead, build-lead, design-lead, qa-lead)',
      'entry 3: id is empty',
    ]);
  });

  it('accepts permanent, an issue link, and a date up to and including its last day', () => {
    const today = '2026-09-30';
    expect(allowListErrors([entry({ id: 'a', until: 'permanent' })], today)).toEqual([]);
    expect(
      allowListErrors([entry({ id: 'b', until: 'https://github.com/o/r/issues/1' })], today),
    ).toEqual([]);
    expect(allowListErrors([entry({ id: 'c', until: '2026-09-30' })], today)).toEqual([]);
    expect(allowListErrors([entry({ id: 'd', until: '2027-01-31' })], today)).toEqual([]);
  });

  it('rejects an expired date and anything that is not a date, a link or permanent', () => {
    const today = '2026-09-30';
    expect(allowListErrors([entry({ until: '2026-09-29' })], today)).toEqual([
      '"example": expired after 2026-09-29; fix the cause and remove the entry, or renew it with the Director\'s approval',
    ]);
    for (const until of ['', 'soon', '2026-02-30', '30/09/2026', 'http://example.com/1']) {
      expect(allowListErrors([entry({ until })], today), until).toHaveLength(1);
    }
  });

  it('stops the run with every error listed', () => {
    expect(() => {
      assertValidAllowList([entry({ reason: '' })], '2026-09-30');
    }).toThrow(/allow-list in tests\/e2e\/problems\.ts is invalid:\n- "example": reason is empty/);
  });
});

describe('classify', () => {
  it('fails a page that answers 404 unless the test says it asks for one', () => {
    const problems = [notFoundPage, notFoundPageConsole];
    expect(classify(problems, { expectNotFoundDocument: false }).unexpected).toEqual(problems);
    expect(classify(problems, { expectNotFoundDocument: true })).toEqual({
      unexpected: [],
      allowed: [
        { problem: notFoundPage, allowedBy: 'not-found-page-status' },
        { problem: notFoundPageConsole, allowedBy: 'not-found-page-console' },
      ],
    });
  });

  it('still fails a missing image on a page that answers 404 on purpose', () => {
    const verdict = classify(
      [notFoundPage, notFoundPageConsole, missingImage, missingImageConsole],
      {
        expectNotFoundDocument: true,
      },
    );
    expect(verdict.unexpected).toEqual([missingImage, missingImageConsole]);
  });

  it('allows the 404 console text only for the URL of a page that answered 404', () => {
    // The console error alone, with no 404 page behind it, proves nothing.
    expect(classify([notFoundPageConsole], { expectNotFoundDocument: true }).unexpected).toEqual([
      notFoundPageConsole,
    ]);
  });

  it('fails a page that answers 500 even when the test expects a 404 page', () => {
    const serverError: Problem = {
      ...notFoundPage,
      text: 'HTTP 500 Internal Server Error',
      status: 500,
    };
    expect(classify([serverError], { expectNotFoundDocument: true }).unexpected).toEqual([
      serverError,
    ]);
  });

  it("allows the browser's software-WebGL notice and the GPU driver's ReadPixels note", () => {
    const at = { url: `${SITE}/Rip-PC/build/cpu`, documentUrl: `${SITE}/Rip-PC/build/cpu` };
    const notices: Problem[] = [
      {
        kind: 'console.warning',
        text: '[GroupMarkerNotSet(crbug.com/242999)!:A0402700246C0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader (about:flags#enable-unsafe-swiftshader) flag to opt in to lower security guarantees for trusted content.',
        ...at,
      },
      {
        kind: 'console.warning',
        text: '[.WebGL-0x202c00194200]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels',
        ...at,
      },
      {
        kind: 'console.warning',
        text: '[.WebGL-0x6e6400194e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)',
        ...at,
      },
    ];
    expect(
      classify(notices, { expectNotFoundDocument: false }).allowed.map((a) => a.allowedBy),
    ).toEqual([
      'software-webgl-notice',
      'gpu-readpixels-stall-notice',
      'gpu-readpixels-stall-notice',
    ]);
  });

  it('fails every other warning, and the same notices logged as errors', () => {
    const at = { url: `${SITE}/Rip-PC/build/cpu`, documentUrl: `${SITE}/Rip-PC/build/cpu` };
    const others: Problem[] = [
      // An app's own warning (QA-P0-001's text, before build-lead's filter).
      {
        kind: 'console.warning',
        text: 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
        ...at,
      },
      // Chrome's unused-preload warning on a repeat load (QA-P0-017).
      {
        kind: 'console.warning',
        text: `The resource ${SITE}/Rip-PC/assets/rig-lab-sans.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate \`as\` value and it is preloaded intentionally.`,
        ...at,
      },
      {
        kind: 'console.warning',
        text: '[.WebGL-0x202c00194200]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): Buffer performance warning',
        ...at,
      },
      {
        kind: 'console.warning',
        text: 'GPU stall due to ReadPixels',
        ...at,
      },
      {
        kind: 'console.error',
        text: '[.WebGL-0x202c00194200]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels',
        ...at,
      },
    ];
    for (const expectNotFoundDocument of [false, true]) {
      expect(classify(others, { expectNotFoundDocument }).unexpected).toEqual(others);
    }
  });

  it('never allows anything else', () => {
    const others: Problem[] = [
      {
        kind: 'console.error',
        text: 'boom',
        url: `${SITE}/Rip-PC/`,
        documentUrl: `${SITE}/Rip-PC/`,
      },
      {
        kind: 'console.warning',
        text: 'boom',
        url: `${SITE}/Rip-PC/`,
        documentUrl: `${SITE}/Rip-PC/`,
      },
      { kind: 'pageerror', text: 'Error: boom', url: '', documentUrl: `${SITE}/Rip-PC/` },
      { kind: 'unhandledrejection', text: 'Error: boom', url: '', documentUrl: `${SITE}/Rip-PC/` },
      { kind: 'crash', text: 'the page crashed', url: '', documentUrl: `${SITE}/Rip-PC/` },
    ];
    for (const expectNotFoundDocument of [false, true]) {
      expect(classify(others, { expectNotFoundDocument }).unexpected).toEqual(others);
    }
  });
});

describe('same-origin and failure rules', () => {
  it('compares scheme, host and port, and never counts data: or bad URLs', () => {
    expect(isSameOrigin(`${SITE}/Rip-PC/assets/index.js`, SITE)).toBe(true);
    expect(isSameOrigin('http://127.0.0.1:4174/Rip-PC/', SITE)).toBe(false);
    expect(isSameOrigin('https://127.0.0.1:4173/Rip-PC/', SITE)).toBe(false);
    expect(isSameOrigin('http://localhost:4173/Rip-PC/', SITE)).toBe(false);
    expect(isSameOrigin('data:,', SITE)).toBe(false);
    expect(isSameOrigin('not a url', SITE)).toBe(false);
  });

  it('ignores only requests the page itself abandoned', () => {
    expect(isReportableFailure('net::ERR_ABORTED')).toBe(false);
    for (const error of [
      'net::ERR_FAILED',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_BLOCKED_BY_CLIENT',
    ]) {
      expect(isReportableFailure(error)).toBe(true);
    }
  });

  it('dates in UTC', () => {
    expect(utcDate(new Date('2026-09-30T23:59:59-05:00'))).toBe('2026-10-01');
  });
});
