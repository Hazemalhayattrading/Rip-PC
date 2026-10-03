/**
 * The build: one selected part per category, the drives as a list, the case fans as one model in
 * packs, plus the result of reading the build from a link.
 *
 * A vanilla Zustand store, so it has no React dependency and is unit-tested in Node.
 * React components read it through `useBuild` in `src/app/build-hooks.ts`.
 *
 * Every build the store holds encodes to a link the codec reads back: an action that would make
 * the link too long throws, and leaves the build as it was.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  MAX_PAYLOAD_LENGTH,
  buildCodec,
  partIdSchema,
  type BuildDecodeError,
  type RigBuild,
} from './build-codec';
import type { PartCategory, SinglePartCategory } from './categories';

/** Actions are plain functions (no `this`), so components can select and pass them around. */
export interface BuildState {
  readonly selections: RigBuild;
  /** Why the build in the page's link could not be read, or `null` when it could. */
  readonly decodeError: BuildDecodeError | null;
  /**
   * Selects a part for a one-part category, replacing any earlier pick.
   * @throws {RangeError} when `partId` is not kebab-case, or the build would not fit a link.
   */
  readonly select: (category: SinglePartCategory, partId: string) => void;
  /**
   * Sets the drives, in order; a drive may repeat. An empty list removes them.
   * @throws {RangeError} when a part id is not kebab-case, or the build would not fit a link.
   */
  readonly setDrives: (partIds: readonly string[]) => void;
  /**
   * Sets the case fans: one model, in retail packs.
   * @throws {RangeError} when `partId` is not kebab-case, `packs` is not a whole number of 1 or
   *   more, or the build would not fit a link.
   */
  readonly setFans: (partId: string, packs: number) => void;
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

function assertPartId(partId: string): void {
  if (!partIdSchema.safeParse(partId).success) {
    throw new RangeError(`"${partId}" is not a valid part id: part ids are kebab-case.`);
  }
}

/** The build, checked to fit a link, frozen. */
function fitted(build: RigBuild): RigBuild {
  const length = buildCodec.encode(build).length;
  if (length > MAX_PAYLOAD_LENGTH) {
    throw new RangeError(
      `This build is too long for a link: ${String(length)} characters, the limit is ${String(MAX_PAYLOAD_LENGTH)}.`,
    );
  }
  return Object.freeze(build);
}

export function createBuildStore(): StoreApi<BuildState> {
  return createStore<BuildState>()((set, get) => ({
    selections: EMPTY,
    decodeError: null,

    select(category, partId) {
      assertPartId(partId);
      set({ selections: fitted({ ...get().selections, [category]: partId }), decodeError: null });
    },

    setDrives(partIds) {
      partIds.forEach(assertPartId);
      const { storage: _drives, ...rest } = get().selections;
      const selections =
        partIds.length === 0
          ? fitted(rest)
          : fitted({ ...rest, storage: Object.freeze([...partIds]) });
      set({ selections, decodeError: null });
    },

    setFans(partId, packs) {
      assertPartId(partId);
      if (!Number.isInteger(packs) || packs < 1) {
        throw new RangeError(`${String(packs)} packs: packs are a whole number, 1 or more.`);
      }
      const fans = Object.freeze({ partId, packs });
      set({ selections: fitted({ ...get().selections, 'case-fan': fans }), decodeError: null });
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
