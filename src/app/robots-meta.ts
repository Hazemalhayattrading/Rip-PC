/**
 * Keeps `<meta name="robots">` in step with the page on in-app navigation, the way `App.tsx`
 * keeps `document.title`. The build writes `<meta name="robots" content="noindex" />` into the
 * HTML of every page the route table marks not indexable (`scripts/vite/static-route-pages.ts`);
 * after a client-side move to an indexable page, the tag must go, and come back on the way back.
 */

/** The parts of a robots `<meta>` element this module touches. */
export interface RobotsElement {
  name: string;
  content: string;
  remove(): void;
}

/**
 * The parts of `document` this module touches, so it runs in Node tests too. The browser's
 * `document` is one, with `HTMLMetaElement` as `E`.
 */
export interface RobotsDocument<E extends RobotsElement = RobotsElement> {
  querySelector(selector: 'meta[name="robots"]'): E | null;
  createElement(tagName: 'meta'): E;
  readonly head: { append(element: E): void };
}

/** Adds, keeps or removes the page's robots `noindex` tag so it matches `indexable`. */
export function syncRobotsMeta<E extends RobotsElement>(
  doc: RobotsDocument<E>,
  indexable: boolean,
): void {
  const existing = doc.querySelector('meta[name="robots"]');
  if (indexable) {
    existing?.remove();
    return;
  }
  if (existing !== null) {
    existing.content = 'noindex';
    return;
  }
  const meta = doc.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex';
  doc.head.append(meta);
}
