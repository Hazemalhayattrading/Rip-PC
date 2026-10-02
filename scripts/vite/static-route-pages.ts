/**
 * Writes one real HTML file per known route, plus 404.html, at build time.
 *
 * GitHub Pages is a static host: a route only loads directly (HTTP 200, no redirect) when a file
 * exists for it. Each file is the built index.html with that route's <title> and description,
 * so the right title shows before any JavaScript runs. The file layout comes from the route
 * table (`htmlFileOf`), which is why `/build/cpu` becomes `build/cpu.html`.
 *
 * A page the route table marks not indexable (the Engine lab) also gets
 * `<meta name="robots" content="noindex" />`. Every other page, 404.html included, gets nothing
 * more than its title and description.
 */
import type { Plugin } from 'vite';
import {
  KNOWN_ROUTES,
  NOT_FOUND_HTML_FILE,
  htmlFileOf,
  metaOf,
  type PageMeta,
} from '../../src/app/routes.ts';

export interface StaticPage {
  /** Path of the HTML file, relative to the output directory. */
  readonly fileName: string;
  readonly meta: PageMeta;
}

/** Every HTML file the build writes: one per known route, then 404.html. */
export function planStaticPages(): readonly StaticPage[] {
  return [
    ...KNOWN_ROUTES.map((route) => ({ fileName: htmlFileOf(route), meta: metaOf(route) })),
    { fileName: NOT_FOUND_HTML_FILE, meta: metaOf({ name: 'not-found' }) },
  ];
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const TITLE = /<title>[^<]*<\/title>/g;
// Tolerates the line breaks Prettier puts between attributes in index.html.
const DESCRIPTION = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/g;
const ROBOTS = /<meta\s[^>]*name\s*=\s*["']?robots\b/i;

/** What a page that is not indexable carries, right after its description. */
export const ROBOTS_NOINDEX_TAG = '<meta name="robots" content="noindex" />';

/**
 * Returns the page HTML with its <title> and description set from `meta`, and the robots
 * `noindex` tag when `meta.indexable` is false.
 * @throws {Error} unless the template has exactly one <title>, one description and no robots tag.
 */
export function withPageMeta(html: string, meta: PageMeta): string {
  const titles = html.match(TITLE)?.length ?? 0;
  const descriptions = html.match(DESCRIPTION)?.length ?? 0;
  if (titles !== 1 || descriptions !== 1) {
    throw new Error(
      `index.html must have exactly one <title> and one <meta name="description">; found ${String(titles)} and ${String(descriptions)}.`,
    );
  }
  if (ROBOTS.test(html)) {
    throw new Error(
      'index.html must not have a <meta name="robots">: the build writes it for each page that src/app/routes.ts marks not indexable.',
    );
  }
  const description = `<meta name="description" content="${escapeHtml(meta.description)}" />`;
  return html
    .replace(TITLE, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace(DESCRIPTION, () =>
      meta.indexable ? description : `${description}\n    ${ROBOTS_NOINDEX_TAG}`,
    );
}

export function staticRoutePages(): Plugin {
  return {
    name: 'rig-lab:static-route-pages',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const template = bundle['index.html'];
      if (template?.type !== 'asset') {
        this.error('index.html is missing from the bundle, so no route pages can be written.');
      }
      const html =
        typeof template.source === 'string'
          ? template.source
          : new TextDecoder().decode(template.source);
      for (const page of planStaticPages()) {
        const source = withPageMeta(html, page.meta);
        if (page.fileName === 'index.html') {
          template.source = source;
        } else {
          this.emitFile({ type: 'asset', fileName: page.fileName, source });
        }
      }
    },
  };
}
