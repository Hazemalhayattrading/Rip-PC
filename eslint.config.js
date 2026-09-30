// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LAZY_3D_MESSAGE =
  '3D code lives in src/three and loads only through React.lazy, so the landing page never downloads it. Import src/three with a dynamic import() instead.';

export default defineConfig([
  globalIgnores([
    'dist/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'artifacts/',
    'docs/',
    '.claude/',
    '.agents/',
  ]),

  // Every TypeScript file: type-aware strict and stylistic rules.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },

  // Browser code: rules of hooks, Fast Refresh boundaries and accessibility.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Architecture guard: three.js, React Three Fiber, drei and postprocessing stay in the lazy chunk.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/three/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(three|postprocessing)(/|$)|^@react-three/',
              message: LAZY_3D_MESSAGE,
              allowTypeImports: true,
            },
            {
              // Relative imports into src/three, e.g. '../three/Garage'.
              regex: '^\\.\\.?/(.*/)?three(/|$)',
              message: LAZY_3D_MESSAGE,
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  // Tooling and tests run in Node.
  {
    files: ['*.config.{ts,js}', 'scripts/**', 'tests/**', 'src/**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Plain JavaScript (this file): no type information.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Last: turn off stylistic rules that Prettier owns.
  prettier,
]);
