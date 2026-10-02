import { describe, expect, it } from 'vitest';
import {
  MAX_PART_ID_LENGTH,
  MAX_PAYLOAD_LENGTH,
  buildCodec,
  createBuildCodec,
  type Build,
  type BuildDecodeErrorCode,
  type RigBuild,
} from './build-codec';
import {
  PART_CATEGORIES,
  PART_CATEGORY_CODES,
  PART_CATEGORY_SHAPES,
  type PartCategory,
} from './categories';

describe('the v1 category codes', () => {
  it('are pinned, because shared links depend on them', () => {
    // Changing or reusing a code breaks every link already shared. Add new letters instead.
    expect(PART_CATEGORY_CODES).toEqual({
      cpu: 'c',
      motherboard: 'm',
      ram: 'r',
      'gpu-card': 'g',
      storage: 's',
      psu: 'p',
      cooler: 'k',
      case: 'x',
      'case-fan': 'f',
    });
    expect(PART_CATEGORIES).toEqual(Object.keys(PART_CATEGORY_CODES));
  });

  it('hold drives as a list and case fans as one model in packs, every other category as one part', () => {
    expect(PART_CATEGORY_SHAPES).toEqual({ list: ['storage'], packs: ['case-fan'] });
  });
});

describe('createBuildCodec', () => {
  it.each(['', 'ab', 'A', '1', '_', '-'])('rejects the code %j', (code) => {
    expect(() => createBuildCodec(['alpha'], { alpha: code })).toThrow(
      /needs a single lowercase letter code/,
    );
  });

  it('rejects a category given both a list and packs', () => {
    expect(() =>
      createBuildCodec(['alpha'], { alpha: 'a' }, { list: ['alpha'], packs: ['alpha'] }),
    ).toThrow('Category "alpha" cannot hold both a list and packs.');
  });

  it('rejects two categories sharing a code', () => {
    expect(() => createBuildCodec(['alpha', 'beta'], { alpha: 'a', beta: 'a' })).toThrow(
      'Categories "alpha" and "beta" share the code "a".',
    );
  });
});

