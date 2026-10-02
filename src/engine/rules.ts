/**
 * The compatibility rules' metadata (`RuleSpec`): what each rule checks, the statuses it can
 * return and the parts it reads. QA's trace, the engine dump and the lab read it from here, and
 * `ruleSpec` is the one lookup they all use. WP-E1 adds each rule's evaluate function.
 *
 * - `checks` is plan §3's "Checks" column, word for word.
 * - `outcomes` is test plan §9.2's "Results" column, best first. `warn` is listed wherever the
 *   rule can't verify a build: it reads a field the maker may leave unpublished (null with a
 *   note, or a list that can be empty), or §9.2 marks it "+ unknown". `bios-version` never
 *   blocks (Hazem, plan §6).
 * - `numeric` marks a numeric limit (mm, W, MT/s, slots, connectors), which needs boundary tests.
 * - `reads` lists the categories in build order. The dump enumerates every catalogue combination
 *   of them, so a rule reads only what changes its answer. An `optional` category also gets
 *   "not picked": no graphics card for `display-output`, no cooler where a cooler moves a case
 *   limit. Titles are drafts for design-lead's review (WP-DS2).
 */
import { RULE_IDS, type BuildCategory, type RuleId, type RuleSpec } from './types';

type Read = RuleSpec['reads'][number];

/** A category the rule needs: it doesn't run until the part is picked. */
const needs = (category: BuildCategory): Read => ({ category, optional: false });

/** A category that changes the rule's answer when picked, and is checked "not picked" too. */
const mayRead = (category: BuildCategory): Read => ({ category, optional: true });

