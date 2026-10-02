/**
 * Typed, validated access to tests/perf/budget.json for the Playwright side of the QA harness:
 * the viewports of every project, the axe tags, the console rules and the visual thresholds.
 *
 * budget.json is the single source of truth for the BUILD_PROMPT.md §8 numbers
 * (docs/qa/test-plan.md §1). This module restates no number: it only reads and checks the shape.
 * Two counts are pinned at zero on purpose, because the code that enforces them is written for
 * zero: console problems (tests/e2e/fixtures.ts) and axe violations (tests/e2e/a11y.spec.ts).
 * Changing either needs the Director's approval and a code change, so the loader fails loudly.
 *
 * Owner: qa-lead.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const ViewportSchema = z.object({
  name: z.string().regex(/^\d+$/, 'a viewport name is its width, e.g. "390"'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  isMobile: z.boolean(),
  hasTouch: z.boolean(),
});

const QaBudgetSchema = z.object({
  accessibility: z.object({
    standard: z.string().min(1),
    axeTags: z.array(z.string().min(1)).min(1),
    maxViolations: z.literal(0),
  }),
  console: z.object({
    maxConsoleErrors: z.literal(0),
    maxPageErrors: z.literal(0),
    maxUnhandledRejections: z.literal(0),
    maxFailedSameOriginRequests: z.literal(0),
    /** The browser's and GPU driver's own notices are allowed in tests/e2e/problems.ts. */
    maxConsoleWarnings: z.literal(0),
    /** How long a route's smoke test keeps watching after network idle (QA-P0-005). */
    soakMs: z.number().int().nonnegative(),
    /** The widths (visual.viewports names) whose dark project soaks. */
    soakViewports: z.array(z.string().regex(/^\d+$/, 'a viewport name is its width')).min(1),
  }),
  visual: z.object({
    viewports: z.array(ViewportSchema).min(1),
    themes: z.array(z.enum(['dark', 'light'])).min(1),
    deviceScaleFactor: z.number().positive(),
    threshold: z.number().min(0).max(1),
    maxDiffPixelRatio: z.number().min(0).max(1),
  }),
});

export type ViewportSpec = z.infer<typeof ViewportSchema>;
export type QaBudget = z.infer<typeof QaBudgetSchema>;

export const BUDGET_FILE = resolve(import.meta.dirname, '../perf/budget.json');

/** Reads budget.json and checks the parts the Playwright harness uses. */
export function loadQaBudget(file: string = BUDGET_FILE): QaBudget {
  const parsed = QaBudgetSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`${file} does not match what the Playwright harness expects: ${problems}`);
  }
  return parsed.data;
}
