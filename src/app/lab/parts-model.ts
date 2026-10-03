/**
 * What the lab's parts page shows (lab-spec §8, plan WP-E0 "every catalogue field reachable"):
 * the part or parts of the shown category, every spec as an indented row with its value and its
 * sources, the fields with no source of their own, the notes no row shows, and every price
 * record of the part. Pure: it reads the catalogue it is given.
 */
import { fieldLabel, nodeLabel } from '../../components/lab/field-labels';
import type {
  Market,
  Note,
  PriceGap,
  PriceObservation,
  SpecCategory,
  SpecRecord,
  SpecRecordByCategory,
} from '../../data/schema';
import { nullMeansNone } from './null-means-none';
import { UNSOURCED_FIELDS, conditionAsPublished, specLeaves, valueAt } from '../../engine/evidence';
import type { Catalogue, SpecEvidence } from '../../engine/types';
import type { StoreApi } from 'zustand/vanilla';
import type { RigBuild } from '../../state/build-codec';
import { toBuildParts } from '../../state/build-parts';
import type { BuildState } from '../../state/build-store';
import { PART_CATEGORIES, type PartCategory } from '../../state/categories';
import type { PickerCategory } from './lab-links';

export function findRecord<C extends SpecCategory>(
  catalogue: Catalogue,
  category: C,
  id: string,
): SpecRecordByCategory[C] | null {
  const records: readonly SpecRecordByCategory[C][] = catalogue.parts[category];
  return records.find((record) => record.id === id) ?? null;
}

/**
 * The part ids a build holds in one category: one part, each distinct drive in the order the
 * build holds them, or the fan model (its packs are the picker's business).
 */
export function pickedIds(build: RigBuild, category: PartCategory): string[] {
  const parts = toBuildParts(build);
  if (category === 'storage') return [...new Set(parts.storage)];
  const pick = parts[category];
  if (pick === null) return [];
  return [typeof pick === 'string' ? pick : pick.partId];
}

/** A part the page shows. */
export interface ShownPart {
  readonly category: SpecCategory;
  readonly record: SpecRecord;
}

/** The parts of the shown category: the build's picks, or the chip the link names. */
export function shownParts(
  catalogue: Catalogue,
  build: RigBuild,
  category: PickerCategory,
  chip: string | null,
): ShownPart[] {
  const ids = category === 'gpu-chip' ? (chip === null ? [] : [chip]) : pickedIds(build, category);
  return ids.flatMap((id) => {
    const record = findRecord(catalogue, category, id);
    return record === null ? [] : [{ category, record }];
  });
}

/** A pick in a link that names no catalogue part. */
export interface UnknownPick {
  readonly category: PickerCategory;
  readonly id: string;
}

/** Every pick, drive and chip in the link that the catalogue doesn't have, in picker order. */
export function unknownPicks(
  catalogue: Catalogue,
  build: RigBuild,
  chip: string | null,
): UnknownPick[] {
  const unknown = PART_CATEGORIES.flatMap((category) =>
    pickedIds(build, category)
      .filter((id) => findRecord(catalogue, category, id) === null)
      .map((id) => ({ category, id })),
  );
  return chip !== null && findRecord(catalogue, 'gpu-chip', chip) === null
    ? [...unknown, { category: 'gpu-chip', id: chip }]
    : unknown;
}

/**
 * Leaves out of the build every part the catalogue doesn't have (lab-spec §7: "so it was left
 * out"), through the store's own actions, so the link follows. A build the catalogue covers is
 * left untouched. GPU chips live in the link's `chip` parameter, which the page clears itself.
 */
export function dropUnknownPicks(store: StoreApi<BuildState>, catalogue: Catalogue): void {
  const state = store.getState();
  const build = state.selections;
  const categories = new Set(unknownPicks(catalogue, build, null).map((pick) => pick.category));
  for (const category of categories) {
    if (category === 'storage') {
      state.setDrives(
        (build.storage ?? []).filter((id) => findRecord(catalogue, 'storage', id) !== null),
      );
    } else if (category !== 'gpu-chip') {
      state.clear(category);
    }
  }
}

/** One row of the spec table: a group of specs, or one spec with its evidence. */
export type SpecRow =
  | {
      readonly kind: 'group';
      readonly path: string;
      /** How far the row is indented: 0 for a top-level field. */
      readonly depth: number;
      readonly label: string;
      /** The record's note on this group, or `null`. */
      readonly note: string | null;
    }
  | {
      readonly kind: 'spec';
      readonly path: string;
      readonly depth: number;
      readonly label: string;
      readonly evidence: SpecEvidence;
      /** The maker's own words for the value's condition, when the data has them. */
      readonly asPublished: string | null;
      /**
       * The note the row shows: a withheld value's reason (every note above it too), or the
       * record's note on this exact field. `null` when there is none.
       */
      readonly note: string | null;
    };

