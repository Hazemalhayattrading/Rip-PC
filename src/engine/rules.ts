/**
 * The compatibility rules' metadata (`RuleSpec`): what each rule checks, the statuses it can
 * return and the parts it reads. QA's trace, the engine dump and the lab read it from here, and
 * `ruleSpec` is the one lookup they all use. WP-E1 adds each rule's evaluate function.
 *
 * - `title` is copy guide §6's rule name; `checks` is plan §3's "Checks" column, word for word.
 * - `outcomes`, `numeric` and `unknownData` are QA's record, `tests/audit/compat-rules.json`
 *   (test plan v4 §9.2). `outcomes` lists the statuses for published data: the can't-verify
 *   `warn` is `unknownData`. `bios-version` never blocks (Hazem, plan §6).
 * - `reads` lists the categories in build order, every category that can change the result
 *   (QA's C5). The five layout-dependent rules read every input of the layout search: the case,
 *   the cooler (a radiator moves limits), the graphics card (the Fractal Terra's spine trades
 *   card thickness for cooler height) and the power supply (the Fractal North's drive trays).
 *   Memory joins them when WP-D1 adds the North's memory clearance under a top radiator.
 */
import { RULE_IDS, type BuildCategory, type RuleId, type RuleSpec } from './types';

type Read = RuleSpec['reads'][number];

/** A category the rule needs: it doesn't run until the part is picked. */
const needs = (category: BuildCategory): Read => ({ category, optional: false });

/** A category that changes the rule's answer when picked, and is checked "not picked" too. */
const mayRead = (category: BuildCategory): Read => ({ category, optional: true });

const PRODUCT = { kind: 'product' } as const;

/**
 * The most drives `m2-lanes` puts in one build: one more than the most M.2 slots of any
 * catalogue board (4 today), so every board also meets a build with too many drives.
 */
export const MAX_DUMP_DRIVES = 5;

