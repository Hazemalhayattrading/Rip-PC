/**
 * Loads the catalogue for the lab pages. Only lab code imports this module, so product pages
 * never download the catalogue (plan WP-E0).
 */
import catalogueUrl from 'virtual:rig-lab/catalogue-url';
import { isCatalogue } from '../../engine/catalogue';
import type { Catalogue } from '../../engine/types';

let pending: Promise<Catalogue> | null = null;

/**
 * The catalogue, fetched once per page load and shared by every lab page. The same promise
 * comes back on every call, as React's `use()` needs. A failed load is not cached, so the next
 * call tries again.
 */
export function loadCatalogue(): Promise<Catalogue> {
  pending ??= fetchCatalogue().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function fetchCatalogue(): Promise<Catalogue> {
  const response = await fetch(catalogueUrl);
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