/** The record's notes on exactly this path, joined by a space, or `null`. */
function notesAt(record: SpecRecord, path: string): string | null {
  const texts = (record.notes ?? []).filter((note) => note.field === path).map((note) => note.text);
  return texts.length === 0 ? null : texts.join(' ');
}

/**
 * Every spec of a record as rows, in record order: each spec the engine reads (`specLeaves`), with
 * a group row before the first spec under each nested field, so nested specs are indented under
 * their parent (lab-spec §8).
 */
export function specRows(category: SpecCategory, record: SpecRecord): SpecRow[] {
  const rows: SpecRow[] = [];
  const groups = new Set<string>();
  for (const evidence of specLeaves(category, record, nullMeansNone(record))) {
    const segments = evidence.field.split('.');
    for (let depth = 0; depth < segments.length - 1; depth++) {
      const path = segments.slice(0, depth + 1).join('.');
      if (groups.has(path)) continue;
      groups.add(path);
      rows.push({
        kind: 'group',
        path,
        depth,
        label: nodeLabel(category, path),
        note: notesAt(record, path),
      });
    }
    rows.push({
      kind: 'spec',
      path: evidence.field,
      depth: segments.length - 1,
      label: nodeLabel(category, evidence.field),
      evidence,
      asPublished: conditionAsPublished(record, evidence.field),
      note:
        evidence.availability === 'not-published' ? evidence.note : notesAt(record, evidence.field),
    });
  }
  return rows;
}

/** A field with no source of its own (`UNSOURCED_FIELDS`), which the page shows apart. */
export interface UnsourcedField {
  readonly path: string;
  readonly label: string;
  readonly value: unknown;
}

export function unsourcedFields(category: SpecCategory, record: SpecRecord): UnsourcedField[] {
  return (UNSOURCED_FIELDS[category] ?? [])
    .filter((path) => path in record)
    .map((path) => ({
      path,
      label: fieldLabel(category, path),
      value: valueAt(record, path),
    }));
}

/** A note no spec row shows, with the name of the field it is about. */
export interface LooseNote {
  /** The field's label, or `null` for a note on the whole record. */
  readonly label: string | null;
  readonly text: string;
}

/**
 * The record's notes that no row of the spec table shows: notes on the whole record, and notes on
 * a field that is not a row (identity, or a field with no source of its own). Word for word.
 */
export function looseNotes(category: SpecCategory, record: SpecRecord): LooseNote[] {
  const paths = new Set(specRows(category, record).map((row) => row.path));
  return (record.notes ?? [])
    .filter((note: Note) => note.field === undefined || !paths.has(note.field))
    .map((note) => ({
      label: note.field === undefined ? null : fieldLabel(category, note.field),
      text: note.text,
    }));
}

/** One row of the prices table: an observed price, a gap, or a market with no record at all. */
export type PriceRow =
  | { readonly kind: 'price'; readonly market: Market; readonly observation: PriceObservation }
  | { readonly kind: 'gap'; readonly market: Market; readonly gap: PriceGap }
  | { readonly kind: 'none'; readonly market: Market };

const MARKETS: readonly Market[] = ['SA', 'US'];

/** A part's prices in Saudi Arabia, then the US: each observation, then each gap, as recorded. */
export function priceRows(catalogue: Catalogue, partId: string): PriceRow[] {
  return MARKETS.flatMap((market): PriceRow[] => {
    const file = catalogue.prices[market];
    const rows: PriceRow[] = [
      ...file.observations
        .filter((observation) => observation.partId === partId)
        .map((observation) => ({ kind: 'price' as const, market, observation })),
      ...file.gaps
        .filter((gap) => gap.partId === partId)
        .map((gap) => ({ kind: 'gap' as const, market, gap })),
    ];
    return rows.length > 0 ? rows : [{ kind: 'none', market }];
  });
}

const namesByCatalogue = new WeakMap<Catalogue, ReadonlyMap<string, string>>();

/** A publisher's name by its id, or the id itself when the catalogue has no such publisher. */
export function publisherName(catalogue: Catalogue, id: string): string {
  let names = namesByCatalogue.get(catalogue);
  if (names === undefined) {
    names = new Map(catalogue.publishers.map((publisher) => [publisher.id, publisher.name]));
    namesByCatalogue.set(catalogue, names);
  }
  return names.get(id) ?? id;
}
