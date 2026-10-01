/**
 * Every Playwright spec runs under the shared console fixture (docs/qa/test-plan.md §13.2):
 * - it imports `test` from tests/e2e/fixtures.ts, or from tests/visual/visual.ts which extends it;
 * - it never imports values from '@playwright/test' (`import type` is fine);
 * - a spec that makes its own browser context hands it to `problemGuard.watch()`.
 * The test plan asks for a lint rule; ESLint's config is build-lead's, so the rule lives here, in
 * the unit tests that `npm run verify` runs. Owner: qa-lead.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const TESTS = path.resolve(import.meta.dirname, '..');
const FIXTURE_MODULES = new Set([
  path.join(TESTS, 'e2e', 'fixtures.ts'),
  path.join(TESTS, 'visual', 'visual.ts'),
]);
const SPEC = /\.(spec|selftest)\.ts$/;

/** Every Playwright spec under tests/, skipping QA's hand-made build fixtures. */
function specFiles(): string[] {
  return readdirSync(TESTS, { recursive: true, encoding: 'utf8' })
    .filter((file) => SPEC.test(file) && !file.split(path.sep).includes('fixtures'))
    .map((file) => path.join(TESTS, file))
    .sort();
}

/** Why a spec breaks the rules; empty when it follows them. */
function specImportErrors(file: string, source: string): string[] {
  const errors: string[] = [];
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let importsFixtureTest = false;
  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const from = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (from === '@playwright/test') {
      // `import type { … }`: TypeScript 6 marks it with a phase modifier (it replaced isTypeOnly).
      if (clause?.phaseModifier !== ts.SyntaxKind.TypeKeyword) {
        errors.push(
          `imports values from '@playwright/test': use \`import type\` for types, and take test and expect from tests/e2e/fixtures.ts`,
        );
      }
      continue;
    }
    if (!from.startsWith('.')) continue;
    const bindings = clause?.namedBindings;
    const importsTest =
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((element) => !element.isTypeOnly && element.name.text === 'test');
    if (importsTest && FIXTURE_MODULES.has(path.resolve(path.dirname(file), from))) {
      importsFixtureTest = true;
    }
  }
  if (!importsFixtureTest) {
    errors.push('does not import test from tests/e2e/fixtures.ts (or tests/visual/visual.ts)');
  }
  if (source.includes('.newContext(') && !source.includes('.watch(')) {
    errors.push('makes its own browser context but never calls problemGuard.watch() on it');
  }
  return errors;
}

describe('Playwright specs run under the shared console fixture', () => {
  const files = specFiles();

  it('finds the specs', () => {
    const names = files.map((file) => path.relative(TESTS, file).split(path.sep).join('/'));
    expect(names).toEqual(
      expect.arrayContaining([
        'e2e/a11y.spec.ts',
        'e2e/smoke.spec.ts',
        'harness/guard/guard.selftest.ts',
        'perf/web-vitals.spec.ts',
        'visual/routes.spec.ts',
      ]),
    );
  });

  for (const file of files) {
    it(path.relative(TESTS, file), () => {
      expect(specImportErrors(file, readFileSync(file, 'utf8'))).toEqual([]);
    });
  }
});

describe('the rule itself', () => {
  const file = path.join(TESTS, 'e2e', 'example.spec.ts');

  it('passes a spec that uses the fixture', () => {
    const source = `import type { Page } from '@playwright/test';\nimport { expect, test } from './fixtures.ts';`;
    expect(specImportErrors(file, source)).toEqual([]);
  });

  it('fails a spec that takes test from @playwright/test', () => {
    const source = `import { expect, test } from '@playwright/test';`;
    expect(specImportErrors(file, source)).toHaveLength(2);
  });

  it('fails an inline type import, which still loads @playwright/test at run time', () => {
    const source = `import { type Page } from '@playwright/test';\nimport { test } from './fixtures.ts';`;
    expect(specImportErrors(file, source)).toHaveLength(1);
  });

  it('fails a test imported from anywhere else, or only as a type', () => {
    expect(specImportErrors(file, `import { test } from './other.ts';`)).toHaveLength(1);
    expect(specImportErrors(file, `import { type test } from './fixtures.ts';`)).toHaveLength(1);
  });

  it('fails a new context that is never watched', () => {
    const source = `import { test } from './fixtures.ts';\nconst context = await browser.newContext();`;
    expect(specImportErrors(file, source)).toEqual([
      'makes its own browser context but never calls problemGuard.watch() on it',
    ]);
  });
});
