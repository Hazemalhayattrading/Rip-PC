import { useStore } from 'zustand';
import { buildStore, encodeSelections, type BuildState } from '../state/build-store';

/** Reads from the build store. Select primitives or stable references to avoid re-renders. */
export function useBuild<T>(selector: (state: BuildState) => T): T {
  return useStore(buildStore, selector);
}

/** The build's share-URL encoding, or `null` when the build is empty. */
export function useEncodedBuild(): string | null {
  return useBuild((state) => encodeSelections(state.selections));
}
