/**
 * Versioned codec for the build in the share URL (`?b=…`), generic over category → part id.
 *
 * Format, version 1:
 *
 *     payload = "v1" *( "." entry )        e.g. v1.c_amd-ryzen-7-9800x3d.g_asus-tuf-rtx-5070-ti
 *     entry   = code "_" part-id
 *     code    = one lowercase letter, from the category table
 *     part-id = kebab-case: [a-z0-9]+ joined by single hyphens, at most 80 characters
 *
 * Every character is URL-safe and survives `URLSearchParams` unescaped, so links stay readable.
 * Encoding writes categories in table order, so each build has exactly one encoding.
 * Decoding accepts entries in any order and never throws: bad input decodes to an empty build
 * with an error, so a broken or foreign link can never crash the app.
 *
 * Uses `zod/mini`, the tree-shakable Zod 4 API, because this code ships in the initial bundle.
 * An equivalent schema measured 5.1 KB gzip with `zod/mini` and 20.6 KB with classic `zod`.
 */
import * as z from 'zod/mini';
import { PART_CATEGORIES, PART_CATEGORY_CODES, type PartCategory } from './categories';

export const CODEC_VERSION = 'v1';
export const MAX_PAYLOAD_LENGTH = 1024;
export const MAX_PART_ID_LENGTH = 80;
export const PART_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const partIdSchema = z
  .string()
  .check(z.minLength(1), z.maxLength(MAX_PART_ID_LENGTH), z.regex(PART_ID_PATTERN));

const payloadSchema = z.string().check(z.maxLength(MAX_PAYLOAD_LENGTH));

/** A build: at most one part id per category. */
export type Build<C extends string> = Readonly<Partial<Record<C, string>>>;

export type BuildDecodeErrorCode =
  | 'too-long'
  | 'malformed'
  | 'unsupported-version'
  | 'unknown-category'
  | 'duplicate-category'
  | 'invalid-part-id';

export interface BuildDecodeError {
  readonly code: BuildDecodeErrorCode;
  /** A plain-English sentence for logs and tests; the UI words its own message. */
  readonly detail: string;
}

export type BuildDecodeResult<C extends string> =
  | { readonly ok: true; readonly build: Build<C> }
  | { readonly ok: false; readonly build: Build<C>; readonly error: BuildDecodeError };

export interface BuildCodec<C extends string> {
  /**
   * Encodes a build. The empty build encodes to `"v1"`.
   * @throws {RangeError} when a part id is not kebab-case; the store only holds valid ids.
   */
  readonly encode: (build: Build<C>) => string;
  /** Decodes any value. Never throws. */
  readonly decode: (input: unknown) => BuildDecodeResult<C>;
  readonly isEmpty: (build: Build<C>) => boolean;
}

const ENTRY_PATTERN = /^([a-z])_(.*)$/;
const VERSION_PATTERN = /^v[0-9]+$/;

/**
 * Creates a codec for a category table.
 * @param categories the categories in encoding order
 * @param codes one distinct lowercase letter per category
 * @throws {Error} when a code is not a single lowercase letter or is used twice
 */
export function createBuildCodec<C extends string>(
  categories: readonly C[],
  codes: Readonly<Record<C, string>>,
): BuildCodec<C> {
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

  const empty: Build<C> = Object.freeze({});

  function fail(code: BuildDecodeErrorCode, detail: string): BuildDecodeResult<C> {
    return { ok: false, build: empty, error: { code, detail } };
  }

  function isEmpty(build: Build<C>): boolean {
    return categories.every((category) => build[category] === undefined);
  }

  function encode(build: Build<C>): string {
    const entries: string[] = [];
    for (const category of categories) {
      const partId = build[category];
      if (partId === undefined) continue;
      if (!partIdSchema.safeParse(partId).success) {
        throw new RangeError(`Cannot encode "${partId}" for ${category}: part ids are kebab-case.`);
      }
      entries.push(`${codes[category]}_${partId}`);
    }
    return [CODEC_VERSION, ...entries].join('.');
  }

  function decode(input: unknown): BuildDecodeResult<C> {
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

    const decoded: Partial<Record<C, string>> = {};
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
      if (decoded[category] !== undefined) {
        return fail('duplicate-category', `The build names a ${category} more than once.`);
      }
      if (!partIdSchema.safeParse(partId).success) {
        return fail('invalid-part-id', `"${partId}" is not a valid part id for ${category}.`);
      }
      decoded[category] = partId;
    }
    return { ok: true, build: Object.freeze(decoded) };
  }

  return { encode, decode, isEmpty };
}

/** The codec for Rig Lab builds. */
export const buildCodec: BuildCodec<PartCategory> = createBuildCodec(
  PART_CATEGORIES,
  PART_CATEGORY_CODES,
);

export type RigBuild = Build<PartCategory>;
