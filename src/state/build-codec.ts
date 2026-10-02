/**
 * Versioned codec for the build in the share URL (`?b=…`), generic over category → parts.
 *
 * Format, version 1:
 *
 *     payload = "v1" *( "." entry )        e.g. v1.c_amd-ryzen-7-9800x3d.g_asus-tuf-rtx-5070-ti
 *     entry   = code "_" part-id
 *     code    = one lowercase letter, from the category table
 *     part-id = kebab-case: [a-z0-9]+ joined by single hyphens, at most 80 characters
 *
 * Most categories hold one part, so their code appears once. A category the table gives a shape
 * repeats its code (`PART_CATEGORY_SHAPES`):
 * - a list holds parts in order, repeats allowed: `s_a.s_b.s_a` is drives a, b and a;
 * - packs hold one part, bought in packs: `f_x.f_x` is two packs of x, and `f_x.f_y` is an
 *   error, because a build holds one fan model.
 * Every link that decoded before lists and packs existed decodes to the same parts: one drive,
 * one pack. The canonical encodings are unchanged too.
 *
 * Every character is URL-safe and survives `URLSearchParams` unescaped, so links stay readable.
 * Encoding writes categories in table order, a list in its own order, so each build has exactly
 * one encoding. Decoding accepts entries in any order and never throws: bad input decodes to an
 * empty build with an error, so a broken or foreign link can never crash the app.
 *
 * Uses `zod/mini`, the tree-shakable Zod 4 API, because this code ships in the initial bundle.
 * An equivalent schema measured 5.1 KB gzip with `zod/mini` and 20.6 KB with classic `zod`.
 */
import * as z from 'zod/mini';
import {
  PART_CATEGORIES,
  PART_CATEGORY_CODES,
  PART_CATEGORY_SHAPES,
  type ListCategory,
  type PacksCategory,
  type PartCategory,
} from './categories';

export const CODEC_VERSION = 'v1';
export const MAX_PAYLOAD_LENGTH = 1024;
export const MAX_PART_ID_LENGTH = 80;
export const PART_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const partIdSchema = z
  .string()
  .check(z.minLength(1), z.maxLength(MAX_PART_ID_LENGTH), z.regex(PART_ID_PATTERN));

const payloadSchema = z.string().check(z.maxLength(MAX_PAYLOAD_LENGTH));

/** One part bought in retail packs: one case-fan model, and how many packs of it. */
export interface PackPick {
  readonly partId: string;
  /** A whole number, 1 or more. */
  readonly packs: number;
}

/**
 * The categories of a table that hold more than one part. Every other category holds one.
 * @typeParam L the list categories: parts in order, repeats allowed (drives)
 * @typeParam P the packs categories: one part, bought in packs (case fans)
 */
export interface CategoryShapes<L extends string, P extends string> {
  readonly list?: readonly L[];
  readonly packs?: readonly P[];
}

/**
 * A build: at most one pick per category, in that category's shape: a part id, a list of part
 * ids for a list category `L`, packs of one part for a packs category `P`.
 */
export type Build<C extends string, L extends C = never, P extends C = never> = {
  readonly [K in C]?: K extends L ? readonly string[] : K extends P ? PackPick : string;
};

export type BuildDecodeErrorCode =
  | 'too-long'
  | 'malformed'
  | 'unsupported-version'
  | 'unknown-category'
  | 'duplicate-category'
  | 'mixed-packs'
  | 'invalid-part-id';

export interface BuildDecodeError {
  readonly code: BuildDecodeErrorCode;
  /** A plain-English sentence for logs and tests; the UI words its own message. */
  readonly detail: string;
}

export type BuildDecodeResult<C extends string, L extends C = never, P extends C = never> =
  | { readonly ok: true; readonly build: Build<C, L, P> }
  | { readonly ok: false; readonly build: Build<C, L, P>; readonly error: BuildDecodeError };

export interface BuildCodec<C extends string, L extends C = never, P extends C = never> {
  /**
   * Encodes a build. The empty build encodes to `"v1"`.
   * @throws {RangeError} when a part id is not kebab-case or a pack count is not a whole number
   *   of 1 or more; the store only holds valid builds.
   */
  readonly encode: (build: Build<C, L, P>) => string;
  /** Decodes any value. Never throws. */
  readonly decode: (input: unknown) => BuildDecodeResult<C, L, P>;
  /** True when the build would encode no entry: nothing picked, or an empty list. */
  readonly isEmpty: (build: Build<C, L, P>) => boolean;
}

const ENTRY_PATTERN = /^([a-z])_(.*)$/;
const VERSION_PATTERN = /^v[0-9]+$/;

/**
 * Creates a codec for a category table.
 * @param categories the categories in encoding order
 * @param codes one distinct lowercase letter per category
 * @param shapes the categories that hold a list or packs; every other one holds one part
 * @throws {Error} when a code is not a single lowercase letter or is used twice, or a category
 *   is given both shapes
 */
