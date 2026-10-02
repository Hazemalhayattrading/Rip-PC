import { describe, expect, it } from 'vitest';
import { buildCodec } from './build-codec';
import { toBuildParts } from './build-parts';

describe('toBuildParts', () => {
  it('gives the engine every category, with null for a part not picked and no drives', () => {
    expect(toBuildParts({})).toEqual({
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
    });
  });

  it('passes on the link’s parts, its drives in order and its fan packs', () => {
    const { build } = buildCodec.decode(
      'v1.c_cpu-a.m_board-a.r_kit-a.g_card-a.s_drive-b.s_drive-a.s_drive-b.p_psu-a.k_cooler-a.x_case-a.f_fan-a.f_fan-a',
    );
    expect(toBuildParts(build)).toEqual({
      cpu: 'cpu-a',
      motherboard: 'board-a',
      ram: 'kit-a',
      'gpu-card': 'card-a',
      storage: ['drive-b', 'drive-a', 'drive-b'],
      psu: 'psu-a',
      cooler: 'cooler-a',
      case: 'case-a',
      'case-fan': { partId: 'fan-a', packs: 2 },
      radiatorPosition: null,
    });
  });
});
