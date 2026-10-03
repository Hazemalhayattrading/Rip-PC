/**
 * Fetching the catalogue for the lab pages: one content-hashed JSON file, checked for the
 * catalogue's shape before the engine reads it. Pure but for the fetch it is given, so it is tested
 * without a browser; `load-catalogue.ts` binds it to the build's catalogue URL.
 */
import { isCatalogue } from '../../engine/catalogue';
import type { Catalogue } from '../../engine/types';

async function fetchCatalogue(url: string, fetchImpl: typeof fetch): Promise<Catalogue> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `The catalogue could not be loaded: the server answered ${String(response.status)}.`,
    );
  }
  const value: unknown = await response.json();
  if (!isCatalogue(value)) {
    throw new Error('The catalogue file is not in the format this page expects.');
  }
  return value;
}

/**
 * A loader that fetches the catalogue once per page load and gives every caller the same promise,
 * as React's `use()` needs. A failed load stays failed: `use()` must read the same rejected
 * promise to show the error, and the page's Reload button starts afresh (lab-spec §7).
 */
export function createCatalogueLoader(
  url: string,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): () => Promise<Catalogue> {
  let pending: Promise<Catalogue> | null = null;
  return () => {
    pending ??= fetchCatalogue(url, fetchImpl);
    return pending;
  };
}
