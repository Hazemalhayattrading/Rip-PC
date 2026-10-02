/**
 * What playwright.config.ts tells each e2e project's tests about itself, through `metadata`:
 * the theme its pages must show, and how long a route's smoke test keeps watching the page
 * (budget.json `console.soakMs`, QA-P0-005). Validated here, because Playwright types metadata
 * as `any`. Owner: qa-lead.
 */
import type { TestInfo } from '@playwright/test';
import { z } from 'zod';

const ProjectMetaSchema = z.object({
  theme: z.enum(['dark', 'light']),
  soakMs: z.number().int().nonnegative(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

/** The theme and soak time of the e2e project running this test. */
export function projectMeta(testInfo: TestInfo): ProjectMeta {
  const parsed = ProjectMetaSchema.safeParse(testInfo.project.metadata);
  if (!parsed.success) {
    throw new Error(
      `project "${testInfo.project.name}" has no valid { theme, soakMs } metadata: set it in playwright.config.ts`,
    );
  }
  return parsed.data;
}
