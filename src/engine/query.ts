/**
 * The dump's query mode, pure part (plan WP-E0, qa-lead's request): QA writes the builds it
 * wants answered to a JSON file, and the engine answers exactly those, so QA never reads the
 * engine's code. The shell is `npm run engine:dump -- --input <file> --out <file>`.
 *
 * The input, version 1: `{ "schemaVersion": 1, "builds": [{ "id": "…", "parts": { … } }] }`.
 * - `id`: a non-empty string, unique in the file.
 * - `parts`: any BuildParts keys, in BuildParts' own form. A part is an id of its own category in
 *   the catalogue, or `null`; `storage` is a list of drive ids; `case-fan` is
 *   `{ "partId", "packs" }` (a whole number, 1 or more) or `null`; `radiatorPosition` is a mount
 *   position or `null`. A missing key is not picked.
 * - Kept for later WPs, and reported as problems until they arrive: a build's `fps` (WP-E3),
 *   `creator` (WP-E4) and `bottleneck` (WP-E5), and the top-level `systems` (WP-E3).
 * The parser checks by hand, because the engine is Zod-free, and reports every problem at once,
 * each with its JSON path.
 */
import type { MountPosition, SpecCategory } from '../data/schema';
import { CATALOGUE_CATEGORIES } from './catalogue';
import { COMPAT_RULES, checkCompatibility, type CompatRule } from './compat/check';
import { compatReportProblems } from './invariants';
import { systemOf } from './system';
import type {
  BuildCategory,
  BuildParts,
  Catalogue,
  CompatReport,
  NeedsParts,
  PerfSystem,
} from './types';

/** One build to answer. */
export interface QueryBuild {
  readonly id: string;
  /** Every key present: what the input left out is not picked. */
  readonly parts: BuildParts;
}

/** A query input that passed `parseQueryInput`. */
export interface QueryInput {
  readonly schemaVersion: 1;
  readonly builds: readonly QueryBuild[];
}

export type ParsedQueryInput =
  | { readonly ok: true; readonly input: QueryInput }
  | {
      readonly ok: false;
      /** One sentence per problem, after its JSON path: `$.builds[0].parts.cpu: …`. */
      readonly problems: readonly string[];
    };

/** The engine's answers for one build. */
export interface QueryAnswer {
  readonly id: string;
  readonly parts: BuildParts;
  /** What the performance model would estimate, or the part it needs first (`systemOf`). */
  readonly system: PerfSystem | NeedsParts;
  readonly compatibility: CompatReport;
  /**
   * The contract invariants the answers break (`./invariants`): empty for sound answers, and
   * the shell exits 1 when any build has one.
   */
  readonly problems: readonly string[];
}

