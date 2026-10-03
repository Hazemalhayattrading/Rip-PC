/**
 * Loads the catalogue for the lab pages. Only lab code imports this module, so product pages
 * never download the catalogue (plan WP-E0).
 */
import catalogueUrl from 'virtual:rig-lab/catalogue-url';
import { createCatalogueLoader } from './catalogue-loader';

/**
 * The catalogue, fetched once per page load and shared by every lab page. The same promise comes
 * back on every call, as React's `use()` needs, a failed one included.
 */
export const loadCatalogue = createCatalogueLoader(catalogueUrl);
