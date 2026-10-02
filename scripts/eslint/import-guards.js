// @ts-check
/**
 * Rig Lab's import guards, as a local ESLint plugin (`rig-lab/...`), used by eslint.config.js.
 * Each rule resolves an import's specifier to the path it names, from the folder of the file
 * that imports it, so a guard rejects exactly the folders it protects: a `tests` folder inside
 * src/, or a file named like one, is not tests/.
 *
 * - `no-tests-import`: nothing under src/ imports tests/. QA's held-out results live in
 *   tests/audit/holdout/, and engine code must never see them (test plan §8).
 * - `engine-purity`: src/engine stays pure and Zod-free. It ships to the browser in the lab
 *   chunk, and the catalogue was already validated at build time.
 *
 * Both rules see every way to import: `import`, `export ... from`, `import()` (by its static
 * start when the name is computed), TypeScript's `import x = require()` and `import('x').T`,
 * and `require()`. Both take `{ root }`, the repo root.
 */
import { builtinModules } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {import('eslint').Rule.RuleModule} RuleModule */
/** @typedef {import('eslint').Rule.RuleContext} RuleContext */
/** @typedef {import('eslint').Rule.Node} Node */

/**
 * One import found in a file.
 * @typedef {object} FoundImport
 * @property {string} specifier The specifier, or for a computed `import()`, its static start.
 * @property {boolean} complete False when `specifier` is only the static start.
 * @property {boolean} typeOnly True when only types come in, so nothing loads at run time.
 * @property {Node} node The node to report.
 */

/** The options both rules take. */
const ROOT_OPTION = [
  {
    type: 'object',
    properties: { root: { type: 'string' } },
    required: ['root'],
    additionalProperties: false,
  },
];

/**
 * The string a specifier node holds: a string literal, or a template literal's text up to its
 * first `${...}`. `null` for anything else.
 * @param {unknown} node
 * @returns {{ value: string, complete: boolean } | null}
 */
function specifierOf(node) {
  if (typeof node !== 'object' || node === null || !('type' in node)) return null;
  const literal = /** @type {{ type: string, value?: unknown }} */ (node);
  if (literal.type === 'Literal' && typeof literal.value === 'string') {
    return { value: literal.value, complete: true };
  }
  if (literal.type === 'TemplateLiteral') {
    const template = /** @type {import('estree').TemplateLiteral} */ (node);
    const start = template.quasis[0]?.value.cooked ?? '';
    return { value: start, complete: template.expressions.length === 0 };
  }
  return null;
}

/**
 * Calls `found` for every import in the file.
 * @param {(found: FoundImport) => void} found
 * @returns {import('eslint').Rule.RuleListener}
 */
function importVisitors(found) {
  /**
   * @param {unknown} source
   * @param {boolean} typeOnly
   * @param {Node} node
   */
  const visit = (source, typeOnly, node) => {
    const specifier = specifierOf(source);
    if (specifier !== null) found({ ...specifier, specifier: specifier.value, typeOnly, node });
  };
  /** @param {Node} node */
  const kind = (node) => /** @type {{ importKind?: string, exportKind?: string }} */ (node);
  return {
    // With verbatimModuleSyntax, `import { type A } from 'x'` still loads 'x': only
    // `import type` brings in types alone.
    ImportDeclaration: (node) => {
      visit(node.source, kind(node).importKind === 'type', node);
    },
    ExportNamedDeclaration: (node) => {
      if (node.source) visit(node.source, kind(node).exportKind === 'type', node);
    },
    ExportAllDeclaration: (node) => {
      visit(node.source, kind(node).exportKind === 'type', node);
    },
    ImportExpression: (node) => {
      visit(node.source, false, node);
    },
    CallExpression: (node) => {
      if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
        visit(node.arguments[0], false, node);
      }
    },
    /** `import x = require('x')`. */
    TSImportEqualsDeclaration: (node) => {
      const declaration =
        /** @type {{ importKind?: string, moduleReference: { type: string, expression?: unknown } }} */ (
          /** @type {unknown} */ (node)
        );
      const reference = declaration.moduleReference;
      if (reference.type === 'TSExternalModuleReference') {
        visit(reference.expression, declaration.importKind === 'type', node);
      }
    },
    /** `typeof import('x')` and `import('x').T` in a type. Older parsers hold it in `argument`. */
    TSImportType: (node) => {
      const type = /** @type {{ source?: unknown, argument?: { literal?: unknown } }} */ (
        /** @type {unknown} */ (node)
      );
      visit(type.source ?? type.argument?.literal, true, node);
    },
  };
}

/**
 * The paths a specifier can name, from `fromDir`: a relative path; a path from the project
 * root (Vite's leading `/`) or from the file system's root; an absolute path; a `file:` URL.
 * A package name names no path. A query (`?raw`) or a hash is dropped first.
 * @param {string} specifier
 * @param {string} fromDir
 * @param {string} root
 * @returns {string[]}
 */