/** Every rule's metadata, by id. Typed so that each id in `RULE_IDS` has exactly one entry. */
const SPECS: Readonly<Record<RuleId, Omit<RuleSpec, 'id'>>> = {
  'cpu-socket': {
    title: 'CPU socket',
    checks: 'The CPU socket matches the board',
    outcomes: ['ok', 'block'],
    numeric: false,
    reads: [needs('cpu'), needs('motherboard')],
  },
  'cpu-chipset': {
    title: 'CPU support list',
    checks: "The board's CPU support list includes the CPU",
    outcomes: ['ok', 'block'],
    numeric: false,
    reads: [needs('cpu'), needs('motherboard')],
  },
  'bios-version': {
    title: 'BIOS version',
    checks: 'Whether the CPU needs a newer BIOS, and whether the board has BIOS FlashBack',
    outcomes: ['ok', 'warn'],
    numeric: false,
    reads: [needs('cpu'), needs('motherboard')],
  },
  'ram-type': {
    title: 'Memory type',
    checks: 'DDR4 or DDR5 matches the board',
    outcomes: ['ok', 'block'],
    numeric: false,
    reads: [needs('motherboard'), needs('ram')],
  },
  'ram-slots': {
    title: 'Memory slots',
    checks: 'The modules fit the DIMM slots',
    outcomes: ['ok', 'block'],
    numeric: true,
    reads: [needs('motherboard'), needs('ram')],
  },
  'ram-speed': {
    title: 'Memory speed',
    checks: "The kit's speed against the board's and the CPU's official speeds",
    outcomes: ['ok', 'warn'],
    numeric: true,
    reads: [needs('cpu'), needs('motherboard'), needs('ram')],
  },
  'gpu-length': {
    title: 'Graphics card length',
    checks: 'Card length against the case, per layout',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // A radiator shortens the limit: the Fractal North's 300 mm with a front 360, the Fractal
    // Terra's 200 mm with its side 120 mm radiator.
    reads: [needs('gpu-card'), mayRead('cooler'), needs('case')],
  },
  'gpu-thickness': {
    title: 'Graphics card thickness',
    checks: "Card thickness against slot spacing and the case's slots",
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // The board's slot positions, and the Fractal Terra's spine, which trades card thickness for
    // cooler height.
    reads: [needs('motherboard'), needs('gpu-card'), mayRead('cooler'), needs('case')],
  },
  'cooler-height': {
    title: 'Cooler height',
    checks: 'Air-cooler height against the case, per layout',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // The Fractal Terra's spine: the thicker the card, the lower the cooler limit.
    reads: [mayRead('gpu-card'), needs('cooler'), needs('case')],
  },
  'ram-cooler-clearance': {
    title: 'Memory height under the cooler',
    checks: 'RAM height under an air cooler',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    reads: [needs('ram'), needs('cooler')],
  },
  'radiator-fit': {
    title: 'Radiator fit',
    checks: 'Radiator size and position against the case',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // The Fractal North: a PSU longer than 215 mm needs the drive tray at A, which limits a
    // front radiator to 280 mm.
    reads: [mayRead('psu'), needs('cooler'), needs('case')],
  },
  'psu-form-factor': {
    title: 'Power supply form factor',
    checks: 'The PSU form factor against the case',
    outcomes: ['ok', 'warn', 'block'],
    numeric: false,
    reads: [needs('psu'), needs('case')],
  },
  'psu-length': {
    title: 'Power supply length',
    checks: 'PSU length against the case, per layout',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // The Fractal North: a front 360 radiator needs the drive tray away from A, which shortens
    // the PSU limit.
    reads: [needs('psu'), mayRead('cooler'), needs('case')],
  },
  'psu-wattage': {
    title: 'Power supply wattage',
    checks: 'Wattage against the estimated load, with transient headroom',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // A first cut until WP-E2 adds the rest of the load. A build without a card still needs a PSU.
    reads: [needs('cpu'), mayRead('gpu-card'), needs('psu')],
  },
  'gpu-power-connector': {
    title: 'Graphics card power connectors',
    checks: 'A native 12V-2x6 where needed, and enough 8-pin cables',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    reads: [needs('gpu-card'), needs('psu')],
  },
  'm2-lanes': {
    title: 'M.2 slots and lane sharing',
    checks: 'M.2 count, and lane-sharing side effects',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    // The dump checks one drive per combination; multi-drive combinations come in WP-E1.
    reads: [needs('motherboard'), needs('storage')],
  },
  'board-form-factor': {
    title: 'Motherboard form factor',
    checks: "The board's form factor against the case",
    outcomes: ['ok', 'block'],
    numeric: false,
    reads: [needs('motherboard'), needs('case')],
  },
  'usb-c-header': {
    title: 'Front USB-C header',
    checks: 'A front USB-C port needs a header on the board',
    outcomes: ['ok', 'warn'],
    numeric: false,
    reads: [needs('motherboard'), needs('case')],
  },
  'cooler-socket': {
    title: 'Cooler mounting',
    checks: "The cooler's mounting kit fits the CPU socket",
    outcomes: ['ok', 'warn', 'block'],
    numeric: false,
    reads: [needs('cpu'), needs('cooler')],
  },
  'display-output': {
    title: 'Display output',
    checks: 'A build with no graphics card needs a CPU with integrated graphics',
    outcomes: ['ok', 'block'],
    numeric: false,
    reads: [needs('cpu'), mayRead('gpu-card')],
  },
};

/** One spec per rule, in `RULE_IDS` order: the order the lab lists them. */
export const RULE_SPECS: readonly RuleSpec[] = RULE_IDS.map((id) => ({ id, ...SPECS[id] }));

const SPEC_BY_ID: ReadonlyMap<string, RuleSpec> = new Map(RULE_SPECS.map((s) => [s.id, s]));

/**
 * The spec of one rule.
 * @throws {RangeError} when `id` is not a rule id, for example one read from a URL
 */
export function ruleSpec(id: RuleId): RuleSpec {
  const spec = SPEC_BY_ID.get(id);
  if (spec === undefined) throw new RangeError(`No compatibility rule has the id "${id}".`);
  return spec;
}