export interface QueryOutput {
  readonly schemaVersion: 1;
  readonly builds: readonly QueryAnswer[];
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** The BuildParts keys, typed so that a new key must be added here. */
const PART_KEYS: Readonly<Record<keyof BuildParts, null>> = {
  cpu: null,
  motherboard: null,
  ram: null,
  'gpu-card': null,
  storage: null,
  psu: null,
  cooler: null,
  case: null,
  'case-fan': null,
  radiatorPosition: null,
};

/** The schema's mount positions, typed so that a new position must be added here. */
const MOUNT_POSITIONS: Readonly<Record<MountPosition, null>> = {
  front: null,
  top: null,
  rear: null,
  bottom: null,
  side: null,
  'psu-shroud': null,
};

/** Each category's part in words, for the problems: "is not a CPU in the catalogue". */
const PART_NOUNS: Readonly<Record<SpecCategory, string>> = {
  cpu: 'CPU',
  motherboard: 'motherboard',
  ram: 'memory kit',
  'gpu-chip': 'GPU chip',
  'gpu-card': 'graphics card',
  storage: 'drive',
  psu: 'power supply',
  cooler: 'cooler',
  case: 'case',
  'case-fan': 'case fan',
};

/** Keys kept for later work packages, with the problem they give until then. */
const LATER_BUILD_KEYS: Readonly<Record<string, string>> = {
  fps: 'fps queries arrive with WP-E3.',
  creator: 'creator queries arrive with WP-E4.',
  bottleneck: 'bottleneck queries arrive with WP-E5.',
};

/** "a, b and c". */
const listed = (names: readonly string[]): string =>
  names.join(', ').replace(/, ([^,]*)$/, ' and $1');

const PARTS_TAKE = `Parts take ${listed(Object.keys(PART_KEYS))}.`;
const POSITIONS = `must be ${Object.keys(MOUNT_POSITIONS).join(', ')} or null.`;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A key's JSON path: `.key`, or `["key"]` for a key that isn't a plain name. */
const keyPath = (path: string, key: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

const indexPath = (path: string, index: number): string => `${path}[${String(index)}]`;

/**
 * Checks a query input against the format above and the catalogue.
 * @returns the input with every build's parts complete, or every problem found
 */
export function parseQueryInput(json: unknown, catalogue: Catalogue): ParsedQueryInput {
  if (!isRecord(json)) {
    return { ok: false, problems: ['$: the query input must be a JSON object.'] };
  }
  const problems: string[] = [];
  const problem = (path: string, message: string): void => {
    problems.push(`${path}: ${message}`);
  };
  const categoryById = new Map<string, SpecCategory>(
    CATALOGUE_CATEGORIES.flatMap((category) =>
      catalogue.parts[category].map((part) => [part.id, category] as const),
    ),
  );

  /** True when `id` is a catalogue part of `category`; otherwise reports why not. */
  const isPartOf = (id: string, category: BuildCategory, path: string): boolean => {
    const actual = categoryById.get(id);
    if (actual === category) return true;
    const instead = actual === undefined ? '' : `: it is a ${PART_NOUNS[actual]}`;
    problem(
      path,
      `${JSON.stringify(id)} is not a ${PART_NOUNS[category]} in the catalogue${instead}.`,
    );
    return false;
  };

  const onePart = (cell: unknown, category: BuildCategory, path: string): string | null => {
    if (cell === null) return null;
    if (typeof cell !== 'string') {
      problem(path, `must be a ${PART_NOUNS[category]} id or null.`);
      return null;
    }
    return isPartOf(cell, category, path) ? cell : null;
  };

  const drives = (cell: unknown, path: string): string[] => {
    if (!Array.isArray(cell)) {
      problem(path, 'must be a list of drive ids.');
      return [];
    }
    return (cell as readonly unknown[]).flatMap((drive, i) => {
      const at = indexPath(path, i);
      if (typeof drive !== 'string') {
        problem(at, 'must be a drive id.');
        return [];
      }
      return isPartOf(drive, 'storage', at) ? [drive] : [];
    });
  };

  const caseFan = (cell: unknown, path: string): BuildParts['case-fan'] => {
    if (cell === null) return null;
    if (!isRecord(cell)) {
      problem(path, 'must be an object with partId and packs, or null.');
      return null;
    }
    const { partId, packs } = cell;
    const idPath = keyPath(path, 'partId');
    let fan: string | null = null;
    if (typeof partId !== 'string') problem(idPath, 'must be a case fan id.');
    else if (isPartOf(partId, 'case-fan', idPath)) fan = partId;
    const count = typeof packs === 'number' && Number.isInteger(packs) && packs >= 1 ? packs : null;
    if (count === null) {
      problem(keyPath(path, 'packs'), 'must be a whole number of packs, 1 or more.');
    }
    for (const key of Object.keys(cell)) {
      if (key !== 'partId' && key !== 'packs') {
        problem(keyPath(path, key), 'unknown key. A case fan takes partId and packs.');
      }
    }
    return fan === null || count === null ? null : { partId: fan, packs: count };
  };

  const position = (cell: unknown, path: string): MountPosition | null => {
    if (typeof cell === 'string' && Object.hasOwn(MOUNT_POSITIONS, cell)) {
      return cell as MountPosition;
    }
    if (cell !== null) problem(path, POSITIONS);
    return null;
  };

  const partsOf = (value: unknown, path: string): BuildParts | null => {
    if (!isRecord(value)) {
      problem(path, 'must be an object.');
      return null;
    }
    const before = problems.length;
    const parts: Mutable<BuildParts> = {
      cpu: null,
      motherboard: null,
      ram: null,
      'gpu-card': null,
      storage: [],
      psu: null,
      cooler: null,
      case: null,
      'case-fan': null,
      radiatorPosition: null,
    };
    for (const [key, cell] of Object.entries(value)) {
      const at = keyPath(path, key);
      switch (key) {
        case 'cpu':
        case 'motherboard':
        case 'ram':
        case 'gpu-card':
        case 'psu':
        case 'cooler':
        case 'case':
          parts[key] = onePart(cell, key, at);
          break;
        case 'storage':
          parts.storage = drives(cell, at);
          break;
        case 'case-fan':
          parts['case-fan'] = caseFan(cell, at);
          break;
        case 'radiatorPosition':
          parts.radiatorPosition = position(cell, at);
          break;
        default:
          problem(at, `unknown key. ${PARTS_TAKE}`);
      }
    }
    return problems.length === before ? parts : null;
  };

  if (json.schemaVersion !== 1) problem('$.schemaVersion', 'must be 1.');
  const builds: QueryBuild[] = [];
  if (Array.isArray(json.builds)) {
    const ids = new Set<string>();
    (json.builds as readonly unknown[]).forEach((build, i) => {
      const at = indexPath('$.builds', i);
      if (!isRecord(build)) {
        problem(at, 'must be an object with an id and parts.');
        return;
      }
      const id = typeof build.id === 'string' && build.id.trim() !== '' ? build.id : null;
      if (id === null) problem(keyPath(at, 'id'), 'must be a non-empty string.');
      else if (ids.has(id)) {
        problem(keyPath(at, 'id'), `${JSON.stringify(id)} is used by another build.`);
      }
      if (id !== null) ids.add(id);
      const parts = partsOf(build.parts, keyPath(at, 'parts'));
      for (const key of Object.keys(build)) {
        if (key === 'id' || key === 'parts') continue;
        problem(
          keyPath(at, key),
          LATER_BUILD_KEYS[key] ?? 'unknown key. A build takes id and parts.',
        );
      }
      if (id !== null && parts !== null) builds.push({ id, parts });
    });
  } else {
    problem('$.builds', 'must be a list of builds.');
  }
  for (const key of Object.keys(json)) {
    if (key === 'schemaVersion' || key === 'builds') continue;
    problem(
      keyPath('$', key),
      key === 'systems'
        ? 'test systems arrive with WP-E3.'
        : 'unknown key. The input takes schemaVersion and builds.',
    );
  }
  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, input: { schemaVersion: 1, builds } };
}

/**
 * The engine's answers for every build of a parsed input: its system and its compatibility,
 * with the contract invariants each answer breaks.
 * @param rules the compatibility rules to run; defaults to every implemented rule
 */
export function runQueries(
  input: QueryInput,
  catalogue: Catalogue,
  rules: readonly CompatRule[] = COMPAT_RULES,
): QueryOutput {
  const ruleIds = rules.map((rule) => rule.spec.id);
  return {
    schemaVersion: 1,
    builds: input.builds.map(({ id, parts }) => {
      const compatibility = checkCompatibility(parts, catalogue, rules);
      return {
        id,
        parts,
        system: systemOf(parts, catalogue),
        compatibility,
        // compatReportProblems checks every rule result too, and the report's power range once
        // WP-E2 fills `power`. Each later WP adds the checks of its own answers here:
        // - WP-E2: psuRangeProblems for the build's power estimate, if the output carries one;
        // - WP-E3: fpsEstimateProblems for each fps query;
        // - WP-E5: rebalancedBuildProblems for each rebalanced build.
        problems: compatReportProblems(compatibility, ruleIds),
      };
    }),
  };
}
