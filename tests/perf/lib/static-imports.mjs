/**
 * Static ES-module import extraction using V8's own module parser (node:vm SourceTextModule).
 *
 * Why V8: it is the same grammar the browser uses, so strings, template literals, comments,
 * regular expressions and dynamic import() can never be mistaken for a static import. Only
 * `import … from "x"`, `import "x"` and `export … from "x"` are returned. The module is parsed and
 * compiled, never linked or evaluated.
 *
 * vm.SourceTextModule needs --experimental-vm-modules. When the current process lacks it, this
 * module re-runs itself in a child Node process with the flag, so callers (the budget CLI, Vitest)
 * need no special flags.
 *
 * Owner: qa-lead. Zero dependencies.
 */
import vm from 'node:vm';
import { readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

/** True when this process can parse modules directly. */
export function canParseInProcess() {
  return typeof vm.SourceTextModule === 'function';
}

/**
 * Parse one module source. Returns the static import specifiers in source order (duplicates kept
 * out). Throws a SyntaxError if V8 rejects the source as a module.
 * @param {string} code
 * @param {string} identifier used in error messages
 * @returns {string[]}
 */
export function parseStaticImportsInProcess(code, identifier) {
  const mod = new vm.SourceTextModule(code, { identifier });
  // Newer Node exposes moduleRequests ({ specifier, attributes }); older exposes dependencySpecifiers.
  const specifiers = Array.isArray(mod.moduleRequests)
    ? mod.moduleRequests.map((request) => request.specifier)
    : [...mod.dependencySpecifiers];
  return [...new Set(specifiers)];
}

/**
 * @typedef {{ key: string, file?: string, code?: string }} ParseEntry  file = absolute path, or inline code
 * @typedef {{ specifiers: string[] } | { error: string }} ParseResult
 */

/**
 * Parse many modules. Uses the current process when possible, otherwise one child process.
 * @param {ParseEntry[]} entries
 * @returns {Record<string, ParseResult>}
 */
export function staticImportsOf(entries) {
  if (canParseInProcess()) return parseEntries(entries);
  const child = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', '--no-warnings', SELF, '--stdin-json'],
    { input: JSON.stringify(entries), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error(`V8 import parser exited with ${child.status}: ${child.stderr.trim()}`);
  }
  return JSON.parse(child.stdout);
}

/** @param {ParseEntry[]} entries @returns {Record<string, ParseResult>} */
function parseEntries(entries) {
  /** @type {Record<string, ParseResult>} */
  const out = {};
  for (const entry of entries) {
    try {
      const code = entry.code ?? readFileSync(/** @type {string} */ (entry.file), 'utf8');
      out[entry.key] = { specifiers: parseStaticImportsInProcess(code, entry.file ?? entry.key) };
    } catch (error) {
      out[entry.key] = {
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
    }
  }
  return out;
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(SELF);
  } catch {
    return false;
  }
}

if (isMain() && process.argv.includes('--stdin-json')) {
  if (!canParseInProcess()) {
    process.stderr.write('static-imports: run with --experimental-vm-modules\n');
    process.exit(2);
  }
  const input = readFileSync(0, 'utf8');
  process.stdout.write(JSON.stringify(parseEntries(JSON.parse(input))));
}
