import type { UrlPort } from '../state/url-sync';

/** The URL port for the real browser: reads `location`, writes with `history.replaceState`. */
export const browserUrl: UrlPort = {
  search: () => window.location.search,
  replaceSearch: (search) => {
    const url = new URL(window.location.href);
    url.search = search;
    // Keep whatever state the router stored on this history entry.
    const state: unknown = window.history.state;
    window.history.replaceState(state, '', url);
  },
};
