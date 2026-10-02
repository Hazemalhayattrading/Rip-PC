/**
 * Makes `vite preview`, and `vite` in dev, answer the way GitHub Pages does, so e2e tests
 * exercise the real layout.
 *
 * Vite's preview server already resolves `/x` to `x.html` and `/x/` to `x/index.html`, which is
 * what GitHub Pages does (checked against a live Pages site on 2026-09-30). What it lacks:
 * - the Pages 404 behaviour: any path without a file gets status 404 with the body of `404.html`;
 * - the Pages folder redirect: `/lab`, a folder that holds an `index.html`, answers 301 to
 *   `/lab/`, keeping the query (checked on the live site on 2026-10-02).
 * This plugin adds both as the last middleware before Vite's own HTML and 404 handlers.
 *
 * Live Pages also redirects a folder without an `index.html` (`/build` → `/build/`, which then
 * answers 404). Here such a folder answers 404 at once, as QA's smoke test expects of `/build`.
 *
 * The dev server serves the app for any path, so it has no folders to look at. There the route
 * table's folder indexes (`/lab/`) drive the same 301, before Vite's own middlewares.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { KNOWN_ROUTES, NOT_FOUND_HTML_FILE, pathOf } from '../../src/app/routes.ts';

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** The part of a request URL before its query, as sent: still percent-encoded. */
function rawPathOf(url: string): string {
  const [path = '/'] = url.split(/[?#]/, 1);
  return path;
}

function pathnameOf(url: string): string | null {
  try {
    return decodeURIComponent(rawPathOf(url));
  } catch {
    return null;
  }
}

/**
 * Middleware that lets an existing `.html` file through (Vite serves it with 200), redirects a
 * folder that holds an `index.html` to its trailing slash (301, query kept), and answers
 * everything else with 404 and the `404.html` page. `req.url` is relative to the base here,
 * because Vite strips the base before this middleware runs, so the redirect puts `base` back.
 * @param base the site base with its slashes, such as `/Rip-PC/`
 */
export function notFoundLikeGithubPages(distDir: string, base = '/'): Connect.NextHandleFunction {
  const root = resolve(distDir);
  const notFoundPage = resolve(root, NOT_FOUND_HTML_FILE);
  const inside = (path: string): boolean => path.startsWith(root + sep);
  return (req, res, next) => {
    const url = req.url ?? '/';
    const pathname = pathnameOf(url);
    if (pathname?.endsWith('.html')) {
      const file = resolve(root, `.${pathname}`);
      if (inside(file) && isFile(file)) {
        next();
        return;
      }
    } else if (pathname !== null && !pathname.endsWith('/')) {
      const folder = resolve(root, `.${pathname}`);
      if (inside(folder) && isFile(join(folder, 'index.html'))) {
        const rawPath = rawPathOf(url);
        res.statusCode = 301;
        res.setHeader('Location', `${base}${rawPath.slice(1)}/${url.slice(rawPath.length)}`);
        res.end();
        return;
      }
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(notFoundPage));
  };
}

/** The route table's folder indexes other than home, without their trailing slash: `/lab`. */
export function folderIndexPaths(): string[] {
  return KNOWN_ROUTES.map(pathOf)
    .filter((path) => path !== '/' && path.endsWith('/'))
    .map((path) => path.slice(0, -1));
}

/**
 * Dev middleware: a folder index asked for without its trailing slash answers 301 to it, the
 * query kept, as GitHub Pages does. It runs before Vite's base middleware, so `req.url` still
 * holds the base.
 * @param base the site base with its slashes, such as `/Rip-PC/`
 */
export function folderRedirects(base: string): Connect.NextHandleFunction {
  const folders = new Set(folderIndexPaths().map((path) => `${base}${path.slice(1)}`));
  return (req, res, next) => {
    const url = req.url ?? '/';
    const rawPath = rawPathOf(url);
    if (!folders.has(rawPath)) {
      next();
      return;
    }
    res.statusCode = 301;
    res.setHeader('Location', `${rawPath}/${url.slice(rawPath.length)}`);
    res.end();
  };
}

export function githubPagesPreview(): Plugin {
  return {
    name: 'rig-lab:github-pages-preview',
    configureServer(server) {
      server.middlewares.use(folderRedirects(server.config.base));
    },
    configurePreviewServer(server) {
      const distDir = resolve(server.config.root, server.config.build.outDir);
      if (!isFile(resolve(distDir, NOT_FOUND_HTML_FILE))) {
        throw new Error(
          `${resolve(distDir, NOT_FOUND_HTML_FILE)} does not exist. Run \`npm run build\` before \`npm run preview\` or the e2e tests.`,
        );
      }
      return () => {
        server.middlewares.use(notFoundLikeGithubPages(distDir, server.config.base));
      };
    },
  };
}
