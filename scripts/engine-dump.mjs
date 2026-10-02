/**
 * `npm run engine:dump` (plan WP-E0): writes every compatibility rule's dump and a summary to
 * artifacts/engine/. The work is in scripts/engine-dump.ts.
 *
 * Node's own type stripping can't load the engine and data modules, which use extensionless
 * imports, so this launcher loads the TypeScript through Vite's module runner (`runnerImport`).
 * `configFile: false` keeps the app's Vite config and plugins out of it.
 */
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const root = resolve(import.meta.dirname, '..');
const { module: engineDump } = await runnerImport(resolve(root, 'scripts/engine-dump.ts'), {
  configFile: false,
  root,
  logLevel: 'error',
});
process.exitCode = engineDump.main({ root });
