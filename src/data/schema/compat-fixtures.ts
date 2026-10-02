import * as z from 'zod';
import { FieldPath, Id, Notes, Sources } from './common';

/**
 * The 20 compatibility rule IDs (plan §3: test plan §9.2's 18, plus `cooler-socket` and
 * `display-output`). The engine's `COMPAT_RULES` uses the same IDs.
 */
export const COMPAT_RULE_IDS = [
  'cpu-socket',
  'cpu-chipset',
  'bios-version',
  'ram-type',
  'ram-slots',
  'ram-speed',
  'gpu-length',
  'gpu-thickness',
  'cooler-height',
  'ram-cooler-clearance',
  'radiator-fit',
  'psu-form-factor',
  'psu-length',
  'psu-wattage',
  'gpu-power-connector',
  'm2-lanes',
  'board-form-factor',
  'usb-c-header',
  'cooler-socket',
  'display-output',
] as const;
export const CompatRuleId = z.enum(COMPAT_RULE_IDS);
export type CompatRuleId = z.infer<typeof CompatRuleId>;

/**
 * What a rule gives for a build. `cant-verify` is the engine's warn "can't verify: … not published",
 * kept apart here because every rule that reads a value a maker may leave unpublished needs one.
 */
export const FIXTURE_OUTCOMES = ['ok', 'warn', 'block', 'cant-verify'] as const;
export const FixtureOutcome = z.enum(FIXTURE_OUTCOMES);
export type FixtureOutcome = z.infer<typeof FixtureOutcome>;

/**
 * The build a fixture tests, as catalogue part IDs by category: only the parts the rule reads.
 * `"gpu-card": null` is a build with no graphics card.
 */
export const FixtureParts = z.strictObject({
  cpu: Id.optional(),
  motherboard: Id.optional(),
  ram: Id.optional(),
  'gpu-card': Id.nullable().optional(),
  storage: z.array(Id).min(1).optional(),
  psu: Id.optional(),
  cooler: Id.optional(),
  case: Id.optional(),
});
export type FixtureParts = z.infer<typeof FixtureParts>;

/**
 * A spec value the outcome rests on: a part of the build, a dot path in its record (array indices as
 * numbers) and the value there. The validator checks the value against the catalogue, so a fixture
 * can't drift from the data, and that a maker source backs it (a null needs the record's note).
 */
export const FixtureFact = z.strictObject({
  part: Id,
  path: FieldPath,
  value: z.json(),
});
export type FixtureFact = z.infer<typeof FixtureFact>;

export const Fixture = z.strictObject({
  /** Unique in the file, e.g. `gpu-length-block-north-front-360`. */
  id: Id,
  outcome: FixtureOutcome,
  parts: FixtureParts,
  /** Why the rule gives this outcome: one sentence, with the numbers and their units. */
  reason: z.string().min(1),
  facts: z.array(FixtureFact).min(1),
  /** Sources for a fact that isn't a part field. Part fields cite their own record's sources. */
  sources: Sources.optional(),
  notes: Notes,
});
export type Fixture = z.infer<typeof Fixture>;

/**
 * An outcome with no fixture, and why:
 * - `not-applicable`: the rule can't give it (for example, the fields it reads can't be null);
 * - `no-real-product`: no real, currently sold product gives it, after 2 tries (rule 11);
 * - `pending`: the data comes in a later batch, which the reason names.
 * The Director rules on each one.
 */
export const FixtureGap = z.strictObject({
  outcome: FixtureOutcome,
  kind: z.enum(['not-applicable', 'no-real-product', 'pending']),
  reason: z.string().min(1),
});
export type FixtureGap = z.infer<typeof FixtureGap>;

/** One rule: a fixture or a gap for each outcome, never both. */
export const RuleFixtures = z.strictObject({
  rule: CompatRuleId,
  fixtures: z.array(Fixture),
  gaps: z.array(FixtureGap),
});
export type RuleFixtures = z.infer<typeof RuleFixtures>;

/** `data/compat-fixtures.json`: real catalogue builds for every rule's tests (WP-D1 item 1). */
export const CompatFixturesFile = z.strictObject({
  schemaVersion: z.literal(1),
  rules: z.array(RuleFixtures),
});
export type CompatFixturesFile = z.infer<typeof CompatFixturesFile>;
