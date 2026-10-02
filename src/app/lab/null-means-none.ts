/**
 * A record's "null means none" paths, for `specLeaves(category, record, noneOnNull)`: where a
 * `null` value means the part has none (no integrated graphics, no Wi-Fi), not that the maker
 * doesn't publish it.
 *
 * TODO(build-lead, before the WP-E0 hand-off): wire this to data-lead's Zod-free
 * `nullMeansNone(record)` export. Until then it returns no paths, so every null spec reads as
 * "Not published". The validator's list is deliberately not copied here: one list, data-lead's.
 * This is the lab's only reference to it, so the wiring is one line.
 */
import type { SpecRecord } from '../../data/schema';

const NO_PATHS: readonly string[] = [];

export const nullMeansNone: (record: SpecRecord) => readonly string[] = () => NO_PATHS;