describe('encode', () => {
  it('encodes the empty build as the bare version', () => {
    expect(buildCodec.encode({})).toBe('v1');
  });

  it('writes categories in table order whatever the object key order', () => {
    const build: RigBuild = { 'gpu-card': 'asus-tuf-rtx-5070-ti', cpu: 'amd-ryzen-7-9800x3d' };
    expect(buildCodec.encode(build)).toBe('v1.c_amd-ryzen-7-9800x3d.g_asus-tuf-rtx-5070-ti');
  });

  it('skips categories that are explicitly undefined, and an empty drive list', () => {
    const build: Partial<Record<PartCategory, unknown>> = {
      cpu: undefined,
      ram: 'kit-1',
      storage: [],
    };
    expect(buildCodec.encode(build as RigBuild)).toBe('v1.r_kit-1');
  });

  it.each(['', 'Upper', 'has space', 'a--b', '-a', 'a-', 'a_b', 'a.b', 'x'.repeat(81)])(
    'refuses to encode the part id %j',
    (partId) => {
      expect(() => buildCodec.encode({ cpu: partId })).toThrow(RangeError);
      expect(() => buildCodec.encode({ storage: ['drive-a', partId] })).toThrow(RangeError);
      expect(() => buildCodec.encode({ 'case-fan': { partId, packs: 1 } })).toThrow(RangeError);
    },
  );

  it('writes the drives in their order, each one an entry, at storage’s place in the table', () => {
    expect(
      buildCodec.encode({ case: 'case-x', storage: ['drive-a', 'drive-b', 'drive-a'], cpu: 'c-1' }),
    ).toBe('v1.c_c-1.s_drive-a.s_drive-b.s_drive-a.x_case-x');
  });

  it('writes one entry per pack of case fans', () => {
    expect(buildCodec.encode({ 'case-fan': { partId: 'fan-x', packs: 1 } })).toBe('v1.f_fan-x');
    expect(buildCodec.encode({ 'case-fan': { partId: 'fan-x', packs: 3 } })).toBe(
      'v1.f_fan-x.f_fan-x.f_fan-x',
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %d packs of fans',
    (packs) => {
      expect(() => buildCodec.encode({ 'case-fan': { partId: 'fan-x', packs } })).toThrow(
        RangeError,
      );
    },
  );
});

/** The v1 encoding as it was before drives and packs: one `code_id` per category, in table order. */
function singlePartEncoding(build: Readonly<Partial<Record<PartCategory, string>>>): string {
  const entries = PART_CATEGORIES.filter((category) => build[category] !== undefined).map(
    (category) => `${PART_CATEGORY_CODES[category]}_${String(build[category])}`,
  );
  return ['v1', ...entries].join('.');
}

/** A build with one part per picked category, in the shape the codec holds it. */
function shaped(build: Readonly<Partial<Record<PartCategory, string>>>): RigBuild {
  const { storage, 'case-fan': fan, ...singles } = build;
  return {
    ...singles,
    ...(storage === undefined ? {} : { storage: [storage] }),
    ...(fan === undefined ? {} : { 'case-fan': { partId: fan, packs: 1 } }),
  };
}

/** Every subset of the categories, each with a distinct valid id. */
function allSinglePartBuilds(): Partial<Record<PartCategory, string>>[] {
  const builds: Partial<Record<PartCategory, string>>[] = [];
  for (let mask = 0; mask < 2 ** PART_CATEGORIES.length; mask++) {
    const build: Partial<Record<PartCategory, string>> = {};
    PART_CATEGORIES.forEach((category, i) => {
      if (mask & (1 << i)) build[category] = `${category}-model-${String(mask)}`;
    });
    builds.push(build);
  }
  return builds;
}

describe('links shared before drives and packs', () => {
  it('decode exactly as before: one drive, one pack, and every other part, for all 512 subsets', () => {
    for (const build of allSinglePartBuilds()) {
      const link = singlePartEncoding(build);
      expect(buildCodec.decode(link)).toEqual({ ok: true, build: shaped(build) });
      expect(buildCodec.encode(shaped(build))).toBe(link);
    }
  });

  it('decode a real link with one drive and one fan pack', () => {
    expect(
      buildCodec.decode(
        'v1.c_amd-ryzen-7-9800x3d.s_wd-black-sn850x-2tb.f_arctic-p12-pwm-pst-black',
      ),
    ).toEqual({
      ok: true,
      build: {
        cpu: 'amd-ryzen-7-9800x3d',
        storage: ['wd-black-sn850x-2tb'],
        'case-fan': { partId: 'arctic-p12-pwm-pst-black', packs: 1 },
      },
    });
  });
});

describe('round trip', () => {
  it('decodes every encoded build back to itself, with drive lists and packs', () => {
    const lists = [['d-1'], ['d-1', 'd-2'], ['d-1', 'd-2', 'd-1']];
    for (const [i, single] of allSinglePartBuilds().entries()) {
      const drives = lists[i % lists.length] ?? [];
      const packs = (i % 4) + 1;
      const build: RigBuild = {
        ...shaped(single),
        ...(single.storage === undefined ? {} : { storage: drives }),
        ...(single['case-fan'] === undefined
          ? {}
          : { 'case-fan': { partId: single['case-fan'], packs } }),
      };
      const encoded = buildCodec.encode(build);
      expect(buildCodec.decode(encoded)).toEqual({ ok: true, build });
      expect(buildCodec.encode(buildCodec.decode(encoded).build)).toBe(encoded);
    }
  });

  it('keeps the longest possible part ids', () => {
    const id = 'a'.repeat(MAX_PART_ID_LENGTH);
    const build: RigBuild = {
      ...Object.fromEntries(
        PART_CATEGORIES.filter((c) => c !== 'storage' && c !== 'case-fan').map((c) => [c, id]),
      ),
      storage: [id],
      'case-fan': { partId: id, packs: 1 },
    };
    const encoded = buildCodec.encode(build);
    expect(encoded.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
    expect(buildCodec.decode(encoded)).toEqual({ ok: true, build });
  });

  it('survives URLSearchParams unescaped, so share links stay readable', () => {
    const build: RigBuild = {
      cpu: 'amd-ryzen-7-9800x3d',
      storage: ['drive-a', 'drive-a'],
      'case-fan': { partId: 'fan-120', packs: 2 },
    };
    const encoded = buildCodec.encode(build);
    const search = new URLSearchParams({ b: encoded }).toString();
    expect(search).toBe(`b=${encoded}`);
    expect(buildCodec.decode(new URLSearchParams(search).get('b'))).toEqual({ ok: true, build });
  });

  it('accepts entries in any order, and keeps the drives in the order the link gives them', () => {
    expect(buildCodec.decode('v1.g_card-a.c_chip-b')).toEqual({
      ok: true,
      build: { cpu: 'chip-b', 'gpu-card': 'card-a' },
    });
    expect(buildCodec.decode('v1.s_drive-b.c_chip-a.s_drive-a.f_fan-x.s_drive-b.f_fan-x')).toEqual({
      ok: true,
      build: {
        cpu: 'chip-a',
        storage: ['drive-b', 'drive-a', 'drive-b'],
        'case-fan': { partId: 'fan-x', packs: 2 },
      },
    });
  });

  it('decodes three drives on one board, as the Director’s example link holds them', () => {
    const link =
      'v1.m_asus-rog-strix-b650e-i-gaming-wifi.s_samsung-990-pro-2tb.s_wd-black-sn850x-2tb.s_wd-black-sn8100-2tb';
    expect(buildCodec.decode(link)).toEqual({
      ok: true,
      build: {
        motherboard: 'asus-rog-strix-b650e-i-gaming-wifi',
        storage: ['samsung-990-pro-2tb', 'wd-black-sn850x-2tb', 'wd-black-sn8100-2tb'],
      },
    });
  });

  it('decodes the bare version to the empty build', () => {
    const result = buildCodec.decode('v1');
    expect(result).toEqual({ ok: true, build: {} });
    expect(buildCodec.isEmpty(result.build)).toBe(true);
  });

  it('returns frozen builds, drive lists and fan picks included', () => {
    const { build } = buildCodec.decode('v1.c_chip.s_drive.f_fan');
    expect(Object.isFrozen(build)).toBe(true);
    expect(Object.isFrozen(build.storage)).toBe(true);
    expect(Object.isFrozen(build['case-fan'])).toBe(true);
    expect(Object.isFrozen(buildCodec.decode('garbage').build)).toBe(true);
  });
});

describe('isEmpty', () => {
  it('counts a build as empty when it would encode no entry', () => {
    expect(buildCodec.isEmpty({})).toBe(true);
    expect(buildCodec.isEmpty({ storage: [] })).toBe(true);
    expect(buildCodec.isEmpty({ storage: ['drive-a'] })).toBe(false);
    expect(buildCodec.isEmpty({ 'case-fan': { partId: 'fan-x', packs: 1 } })).toBe(false);
    expect(buildCodec.isEmpty({ psu: 'psu-a' })).toBe(false);
  });
});

describe('decode rejects bad input with an empty build and an error, never a throw', () => {
  const cases: [unknown, BuildDecodeErrorCode][] = [
    [undefined, 'malformed'],
    [null, 'malformed'],
    [42, 'malformed'],
    [{ cpu: 'x' }, 'malformed'],
    [['v1'], 'malformed'],
    ['', 'malformed'],
    ['garbage', 'malformed'],
    ['<script>alert(1)</script>', 'malformed'],
    ['V1', 'malformed'],
    ['v', 'malformed'],
    ['v1x.c_a', 'malformed'],
    ['v1.', 'malformed'],
    ['v1..c_a', 'malformed'],
    ['v1.c_a.', 'malformed'],
    ['v1.c-a', 'malformed'],
    ['v1.ca', 'malformed'],
    ['v1._a', 'malformed'],
    ['v1.C_a', 'malformed'],
    ['v1.cc_a', 'malformed'],
    ['v1.c_a\n', 'malformed'],
    ['v2', 'unsupported-version'],
    ['v2.c_a', 'unsupported-version'],
    ['v10.c_a', 'unsupported-version'],
    ['v0', 'unsupported-version'],
    ['v1.z_a', 'unknown-category'],
    ['v1.c_a.c_b', 'duplicate-category'],
    ['v1.c_a.g_b.c_a', 'duplicate-category'],
    ['v1.c_a.c_a', 'duplicate-category'],
    ['v1.m_a.s_b.m_a', 'duplicate-category'],
    ['v1.x_a.x_b', 'duplicate-category'],
    ['v1.f_fan-x.f_fan-y', 'mixed-packs'],
    ['v1.f_fan-x.f_fan-x.f_fan-y', 'mixed-packs'],
    ['v1.c_', 'invalid-part-id'],
    ['v1.c_A', 'invalid-part-id'],
    ['v1.c_a--b', 'invalid-part-id'],
    ['v1.c_-a', 'invalid-part-id'],
    ['v1.c_a-', 'invalid-part-id'],
    ['v1.c_a_b', 'invalid-part-id'],
    ['v1.c_%20', 'invalid-part-id'],
    ['v1.c_ümlaut', 'invalid-part-id'],
    ['v1.s_drive-a.s_Drive-B', 'invalid-part-id'],
    ['v1.f_', 'invalid-part-id'],
    [`v1.c_${'a'.repeat(MAX_PART_ID_LENGTH + 1)}`, 'invalid-part-id'],
    ['x'.repeat(MAX_PAYLOAD_LENGTH + 1), 'too-long'],
    [`v1.c_${'a'.repeat(MAX_PAYLOAD_LENGTH)}`, 'too-long'],
  ];

  it.each(cases)('%j fails with %s', (input, code) => {
    const result = buildCodec.decode(input);
    expect(result.ok).toBe(false);
    expect(result.build).toEqual({});
    if (!result.ok) {
      expect(result.error.code).toBe(code);
      expect(result.error.detail.length).toBeGreaterThan(0);
    }
  });

  it('names both fan models when a link mixes them', () => {
    const result = buildCodec.decode('v1.f_fan-x.f_fan-y');
    expect(result.ok ? null : result.error.detail).toBe(
      'The build names two case-fan models, "fan-x" and "fan-y"; it holds one model, in packs.',
    );
  });

  it('treats a payload of exactly the length limit as a format problem, not a length problem', () => {
    const result = buildCodec.decode('x'.repeat(MAX_PAYLOAD_LENGTH));
    expect(result.ok ? null : result.error.code).toBe('malformed');
  });

  it('never throws on random input built from the format’s own characters', () => {
    // Deterministic pseudo-random strings (mulberry32), weighted towards near-valid payloads.
    let seed = 20260930;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const alphabet = 'v1v2._-_cgmrspkxfzAaZ09 %<>é';
    for (let i = 0; i < 5000; i++) {
      const length = Math.floor(random() * 40);
      let input = random() < 0.5 ? 'v1.' : '';
      for (let j = 0; j < length; j++) {
        input += alphabet.charAt(Math.floor(random() * alphabet.length));
      }
      const result = buildCodec.decode(input);
      if (result.ok) {
        expect(buildCodec.decode(buildCodec.encode(result.build))).toEqual(result);
      } else {
        expect(result.build).toEqual({});
      }
    }
  });
});

describe('a codec for another category table', () => {
  type Fruit = 'apple' | 'banana';
  const fruitCodec = createBuildCodec<Fruit>(['apple', 'banana'], { apple: 'a', banana: 'b' });

  it('encodes and decodes with that table', () => {
    const basket: Build<Fruit> = { banana: 'cavendish', apple: 'granny-smith' };
    expect(fruitCodec.encode(basket)).toBe('v1.a_granny-smith.b_cavendish');
    expect(fruitCodec.decode('v1.b_cavendish')).toEqual({
      ok: true,
      build: { banana: 'cavendish' },
    });
    expect(fruitCodec.decode('v1.c_chip')).toMatchObject({
      ok: false,
      error: { code: 'unknown-category' },
    });
  });

  it('holds one part per category unless the table gives the category a shape', () => {
    expect(fruitCodec.decode('v1.a_fuji.a_gala')).toMatchObject({
      ok: false,
      error: { code: 'duplicate-category' },
    });
    const bagCodec = createBuildCodec(
      ['apple', 'banana'] as const,
      { apple: 'a', banana: 'b' },
      { list: ['apple'], packs: ['banana'] },
    );
    expect(bagCodec.decode('v1.a_fuji.b_cavendish.a_gala.b_cavendish')).toEqual({
      ok: true,
      build: { apple: ['fuji', 'gala'], banana: { partId: 'cavendish', packs: 2 } },
    });
  });

  it('reports emptiness per table', () => {
    expect(fruitCodec.isEmpty({})).toBe(true);
    expect(fruitCodec.isEmpty({ apple: 'fuji' })).toBe(false);
  });
});
