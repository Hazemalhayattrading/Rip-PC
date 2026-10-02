/**
 * The system a build gives the performance model (`EngineApi.systemOf`, QA's C1): its CPU, its
 * card's GPU chip, the card, and its memory. The golden test, the held-out run and the dump's
 * query mode describe a published test bench as a `PerfSystem` directly.
 */
import type { SpecRecordByCategory } from '../data/schema';
import type { BuildParts, Catalogue, NeedsParts, PerfSystem } from './types';

type LookedUp = 'cpu' | 'gpu-card' | 'ram';

/**
 * The catalogue part with this id.
 * @throws {RangeError} naming the id when the catalogue has no such part
 */
function partOf<C extends LookedUp>(
  catalogue: Catalogue,
  category: C,
  id: string,
): SpecRecordByCategory[C] {
  const part = catalogue.parts[category].find((record) => record.id === id);
  if (part === undefined) {
    throw new RangeError(`The catalogue has no ${category} part "${id}".`);
  }
  return part;
}

/**
 * The CPU, GPU chip, card and memory of a build, or a request to pick a CPU first. Without a
 * card the GPU chip is `null`; without a kit the memory is `null`.
 * @throws {RangeError} when a picked part is not in the catalogue: callers validate ids first
 */
export function systemOf(build: BuildParts, catalogue: Catalogue): PerfSystem | NeedsParts {
  if (build.cpu === null) {
    return { kind: 'needs-parts', needs: ['cpu'], reason: 'Pick a CPU to estimate performance.' };
  }
  const cpu = partOf(catalogue, 'cpu', build.cpu);
  const cardId = build['gpu-card'];
  const card = cardId === null ? null : partOf(catalogue, 'gpu-card', cardId);
  const kit = build.ram === null ? null : partOf(catalogue, 'ram', build.ram);
  return {
    cpuId: cpu.id,
    gpuChipId: card === null ? null : card.chipId,
    gpuCardId: card === null ? null : card.id,
    ram:
      kit === null
        ? null
        : {
            type: kit.type,
            speedMtps: kit.speedMtps,
            capacityGb: kit.moduleCapacityGb * kit.moduleCount,
            moduleCount: kit.moduleCount,
            cl: kit.timings.cl,
          },
  };
}
