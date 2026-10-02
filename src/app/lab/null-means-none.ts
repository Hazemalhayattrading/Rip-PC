/**
 * A record's "null means none" paths, for `specLeaves(category, record, noneOnNull)`: where a
 * `null` value means the part has none (no integrated graphics, no Wi-Fi), not that the maker
 * doesn't publish it.
 *
 * It is data-lead's Zod-free list (`src/data/semantics.ts`), the same function the validator
 * uses, so the lab and the validator can never disagree. This is the lab's only reference to it.
 */
export { nullMeansNone } from '../../data/semantics';
