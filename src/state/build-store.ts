/**
 * The build: one selected part id per category, plus the result of reading it from a link.
 *
 * A vanilla Zustand store, so it has no React dependency and is unit-tested in Node.
 * React components read it through `useBuild` in `src/app/build-hooks.ts`.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import { buildCodec, partIdSchema, type BuildDecodeError, type RigBuild } from './build-codec';
import type { PartCategory } from './categories';

/** Actions are plain functions (no `this`), so components can select and pass them around. */
export interface BuildState {
  readonly selections: RigBuild;
  /** Why the build in the page's link could not be read, or `null` when it could. */
  readonly decodeError: BuildDecodeError | null;
  /**
   * Selects a part for a category, replacing any earlier pick.
   * @throws {RangeError} when `partId` is not kebab-case.
   */
  readonly select: (category: PartCategory, partId: string) => void;
  readonly clear: (category: PartCategory) => void;
  /** Empties the build and forgets any link error. */
  readonly reset: () => void;
  /**
   * Replaces the build with the one encoded in a link's `b` parameter. `null` or an empty
   * string means the link has no build. A value that cannot be decoded gives the empty build
   * and sets `decodeError`.
   */
  readonly loadEncoded: (encoded: string | null) => void;
}

const EMPTY: RigBuild = Object.freeze({});

export function createBuildStore(): StoreApi<BuildState> {
  return createStore<BuildState>()((set) => ({
    selections: EMPTY,
    decodeError: null,

    select(category, partId) {
      if (!partIdSchema.safeParse(partId).success) {
        throw new RangeError(`"${partId}" is not a valid part id: part ids are kebab-case.`);
      }
      set((state) => ({
        selections: Object.freeze({ ...state.selections, [category]: partId }),
        decodeError: null,
      }));
    },

    clear(category) {
      set((state) => {
        if (state.selections[category] === undefined) return state;
        const { [category]: _removed, ...rest } = state.selections;
        return { selections: Object.freeze(rest) };
      });
    },

    reset() {
      set({ selections: EMPTY, decodeError: null });
    },

    loadEncoded(encoded) {
      if (encoded === null || encoded === '') {
        set({ selections: EMPTY, decodeError: null });
        return;
      }
      const result = buildCodec.decode(encoded);
      set(
        result.ok
          ? { selections: result.build, decodeError: null }
          : { selections: EMPTY, decodeError: result.error },
      );
    },
  }));
}

/** The app's single build store. */
export const buildStore: StoreApi<BuildState> = createBuildStore();

/** The share-URL encoding of a build, or `null` for the empty build (links then omit `b`). */
export function encodeSelections(selections: RigBuild): string | null {
  return buildCodec.isEmpty(selections) ? null : buildCodec.encode(selections);
}
