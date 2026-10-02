/**
 * Links into the lab's parts page. The build travels in `b`, through the existing codec; a GPU
 * chip, which a build never picks (it picks a card), travels in the lab-only `chip` parameter.
 */
import type { SpecCategory } from '../../data/schema';
import { BUILD_PARAM } from '../../state/url-sync';
import { pathOf } from '../routes';

/** The lab-only query parameter that shows one GPU chip on the parts page. */
export const CHIP_PARAM = 'chip';

/** The id of a part's section on the parts page, for links within the page (`#part-…`). */
export function partAnchorId(category: SpecCategory, id: string): string {
  return `part-${category}-${id}`;
}

/** The parts page with a build (`?b=…`) and, when given, a GPU chip (`&chip=…`). */
export function labPartsHref(encodedBuild: string | null, chip: string | null = null): string {
  const params = new URLSearchParams();
  if (encodedBuild !== null) params.set(BUILD_PARAM, encodedBuild);
  if (chip !== null) params.set(CHIP_PARAM, chip);
  const query = params.toString();
  const path = pathOf({ name: 'lab', page: 'parts' });
  return query === '' ? path : `${path}?${query}`;
}
