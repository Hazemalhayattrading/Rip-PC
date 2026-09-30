/**
 * Keeps the build in the URL, so every page's address is a share link.
 *
 * On load, the build is read from the `b` query parameter. From then on the store is the
 * source of truth and the URL mirrors it: a change to the build rewrites `b` in place
 * (`history.replaceState`, no new history entry), and so does any navigation that arrives
 * without it. Back and Forward therefore move between pages without undoing picks.
 *
 * The browser is reached only through `UrlPort`, so this module is pure and tested in Node.
 */
import type { StoreApi } from 'zustand/vanilla';
import { encodeSelections, type BuildState } from './build-store';

export const BUILD_PARAM = 'b';

/** Access to the current URL. The app passes one backed by `window.location` and `history`. */
export interface UrlPort {
  /** The current search string: `''` or `'?…'`. */
  readonly search: () => string;
  /** Replaces the search string of the current history entry, keeping path and hash. */
  readonly replaceSearch: (search: string) => void;
}

/** Plain functions, safe to pass around unbound (for example as a React prop). */
export interface BuildUrlSync {
  /** Writes the store's build into the URL if the URL shows a different one. */
  readonly reconcile: () => void;
  /** Stops mirroring store changes into the URL. */
  readonly disconnect: () => void;
}

/** The build parameter of a search string, or `null` when it has none. */
export function readBuildParam(search: string): string | null {
  return new URLSearchParams(search).get(BUILD_PARAM);
}

/** The search string with `b` set to `encoded`, or removed when `encoded` is `null`. */
export function withBuildParam(search: string, encoded: string | null): string {
  const params = new URLSearchParams(search);
  if (encoded === null) {
    params.delete(BUILD_PARAM);
  } else {
    params.set(BUILD_PARAM, encoded);
  }
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** A link to `path` (relative to the base) that carries the build. */
export function hrefWithBuild(path: string, encoded: string | null): string {
  return `${path}${withBuildParam('', encoded)}`;
}

/** Loads the build from the URL, then keeps the URL following the store. */
export function connectBuildToUrl(store: StoreApi<BuildState>, url: UrlPort): BuildUrlSync {
  store.getState().loadEncoded(readBuildParam(url.search()));

  function reconcile(): void {
    const current = url.search();
    const encoded = encodeSelections(store.getState().selections);
    if (readBuildParam(current) !== encoded) {
      url.replaceSearch(withBuildParam(current, encoded));
    }
  }

  reconcile();
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.selections !== previous.selections) reconcile();
  });

  return { reconcile, disconnect: unsubscribe };
}
