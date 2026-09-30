/**
 * Makes `vite preview` answer the way GitHub Pages does, so e2e tests exercise the real layout.
 *
 * Vite's preview server already resolves `/x` to `x.html` and `/x/` to `x/index.html`, which is
 * what GitHub Pages does (checked against a live Pages site on 2026-09-30). What it lacks is the
 * Pages 404 behaviour: any path without a file gets status 404 with the body of `404.html`.
 * This plugin adds that as the last middleware before Vite's own HTML and 404 handlers.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { NOT_FOUND_HTML_FILE } from '../../src/app/routes.ts';

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function pathnameOf(url: string): string | null {
  const [pathname = '/'] = url.split(/[?#]/, 1);
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

/**
 * Middleware that lets an existing `.html` file through (Vite serves it with 200) and answers
 * everything else with 404 and the `404.html` page. `req.url` is relative to the base here,
 * because Vite strips the base before this middleware runs.
 */
export function notFoundLikeGithubPages(distDir: string): Connect.NextHandleFunction {
  const root = resolve(distDir);
  const notFoundPage = resolve(root, NOT_FOUND_HTML_FILE);
  return (req, res, next) => {
    const pathname = pathnameOf(req.url ?? '/');
    if (pathname?.endsWith('.html')) {
      const file = resolve(root, `.${pathname}`);
      if (file.startsWith(root + sep) && isFile(file)) {
        next();
        return;
      }
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(notFoundPage));
  };
}

export function githubPagesPreview(): Plugin {
  return {
    name: 'rig-lab:github-pages-preview',
    configurePreviewServer(server) {
      const distDir = resolve(server.config.root, server.config.build.outDir);
      if (!isFile(resolve(distDir, NOT_FOUND_HTML_FILE))) {
        throw new Error(
          `${resolve(distDir, NOT_FOUND_HTML_FILE)} does not exist. Run \`npm run build\` before \`npm run preview\` or the e2e tests.`,
        );
      }
      return () => {
        server.middlewares.use(notFoundLikeGithubPages(distDir));
      };
    },
  };
}
