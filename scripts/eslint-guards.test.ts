/**
 * Negative controls for the import guards in eslint.config.js: planted code, linted with the
 * real config. Each guard must fail its planted import and pass the legitimate one, and the
 * lazy-3D guard must still fire inside src/engine/.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * The planted files. None is on disk, so no tsconfig includes them: typescript-eslint's
 * `allowDefaultProject` gives them type information from `scripts/eslint/tsconfig.planted.json`.
 * Everything else comes from the real eslint.config.js.
 */
const PLANTED = [
  'src/x.ts',
  'src/app/x.ts',
  'src/engine/x.ts',
  'src/engine/x.test.ts',
  'src/engine/perf/x.ts',
];

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfig: {
    files: PLANTED,
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: PLANTED,
          defaultProject: 'scripts/eslint/tsconfig.planted.json',
        },
      },
    },
  },
});

interface Finding {
  readonly ruleId: string | null;
  readonly message: string;
}

/** Lints planted code as if it were the file at `path`. */
async function lint(path: string, code: string): Promise<Finding[]> {
  const results = await eslint.lintText(code, { filePath: resolve(ROOT, path) });
  return results.flatMap((result) =>
    result.messages.map(({ ruleId, message }) => ({ ruleId, message })),
  );
}

const ruleIds = (findings: readonly Finding[]): (string | null)[] =>
  findings.map((finding) => finding.ruleId);

const TESTS_RULE = 'rig-lab/no-tests-import';
const TESTS_MESSAGE =
  "src/ must not import tests/: QA's held-out results live there (test plan §8).";
const PURITY_RULE = 'rig-lab/engine-purity';
const PURITY_REASON =
  'the engine stays pure and Zod-free, because it ships to the browser in the lab chunk and the catalogue was already validated at build time';
const LAZY_3D_MESSAGE = '3D code lives in src/three and loads only through React.lazy';

describe('the guard: src/ never imports tests/ (test plan §8)', { timeout: 60_000 }, () => {
  it("fails an import of QA's held-out set, naming the file it resolves to", async () => {
    const findings = await lint(
      'src/app/x.ts',
      "import results from '../../tests/audit/holdout/phase-1.json';\n\nexport default results;\n",
    );
    expect(findings).toContainEqual({
      ruleId: TESTS_RULE,
      message: `${TESTS_MESSAGE} '../../tests/audit/holdout/phase-1.json' is tests/audit/holdout/phase-1.json.`,
    });
  });

  it.each([
    [
      'a dynamic import()',
      "export const load = (): Promise<unknown> => import('../tests/lib/qa-budget');\n",
    ],
    [
      'a dynamic import() with a computed name',
      'export const load = (name: string): Promise<unknown> => import(`../tests/lib/${name}`);\n',
    ],
    ['export ... from', "export * from '../tests/lib/qa-budget';\n"],
    [
      'a type-only import',
      "import type { QaBudget } from '../tests/lib/qa-budget';\n\nexport type B = QaBudget;\n",
    ],
    ['an import type in a type', "export type B = typeof import('../tests/lib/qa-budget');\n"],
    ["Vite's root-relative path", "import '/tests/lib/qa-budget';\n"],
    [
      "a Vite '?raw' import",
      "import raw from '../tests/lib/qa-budget.ts?raw';\n\nexport default raw;\n",
    ],
    ['require()', "export const budget: unknown = require('../tests/lib/qa-budget');\n"],
    [
      'import = require()',
      "import budget = require('../tests/lib/qa-budget');\n\nexport default budget;\n",
    ],
    ['an absolute path', `import ${JSON.stringify(resolve(ROOT, 'tests/lib/qa-budget.ts'))};\n`],
    ['a file: URL', `import '${pathToFileURL(resolve(ROOT, 'tests/lib/qa-budget.ts')).href}';\n`],
  ])('fails %s from src/x.ts', async (_label, code) => {
    const findings = await lint('src/x.ts', code);
    expect(findings.filter((finding) => finding.ruleId === TESTS_RULE)).toHaveLength(1);
    // A computed name is known up to its last '/', so its message names the folder.
    expect(findings.find((finding) => finding.ruleId === TESTS_RULE)?.message).toMatch(
      /^src\/ must not import tests\/: QA's held-out results live there \(test plan §8\)\. '.+' is tests\/lib(\/qa-budget(\.ts)?)?\.$/,
    );
  });

  it('applies to test files under src/ too', async () => {
    const findings = await lint('src/engine/x.test.ts', "import '../../tests/lib/qa-budget';\n");
    expect(ruleIds(findings)).toContain(TESTS_RULE);
  });

  it('passes a folder named tests inside src/, a look-alike name, and a package', async () => {
    const inside = await lint('src/engine/perf/x.ts', "import '../tests/fixture';\n");
    const lookAlike = await lint('src/x.ts', "import '../testsuite/fixture';\n");
    const bare = await lint('src/x.ts', "import 'tests';\n");
    for (const findings of [inside, lookAlike, bare]) {
      expect(ruleIds(findings)).not.toContain(TESTS_RULE);
    }
  });

  it('passes a normal src/app file', async () => {
    const findings = await lint(
      'src/app/x.ts',
      "import type { Catalogue } from '../engine/types';\n\nexport const cpuCount = (catalogue: Catalogue): number => catalogue.parts.cpu.length;\n",
    );
    expect(findings).toEqual([]);
  });
});