export function createBuildCodec<C extends string, L extends C = never, P extends C = never>(
  categories: readonly C[],
  codes: Readonly<Record<C, string>>,
  shapes: CategoryShapes<L, P> = {},
): BuildCodec<C, L, P> {
  const categoryByCode = new Map<string, C>();
  for (const category of categories) {
    const code = codes[category];
    if (!/^[a-z]$/.test(code)) {
      throw new Error(
        `Category "${category}" needs a single lowercase letter code, got "${code}".`,
      );
    }
    const taken = categoryByCode.get(code);
    if (taken !== undefined) {
      throw new Error(`Categories "${taken}" and "${category}" share the code "${code}".`);
    }
    categoryByCode.set(code, category);
  }

  const listCategories = new Set<C>(shapes.list);
  const packsCategories = new Set<C>(shapes.packs);
  for (const category of listCategories) {
    if (packsCategories.has(category)) {
      throw new Error(`Category "${category}" cannot hold both a list and packs.`);
    }
  }
  const shapeOf = (category: C): 'one' | 'list' | 'packs' =>
    listCategories.has(category) ? 'list' : packsCategories.has(category) ? 'packs' : 'one';
  const empty: Build<C, L, P> = Object.freeze({});

  function fail(code: BuildDecodeErrorCode, detail: string): BuildDecodeResult<C, L, P> {
    return { ok: false, build: empty, error: { code, detail } };
  }

  /** A build seen as plain values, for the loops below; the types above say what each holds. */
  const picksOf = (build: Build<C, L, P>): Readonly<Partial<Record<C, unknown>>> => build;

  function isEmpty(build: Build<C, L, P>): boolean {
    const picks = picksOf(build);
    return categories.every((category) => {
      const pick = picks[category];
      return pick === undefined || (Array.isArray(pick) && pick.length === 0);
    });
  }

  function entryOf(category: C, partId: unknown): string {
    if (typeof partId !== 'string' || !partIdSchema.safeParse(partId).success) {
      throw new RangeError(
        `Cannot encode "${String(partId)}" for ${category}: part ids are kebab-case.`,
      );
    }
    return `${codes[category]}_${partId}`;
  }

  function encode(build: Build<C, L, P>): string {
    const picks = picksOf(build);
    const entries: string[] = [];
    for (const category of categories) {
      const pick = picks[category];
      if (pick === undefined) continue;
      const shape = shapeOf(category);
      if (shape === 'one') {
        entries.push(entryOf(category, pick));
      } else if (shape === 'list') {
        for (const partId of pick as readonly unknown[]) entries.push(entryOf(category, partId));
      } else {
        const { partId, packs } = pick as PackPick;
        if (!Number.isInteger(packs) || packs < 1) {
          throw new RangeError(
            `Cannot encode ${String(packs)} packs of ${category}: packs are a whole number, 1 or more.`,
          );
        }
        const entry = entryOf(category, partId);
        for (let pack = 0; pack < packs; pack++) entries.push(entry);
      }
    }
    return [CODEC_VERSION, ...entries].join('.');
  }

  function decode(input: unknown): BuildDecodeResult<C, L, P> {
    if (typeof input !== 'string') return fail('malformed', 'The build is not a string.');
    if (!payloadSchema.safeParse(input).success) {
      return fail(
        'too-long',
        `The build is ${String(input.length)} characters; the limit is ${String(MAX_PAYLOAD_LENGTH)}.`,
      );
    }

    const [version = '', ...tokens] = input.split('.');
    if (version !== CODEC_VERSION) {
      return VERSION_PATTERN.test(version)
        ? fail('unsupported-version', `Build format ${version} is not supported; expected v1.`)
        : fail('malformed', 'The build does not start with a format version such as v1.');
    }

    const singles: Partial<Record<C, string>> = {};
    const lists: Partial<Record<C, string[]>> = {};
    const packs: Partial<Record<C, { partId: string; packs: number }>> = {};
    for (const token of tokens) {
      const [, code, partId] = ENTRY_PATTERN.exec(token) ?? [];
      if (code === undefined || partId === undefined) {
        return fail(
          'malformed',
          `"${token}" is not a category code and part id such as c_part-id.`,
        );
      }
      const category = categoryByCode.get(code);
      if (category === undefined) {
        return fail('unknown-category', `"${code}" is not a known category code.`);
      }
      const shape = shapeOf(category);
      if (shape === 'one' && singles[category] !== undefined) {
        return fail('duplicate-category', `The build names a ${category} more than once.`);
      }
      if (!partIdSchema.safeParse(partId).success) {
        return fail('invalid-part-id', `"${partId}" is not a valid part id for ${category}.`);
      }
      if (shape === 'one') {
        singles[category] = partId;
      } else if (shape === 'list') {
        (lists[category] ??= []).push(partId);
      } else {
        const held = packs[category];
        if (held === undefined) {
          packs[category] = { partId, packs: 1 };
        } else if (held.partId === partId) {
          held.packs += 1;
        } else {
          return fail(
            'mixed-packs',
            `The build names two ${category} models, "${held.partId}" and "${partId}"; it holds one model, in packs.`,
          );
        }
      }
    }

    const decoded: Partial<Record<C, unknown>> = {};
    for (const category of categories) {
      const list = lists[category];
      const pack = packs[category];
      const single = singles[category];
      if (list !== undefined) decoded[category] = Object.freeze(list);
      else if (pack !== undefined) decoded[category] = Object.freeze(pack);
      else if (single !== undefined) decoded[category] = single;
    }
    return { ok: true, build: Object.freeze(decoded) as Build<C, L, P> };
  }

  return { encode, decode, isEmpty };
}

/** The codec for Rig Lab builds. */
export const buildCodec: BuildCodec<PartCategory, ListCategory, PacksCategory> = createBuildCodec(
  PART_CATEGORIES,
  PART_CATEGORY_CODES,
  PART_CATEGORY_SHAPES,
);

/** A Rig Lab build: one part per category, the drives as a list, the case fans in packs. */
export type RigBuild = Build<PartCategory, ListCategory, PacksCategory>;