/** Every rule's metadata, by id. Typed so that each id in `RULE_IDS` has exactly one entry. */
const SPECS: Readonly<Record<RuleId, Omit<RuleSpec, 'id'>>> = {
  'cpu-socket': {
    title: 'CPU socket',
    checks: 'The CPU socket matches the board',
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('cpu'), needs('motherboard')],
    sweep: PRODUCT,
  },
  'cpu-chipset': {
    title: 'CPU support list',
    checks: "The board's CPU support list includes the CPU",
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('cpu'), needs('motherboard')],
    sweep: PRODUCT,
  },
  'bios-version': {
    title: 'BIOS version',
    checks: 'Whether the CPU needs a newer BIOS, and whether the board has BIOS FlashBack',
    outcomes: ['ok', 'warn'],
    numeric: false,
    unknownData: true,
    layoutDependent: false,
    reads: [needs('cpu'), needs('motherboard')],
    sweep: PRODUCT,
  },
  'ram-type': {
    title: 'Memory type',
    checks: 'DDR4 or DDR5 matches the board',
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('motherboard'), needs('ram')],
    sweep: PRODUCT,
  },
  'ram-slots': {
    title: 'Memory slots',
    checks: 'The modules fit the DIMM slots',
    outcomes: ['ok', 'block'],
    numeric: true,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('motherboard'), needs('ram')],
    sweep: PRODUCT,
  },
  'ram-speed': {
    title: 'Memory speed',
    checks: "The kit's speed against the board's and the CPU's official speeds",
    outcomes: ['ok', 'warn'],
    numeric: true,
    unknownData: true,
    layoutDependent: false,
    reads: [needs('cpu'), needs('motherboard'), needs('ram')],
    sweep: PRODUCT,
  },
  'gpu-length': {
    title: 'Graphics card length',
    checks: 'Card length against the case, per layout',
    outcomes: ['ok', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: true,
    reads: [needs('gpu-card'), mayRead('psu'), mayRead('cooler'), needs('case')],
    sweep: PRODUCT,
  },
  'gpu-thickness': {
    title: 'Graphics card thickness',
    checks: "Card thickness against slot spacing and the case's slots",
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: true,
    reads: [
      needs('motherboard'),
      needs('gpu-card'),
      mayRead('psu'),
      mayRead('cooler'),
      needs('case'),
    ],
    sweep: PRODUCT,
  },
  'cooler-height': {
    title: 'Cooler height',
    checks: 'Air-cooler height against the case, per layout',
    outcomes: ['ok', 'block'],
    numeric: true,
    unknownData: false,
    layoutDependent: true,
    reads: [mayRead('gpu-card'), mayRead('psu'), needs('cooler'), needs('case')],
    sweep: PRODUCT,
  },
  'ram-cooler-clearance': {
    title: 'Memory under the cooler',
    checks: 'RAM height under an air cooler',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: false,
    reads: [needs('ram'), needs('cooler')],
    sweep: PRODUCT,
  },
  'radiator-fit': {
    title: 'Radiator fit',
    checks: 'Radiator size and position against the case',
    outcomes: ['ok', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: true,
    reads: [mayRead('gpu-card'), mayRead('psu'), needs('cooler'), needs('case')],
    sweep: PRODUCT,
  },
  'psu-form-factor': {
    title: 'Power supply form factor',
    checks: 'The PSU form factor against the case',
    outcomes: ['ok', 'warn', 'block'],
    numeric: false,
    unknownData: true,
    layoutDependent: false,
    reads: [needs('psu'), needs('case')],
    sweep: PRODUCT,
  },
  'psu-length': {
    title: 'Power supply length',
    checks: 'PSU length against the case, per layout',
    outcomes: ['ok', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: true,
    reads: [mayRead('gpu-card'), needs('psu'), mayRead('cooler'), needs('case')],
    sweep: PRODUCT,
  },
  'psu-wattage': {
    title: 'Power supply wattage',
    checks: 'Wattage against the estimated load, with transient headroom',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: false,
    // Everything that draws power. A build without a graphics card still needs a power supply.
    reads: [
      needs('cpu'),
      mayRead('motherboard'),
      mayRead('ram'),
      mayRead('gpu-card'),
      mayRead('storage'),
      needs('psu'),
      mayRead('cooler'),
      mayRead('case'),
      mayRead('case-fan'),
    ],
    sweep: { kind: 'power-extremes' },
  },
  'gpu-power-connector': {
    title: 'Graphics card power cables',
    checks: 'A native 12V-2x6 where needed, and enough 8-pin cables',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    unknownData: true,
    layoutDependent: false,
    reads: [needs('gpu-card'), needs('psu')],
    sweep: PRODUCT,
  },
  'm2-lanes': {
    title: 'M.2 slots and shared lanes',
    checks: 'M.2 count, and lane-sharing side effects',
    outcomes: ['ok', 'warn', 'block'],
    numeric: true,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('motherboard'), needs('storage')],
    sweep: { kind: 'drive-lists', maxDrives: MAX_DUMP_DRIVES },
  },
  'board-form-factor': {
    title: 'Motherboard form factor',
    checks: "The board's form factor against the case",
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('motherboard'), needs('case')],
    sweep: PRODUCT,
  },
  'usb-c-header': {
    title: 'Front USB-C port',
    checks: 'A front USB-C port needs a header on the board',
    outcomes: ['ok', 'warn'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('motherboard'), needs('case')],
    sweep: PRODUCT,
  },
  'cooler-socket': {
    title: 'Cooler mounting',
    checks: "The cooler's mounting kit fits the CPU socket",
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('cpu'), needs('cooler')],
    sweep: PRODUCT,
  },
  'display-output': {
    title: 'Display output',
    checks: 'A build with no graphics card needs a CPU with integrated graphics',
    outcomes: ['ok', 'block'],
    numeric: false,
    unknownData: false,
    layoutDependent: false,
    reads: [needs('cpu'), mayRead('gpu-card')],
    sweep: PRODUCT,
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
