/**
 * The part categories a build holds one selection for, in builder order.
 *
 * The ids are data-lead's spec category ids (`SPEC_CATEGORIES` in `src/data/schema/files.ts`),
 * except `gpu-chip`: a build picks a GPU card, and the card names its chip (plan §4.2).
 *
 * Each category has a one-letter code used in share URLs (`?b=v1.c_<cpu-id>.m_<board-id>`).
 * The codes are part of the v1 URL format, and shared links depend on them: never change or
 * reuse a code. A new category gets a new letter; changing an existing one needs a new codec
 * version.
 */
export const PART_CATEGORIES = [
  'cpu',
  'motherboard',
  'ram',
  /** A GPU card (retail SKU). The card references its GPU chip (plan §4.2). */
  'gpu-card',
  'storage',
  'psu',
  'cooler',
  'case',
  'case-fan',
] as const;

export type PartCategory = (typeof PART_CATEGORIES)[number];

export const PART_CATEGORY_CODES: Readonly<Record<PartCategory, string>> = {
  cpu: 'c',
  motherboard: 'm',
  ram: 'r',
  'gpu-card': 'g',
  storage: 's',
  psu: 'p',
  cooler: 'k',
  case: 'x',
  'case-fan': 'f',
};

/**
 * The categories that hold more than one part, as the engine's `BuildParts` does. In a link,
 * their code repeats:
 * - `storage` is a list of drives, in the order the buyer added them, and a drive may repeat:
 *   `s_a.s_b.s_a` is drives a, b and a;
 * - `case-fan` is one fan model, in retail packs: `f_x.f_x` is two packs of x.
 * Every other category holds one part, so its code appears at most once.
 */
export const PART_CATEGORY_SHAPES = { list: ['storage'], packs: ['case-fan'] } as const;

/** The category that holds a list of parts: the drives. */
export type ListCategory = (typeof PART_CATEGORY_SHAPES.list)[number];
/** The category that holds one part in packs: the case fans. */
export type PacksCategory = (typeof PART_CATEGORY_SHAPES.packs)[number];
/** A category that holds one part. */
export type SinglePartCategory = Exclude<PartCategory, ListCategory | PacksCategory>;
