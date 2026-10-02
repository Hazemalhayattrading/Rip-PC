/**
 * Ships the catalogue to the browser as one content-hashed JSON file (plan WP-E0).
 *
 * - Build: validates every data file (`buildCatalogue`), fails the build on any error, and
 *   emits `assets/catalogue-<hash>.json`.
 * - Dev: serves the catalogue, rebuilt on every request so data edits show on reload, at
 *   `<base>__rig-lab/catalogue.json`. A validation error answers 500 with the issue list.
 * - Both: the virtual module `virtual:rig-lab/catalogue-url` exports the file's URL. Only the
 *   lab's loader imports it, so product pages never reference the catalogue.
 */
import { resolve } from 'node:path';
import type { Connect, Plugin, ResolvedConfig } from 'vite';
import { utcToday } from '../../src/data/validate/index.ts';
import { CatalogueError, buildCatalogue, readDataFiles } from '../catalogue/catalogue.ts';

export const CATALOGUE_URL_MODULE = 'virtual:rig-lab/catalogue-url';
const RESOLVED_ID = `\0${CATALOGUE_URL_MODULE}`;

/** Where the dev server serves the catalogue, relative to the base. */
export const DEV_CATALOGUE_PATH = '__rig-lab/catalogue.json';

/** The module source that exports the catalogue's URL. */
export function catalogueUrlModule(url: string): string {
  return `export default ${JSON.stringify(url)};\n`;
}

/**
 * Dev middleware: answers `<base>__rig-lab/catalogue.json` with a freshly built catalogue.
 * @param build builds the catalogue JSON; injectable for tests
 */
export function serveCatalogue(base: string, build: () => string): Connect.NextHandleFunction {
  const path = `${base}${DEV_CATALOGUE_PATH}`;
  return (req, res, next) => {
    const [pathname] = (req.url ?? '').split('?', 1);
    if (pathname !== path) {
      next();
      return;
    }
    try {
      const json = build();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(json);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(error instanceof Error ? error.message : String(error));
    }
  };
}

export interface CatalogueAssetOptions {
  /** The repo root that holds `data/`. Defaults to Vite's root. */
  readonly root?: string;
  /** Today's UTC date for the validator. Defaults to the real date. */
  readonly today?: () => string;
}

export function catalogueAsset(options: CatalogueAssetOptions = {}): Plugin {
  const today = options.today ?? (() => utcToday());
  let config: ResolvedConfig | null = null;
  /** The emitted file, relative to the output directory. Set at build start. */
  let emittedFile: string | null = null;

  const root = (): string => resolve(options.root ?? config?.root ?? process.cwd());

  return {
    name: 'rig-lab:catalogue',

    configResolved(resolved) {
      config = resolved;
    },

    buildStart() {
      if (config?.command !== 'build') return;
      try {
        const built = buildCatalogue(readDataFiles(root()), today());
        emittedFile = `${config.build.assetsDir}/${built.fileName}`;
        this.emitFile({ type: 'asset', fileName: emittedFile, source: built.json });
        if (built.warnings.length > 0) {
          this.warn(
            `The catalogue has ${String(built.warnings.length)} data warnings (non-blocking).`,
          );
        }
      } catch (error) {
        this.error(error instanceof CatalogueError ? error.message : String(error));
      }
    },

    resolveId(id) {
      return id === CATALOGUE_URL_MODULE ? RESOLVED_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_ID || config === null) return null;
      const file = config.command === 'build' ? emittedFile : DEV_CATALOGUE_PATH;
      if (file === null) {
        this.error('The catalogue URL was requested before the catalogue was built.');
      }
      return catalogueUrlModule(`${config.base}${file}`);
    },

    configureServer(server) {
      server.middlewares.use(
        serveCatalogue(
          server.config.base,
          () => buildCatalogue(readDataFiles(root()), today()).json,
        ),
      );
    },
  };
}
