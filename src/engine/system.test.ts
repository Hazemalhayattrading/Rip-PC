import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { utcToday } from '../data/validate';
import * as engine from './index';
import { systemOf } from './system';
import type { BuildParts } from './types';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

const NOTHING: BuildParts = {
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

describe('systemOf', () => {
  it('asks for a CPU first', () => {
    expect(
      systemOf({ ...NOTHING, 'gpu-card': 'nvidia-geforce-rtx-5090-founders-edition' }, catalogue),
    ).toEqual({
      kind: 'needs-parts',
      needs: ['cpu'],
      reason: 'Pick a CPU to estimate performance.',
    });
  });

  it('gives a CPU without a graphics card or memory', () => {
    expect(systemOf({ ...NOTHING, cpu: 'amd-ryzen-7-9800x3d' }, catalogue)).toStrictEqual({
      cpuId: 'amd-ryzen-7-9800x3d',
      gpuChipId: null,
      gpuCardId: null,
      ram: null,
    });
  });

  it("takes the card's GPU chip, and the kit's memory with every module counted", () => {
    const system = systemOf(
      {
        ...NOTHING,
        cpu: 'intel-core-ultra-9-285k',
        'gpu-card': 'nvidia-geforce-rtx-5090-founders-edition',
        ram: 'gskill-trident-z5-ck-ddr5-8200-cl40-2x24gb',
      },
      catalogue,
    );
    expect(system).toStrictEqual({
      cpuId: 'intel-core-ultra-9-285k',
      gpuChipId: 'nvidia-geforce-rtx-5090',
      gpuCardId: 'nvidia-geforce-rtx-5090-founders-edition',
      ram: { type: 'DDR5', speedMtps: 8200, capacityGb: 48, moduleCount: 2, cl: 40 },
    });
  });

  it('reads every catalogue card and kit the same way', () => {
    for (const card of catalogue.parts['gpu-card']) {
      for (const kit of catalogue.parts.ram) {
        const system = systemOf(
          { ...NOTHING, cpu: 'amd-ryzen-5-7600', 'gpu-card': card.id, ram: kit.id },
          catalogue,
        );
        expect(system).toStrictEqual({
          cpuId: 'amd-ryzen-5-7600',
          gpuChipId: card.chipId,
          gpuCardId: card.id,
          ram: {
            type: kit.type,
            speedMtps: kit.speedMtps,
            capacityGb: kit.moduleCapacityGb * kit.moduleCount,
            moduleCount: kit.moduleCount,
            cl: kit.timings.cl,
          },
        });
      }
    }
  });

  it.each([
    ['cpu', { cpu: 'amd-ryzen-9-9999x' }],
    ['gpu-card', { cpu: 'amd-ryzen-7-9800x3d', 'gpu-card': 'no-such-card' }],
    ['ram', { cpu: 'amd-ryzen-7-9800x3d', ram: 'no-such-kit' }],
  ] as const)('throws on a %s id that is not in the catalogue, naming it', (category, parts) => {
    const id = Object.values(parts).at(-1) ?? '';
    expect(() => systemOf({ ...NOTHING, ...parts }, catalogue)).toThrow(
      new RangeError(`The catalogue has no ${category} part "${id}".`),
    );
  });

  it('is exported from the engine entry module', () => {
    expect(engine.systemOf).toBe(systemOf);
  });
});