function pathsNamed(specifier, fromDir, root) {
  const path = specifier.replace(/[?#].*$/, '').replaceAll('\\', '/');
  if (path.startsWith('file:')) {
    try {
      return [fileURLToPath(path)];
    } catch {
      return [];
    }
  }
  if (path === '.' || path === '..' || path.startsWith('./') || path.startsWith('../')) {
    return [resolve(fromDir, path)];
  }
  if (path.startsWith('/')) return [resolve(root, `.${path}`), resolve(path)];
  if (isAbsolute(path)) return [resolve(path)];
  return [];
}

/**
 * True when `path` is `dir` or inside it.
 * @param {string} path
 * @param {string} dir
 */
function isInside(path, dir) {
  const rel = relative(dir, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * The part of a specifier that is known: all of it, or for a computed `import()`, its static
 * start up to the last `/`. A computed import can name anything inside that folder or package.
 * @param {FoundImport} found
 */
function knownPart(found) {
  return found.complete
    ? found.specifier
    : found.specifier.slice(0, found.specifier.lastIndexOf('/') + 1);
}

/**
 * The paths an import can name (see `pathsNamed` and `knownPart`).
 * @param {FoundImport} found
 * @param {string} fromDir
 * @param {string} root
 */
function pathsOf(found, fromDir, root) {
  const known = knownPart(found);
  return known === '' ? [] : pathsNamed(known, fromDir, root);
}

/**
 * The folder of the file being linted, and the repo root from the rule's options.
 * @param {RuleContext} context
 */
function placeOf(context) {
  const [{ root }] = /** @type {[{ root: string }]} */ (context.options);
  const file = resolve(context.cwd, context.physicalFilename);
  return { root: resolve(root), fromDir: dirname(file) };
}

/** A repo-relative path, with forward slashes. */
const shown = (/** @type {string} */ root, /** @type {string} */ path) =>
  relative(root, path).split(sep).join('/');

/** @type {RuleModule} */
const noTestsImport = {
  meta: {
    type: 'problem',
    docs: {
      description: "Forbid imports of tests/ from src/, where QA's held-out results live",
    },
    schema: ROOT_OPTION,
    messages: {
      testsImport:
        "src/ must not import tests/: QA's held-out results live there (test plan §8). '{{specifier}}' is {{path}}.",
    },
  },
  create(context) {
    const { root, fromDir } = placeOf(context);
    const testsDir = resolve(root, 'tests');
    return importVisitors((found) => {
      const path = pathsOf(found, fromDir, root).find((named) => isInside(named, testsDir));
      if (path === undefined) return;
      context.report({
        node: found.node,
        messageId: 'testsImport',
        data: { specifier: found.specifier, path: shown(root, path) },
      });
    });
  },
};

/** Packages the engine never loads: they are UI, routing, state and validation libraries. */
const UI_AND_ZOD_PACKAGES = new Set(['zod', 'react', 'react-dom', 'wouter', 'zustand']);
/** Folders of browser UI code that the engine never loads. */
const UI_FOLDERS = ['src/app', 'src/state', 'src/components', 'src/three'];
const NODE_BUILTINS = new Set(builtinModules);

/**
 * The package a bare specifier names: `zod/mini` is `zod`, `@scope/pkg/x` is `@scope/pkg`.
 * @param {string} specifier
 */
function packageOf(specifier) {
  const parts = specifier.split('/');
  return (specifier.startsWith('@') ? parts.slice(0, 2) : parts.slice(0, 1)).join('/');
}

const PURITY_REASON =
  'the engine stays pure and Zod-free, because it ships to the browser in the lab chunk and the catalogue was already validated at build time';

/** @type {RuleModule} */
const enginePurity = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep src/engine pure and Zod-free: no UI, state, routing, Node or Zod code, and src/data types only',
    },
    schema: ROOT_OPTION,
    messages: {
      package: `src/engine must not import '{{name}}' (\`import type\` is fine): ${PURITY_REASON}.`,
      node: `src/engine must not import Node's '{{name}}' (\`import type\` is fine): ${PURITY_REASON}.`,
      folder: `src/engine must not import {{folder}}/ (\`import type\` is fine): ${PURITY_REASON}.`,
      data: `src/engine may import src/data only with \`import type\`: ${PURITY_REASON}.`,
    },
  },
  create(context) {
    const { root, fromDir } = placeOf(context);
    const dataDir = resolve(root, 'src/data');
    const uiDirs = UI_FOLDERS.map((folder) => ({ folder, dir: resolve(root, folder) }));
    return importVisitors((found) => {
      const known = knownPart(found);
      if (found.typeOnly || known === '') return;
      const { node } = found;
      const paths = pathsOf(found, fromDir, root);
      if (paths.length === 0) {
        const name = packageOf(known);
        const module = found.complete ? known : name;
        if (UI_AND_ZOD_PACKAGES.has(name)) {
          context.report({ node, messageId: 'package', data: { name } });
        } else if (module.startsWith('node:') || NODE_BUILTINS.has(module)) {
          context.report({ node, messageId: 'node', data: { name: module } });
        }
        return;
      }
      const ui = uiDirs.find(({ dir }) => paths.some((path) => isInside(path, dir)));
      if (ui !== undefined) {
        context.report({ node, messageId: 'folder', data: { folder: ui.folder } });
      } else if (paths.some((path) => isInside(path, dataDir))) {
        context.report({ node, messageId: 'data' });
      }
    });
  },
};

/** The plugin, registered as `rig-lab` in eslint.config.js. */
export default {
  meta: { name: 'rig-lab-import-guards' },
  rules: { 'no-tests-import': noTestsImport, 'engine-purity': enginePurity },
};