describe('the guard: src/engine stays pure and Zod-free', { timeout: 60_000 }, () => {
  it.each([
    ['Zod', "import { z } from 'zod';\n\nexport const id = z.string();\n"],
    ['zod/mini', "import * as z from 'zod/mini';\n\nexport const id = z.string();\n"],
    ['Zod, by dynamic import()', "export const load = (): Promise<unknown> => import('zod');\n"],
    ['React', "import { useState } from 'react';\n\nexport const hook = useState;\n"],
    [
      'react-dom',
      "import { createRoot } from 'react-dom/client';\n\nexport const root = createRoot;\n",
    ],
    ['wouter', "import { Link } from 'wouter';\n\nexport const link = Link;\n"],
    ['zustand', "import { create } from 'zustand';\n\nexport const store = create;\n"],
    ['node:fs', "import { readFileSync } from 'node:fs';\n\nexport const read = readFileSync;\n"],
    [
      "Node's path without the prefix",
      "import { join } from 'path';\n\nexport const joined = join('a', 'b');\n",
    ],
    ['src/app', "import { BASE_PATH } from '../app/routes';\n\nexport const base = BASE_PATH;\n"],
    ['src/state', "import '../state/build-store';\n"],
    ['src/components', "import '../components/theme/ThemeToggle';\n"],
    [
      'a value from src/data',
      "import { Cpu } from '../data/schema';\n\nexport const schema = Cpu;\n",
    ],
    ['a value re-exported from src/data', "export { Cpu } from '../data/schema';\n"],
    [
      'src/data with only inline type specifiers, which still loads it',
      "import { type Cpu } from '../data/schema';\n\nexport type Socket = Cpu['socket'];\n",
    ],
    [
      'src/app, by a computed import()',
      'export const load = (page: string): Promise<unknown> => import(`../app/${page}`);\n',
    ],
    [
      'zod, by a computed import()',
      'export const load = (name: string): Promise<unknown> => import(`zod/${name}`);\n',
    ],
    [
      "Node's fs, by a computed import()",
      'export const load = (name: string): Promise<unknown> => import(`fs/${name}`);\n',
    ],
  ])('fails %s in src/engine/x.ts', async (_label, code) => {
    const findings = await lint('src/engine/x.ts', code);
    const purity = findings.filter((finding) => finding.ruleId === PURITY_RULE);
    expect(purity).toHaveLength(1);
    expect(purity[0]?.message).toContain(PURITY_REASON);
  });

  it('names the package or folder it rejects', async () => {
    const [zod] = await lint(
      'src/engine/x.ts',
      "import { z } from 'zod';\n\nexport const id = z.string();\n",
    );
    expect(zod).toEqual({
      ruleId: PURITY_RULE,
      message: `src/engine must not import 'zod' (\`import type\` is fine): ${PURITY_REASON}.`,
    });
    const data = await lint(
      'src/engine/x.ts',
      "import { Cpu } from '../data/schema';\n\nexport const schema = Cpu;\n",
    );
    expect(data).toEqual([
      {
        ruleId: PURITY_RULE,
        message: `src/engine may import src/data only with \`import type\`: ${PURITY_REASON}.`,
      },
    ]);
  });

  it.each([
    [
      'a type from src/data',
      "import type { Cpu } from '../data/schema';\n\nexport type CpuSocket = Cpu['socket'];\n",
    ],
    ['a type re-exported from src/data', "export type { Cpu } from '../data/schema';\n"],
    [
      'a type from React',
      "import type { ReactNode } from 'react';\n\nexport type Child = ReactNode;\n",
    ],
    [
      'another engine module',
      "import { estimate } from './estimate';\n\nexport const zero = estimate(0, 0, 'low');\n",
    ],
  ])('passes %s in src/engine/x.ts', async (_label, code) => {
    expect(await lint('src/engine/x.ts', code)).toEqual([]);
  });

  it('exempts engine tests, which may use Node and the data schemas', async () => {
    const findings = await lint(
      'src/engine/x.test.ts',
      "import { readFileSync } from 'node:fs';\nimport { Cpu } from '../data/schema';\n\nexport const used = [readFileSync, Cpu];\n",
    );
    expect(ruleIds(findings)).not.toContain(PURITY_RULE);
  });

  it('keeps the lazy-3D guard: three.js still fails inside src/engine/', async () => {
    const findings = await lint(
      'src/engine/x.ts',
      "import * as THREE from 'three';\n\nexport const revision = THREE.REVISION;\n",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('@typescript-eslint/no-restricted-imports');
    expect(findings[0]?.message).toContain(LAZY_3D_MESSAGE);
  });
});
