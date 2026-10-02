/**
 * Accessibility: axe-core's WCAG 2.1 AA rules on every route and on the 404 page
 * (BUILD_PROMPT.md §8 "WCAG 2.1 AA for all non-3D UI", docs/qa/test-plan.md §10.1).
 *
 * - Runs in every e2e project, so at every width in budget.json (390, 768 and 1440 px), in both
 *   themes (`visual.themes`): dark, the first-visit default, and light, the stored choice.
 *   Each page must show its project's theme first, so a light run can never silently test dark.
 * - Tags and the violation budget come from budget.json `accessibility`: a violation of any impact
 *   fails. axe's "needs review" results never fail; they are listed per page for a manual decision.
 * - Build steps are checked with the 3D preview started, as a visitor sees them.
 *
 * Owner: qa-lead.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { KNOWN_ROUTES, metaOf, pathOf, type RouteMatch } from '../../src/app/routes.ts';
import { GARAGE_TEXT } from '../../src/components/garage/garage-text.ts';
import { projectMeta } from '../lib/project-meta.ts';
import { loadQaBudget } from '../lib/qa-budget.ts';
import { expect, test } from './fixtures.ts';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type AxeRuleResult = AxeResults['violations'][number];

const { accessibility } = loadQaBudget();
const TAGS = [...accessibility.axeTags];

/** One line per rule: id, impact, how many elements, and the first few of them. */
function describeRule(rule: AxeRuleResult): string {
  const targets = rule.nodes.slice(0, 3).map((node) => node.target.join(' '));
  const more = rule.nodes.length > 3 ? ` and ${String(rule.nodes.length - 3)} more` : '';
  return `${rule.id} (${rule.impact ?? 'no impact'}, ${String(rule.nodes.length)} element(s)): ${rule.help}. At ${targets.join(', ')}${more}. ${rule.helpUrl}`;
}

async function checkPage(
  page: Page,
  testInfo: TestInfo,
  path: string,
  match: RouteMatch,
): Promise<void> {
  const response = await page.goto(path.slice(1));
  expect(response?.status()).toBe(match.name === 'not-found' ? 404 : 200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(metaOf(match).heading);
  await expect(page.locator('html')).toHaveAttribute('data-theme', projectMeta(testInfo).theme);
  if (match.name === 'build') {
    await expect(
      page.getByRole('region', { name: GARAGE_TEXT.region }).locator('canvas'),
    ).toBeVisible();
  }

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = results.violations.map(describeRule);
  const needsReview = results.incomplete.map(describeRule);
  testInfo.annotations.push({
    type: 'axe',
    description: `${String(results.violations.length)} violations, ${String(results.incomplete.length)} to review, ${String(results.passes.length)} rules passed, ${String(results.inapplicable.length)} not applicable (axe-core ${results.testEngine.version}; ${TAGS.join(', ')})`,
  });
  for (const rule of needsReview)
    testInfo.annotations.push({ type: 'axe: needs review', description: rule });
  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(
      {
        url: results.url,
        testEngine: results.testEngine,
        tags: TAGS,
        counts: {
          violations: results.violations.length,
          incomplete: results.incomplete.length,
          passes: results.passes.length,
          inapplicable: results.inapplicable.length,
        },
        violations: results.violations,
        incomplete: results.incomplete,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });

  expect(violations, `axe ${TAGS.join(', ')} violations on ${path}`).toEqual([]);
}

test.describe('accessibility: WCAG 2.1 AA (axe)', { tag: ['@smoke', '@a11y'] }, () => {
  for (const route of KNOWN_ROUTES) {
    const path = pathOf(route);
    test(`${path} has no axe violations`, async ({ page }, testInfo) => {
      await checkPage(page, testInfo, path, route);
    });
  }

  test.describe('the 404 page', () => {
    test.use({ expectNotFoundDocument: true });

    test('/no-such-page has no axe violations', async ({ page }, testInfo) => {
      await checkPage(page, testInfo, '/no-such-page', { name: 'not-found' });
    });
  });
});
