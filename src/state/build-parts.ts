/**
 * The build from the share URL as the engine reads it (`BuildParts` in src/engine/types.ts).
 * A type-only import, so the engine adds nothing to the initial bundle.
 */
import type { BuildParts } from '../engine/types';
import type { RigBuild } from './build-codec';

/**
 * The engine's view of a link's build: `null` for a part not picked, no drives as an empty list.
 * The radiator position is `null` (any position the case takes): a link does not carry one yet.
 */
export function toBuildParts(build: RigBuild): BuildParts {
  return {
    cpu: build.cpu ?? null,
    motherboard: build.motherboard ?? null,
    ram: build.ram ?? null,
    'gpu-card': build['gpu-card'] ?? null,
    storage: build.storage ?? [],
    psu: build.psu ?? null,
    cooler: build.cooler ?? null,
    case: build.case ?? null,
    'case-fan': build['case-fan'] ?? null,
    radiatorPosition: null,
  };
}
