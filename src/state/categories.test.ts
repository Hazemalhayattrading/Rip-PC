import { describe, expect, expectTypeOf, it } from 'vitest';
// Test-only import: the data schemas use classic zod, which never ships in the initial bundle.
import { PRICED_CATEGORIES } from '../data/schema/files';
import { PART_CATEGORIES, type PartCategory } from './categories';

describe('the build categories', () => {
  // A build selects one part per category a visitor can buy. gpu-chip is never one: the card
  // names its chip (plan §4.2). The order is the codec's own (canonical share URLs), so only
  // the members must match data-lead's.
  it("are data-lead's buyable categories", () => {
    expect([...PART_CATEGORIES].sort()).toEqual([...PRICED_CATEGORIES].sort());
  });

  it("have the same type as data-lead's buyable categories", () => {
    expectTypeOf<PartCategory>().toEqualTypeOf<(typeof PRICED_CATEGORIES)[number]>();
  });
});
