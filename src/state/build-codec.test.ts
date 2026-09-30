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
import { PART_CATEGORIES, PART_CATEGORY_CODES, type PartCategory } from './categories';

describe('the v1 category codes', () => {
  it('are pinned, because shared links depend on them', () => {
    // Changing or reusing a code breaks every link already shared. Add new letters instead.
    expect(PART_CATEGORY_CODES).toEqual({
      cpu: 'c',
      motherboard: 'm',
      ram: 'r',
      gpu: 'g',
      storage: 's',
      psu: 'p',
      cooler: 'k',
      case: 'x',
      'case-fan': 'f',
    });
    expect(PART_CATEGORIES).toEqual(Object.keys(PART_CATEGORY_CODES));
  });
});

describe('createBuildCodec', () => {
  it.each(['', 'ab', 'A', '1', '_', '-'])('rejects the code %j', (code) => {
    expect(() => createBuildCodec(['alpha'], { alpha: code })).toThrow(
      /needs a single lowercase letter code/,
    );
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
    const build: RigBuild = { gpu: 'asus-tuf-rtx-5070-ti', cpu: 'amd-ryzen-7-9800x3d' };
    expect(buildCodec.encode(build)).toBe('v1.c_amd-ryzen-7-9800x3d.g_asus-tuf-rtx-5070-ti');
  });

  it('skips categories that are explicitly undefined', () => {
    const build: Partial<Record<PartCategory, string | undefined>> = {
      cpu: undefined,
      ram: 'kit-1',
    };
    expect(buildCodec.encode(build as RigBuild)).toBe('v1.r_kit-1');
  });

  it.each(['', 'Upper', 'has space', 'a--b', '-a', 'a-', 'a_b', 'a.b', 'x'.repeat(81)])(
    'refuses to encode the part id %j',
    (partId) => {
      expect(() => buildCodec.encode({ cpu: partId })).toThrow(RangeError);
    },
  );
});

/** Every subset of the categories, each with a distinct valid id. */
function allBuilds(): RigBuild[] {
  const builds: RigBuild[] = [];
  for (let mask = 0; mask < 2 ** PART_CATEGORIES.length; mask++) {
    const build: Partial<Record<PartCategory, string>> = {};
    PART_CATEGORIES.forEach((category, i) => {
      if (mask & (1 << i)) build[category] = `${category}-model-${String(mask)}`;
    });
    builds.push(build);
  }
  return builds;
}

describe('round trip', () => {
  it('decodes every encoded build back to itself, for all 512 category subsets', () => {
    for (const build of allBuilds()) {
      const encoded = buildCodec.encode(build);
      expect(buildCodec.decode(encoded)).toEqual({ ok: true, build });
      expect(buildCodec.encode(buildCodec.decode(encoded).build)).toBe(encoded);
    }
  });

  it('keeps the longest possible part ids', () => {
    const build: RigBuild = Object.fromEntries(
      PART_CATEGORIES.map((category) => [category, 'a'.repeat(MAX_PART_ID_LENGTH)]),
    );
    const encoded = buildCodec.encode(build);
    expect(encoded.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
    expect(buildCodec.decode(encoded)).toEqual({ ok: true, build });
  });

  it('survives URLSearchParams unescaped, so share links stay readable', () => {
    const encoded = buildCodec.encode({ cpu: 'amd-ryzen-7-9800x3d', 'case-fan': 'fan-120-3pack' });
    const search = new URLSearchParams({ b: encoded }).toString();
    expect(search).toBe(`b=${encoded}`);
    expect(buildCodec.decode(new URLSearchParams(search).get('b'))).toEqual({
      ok: true,
      build: { cpu: 'amd-ryzen-7-9800x3d', 'case-fan': 'fan-120-3pack' },
    });
  });

  it('accepts entries in any order', () => {
    expect(buildCodec.decode('v1.g_card-a.c_chip-b')).toEqual({
      ok: true,
      build: { cpu: 'chip-b', gpu: 'card-a' },
    });
  });

  it('decodes the bare version to the empty build', () => {
    const result = buildCodec.decode('v1');
    expect(result).toEqual({ ok: true, build: {} });
    expect(buildCodec.isEmpty(result.build)).toBe(true);
  });

  it('returns frozen builds', () => {
    expect(Object.isFrozen(buildCodec.decode('v1.c_chip').build)).toBe(true);
    expect(Object.isFrozen(buildCodec.decode('garbage').build)).toBe(true);
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
    ['v1.c_', 'invalid-part-id'],
    ['v1.c_A', 'invalid-part-id'],
    ['v1.c_a--b', 'invalid-part-id'],
    ['v1.c_-a', 'invalid-part-id'],
    ['v1.c_a-', 'invalid-part-id'],
    ['v1.c_a_b', 'invalid-part-id'],
    ['v1.c_%20', 'invalid-part-id'],
    ['v1.c_ümlaut', 'invalid-part-id'],
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

  it('reports emptiness per table', () => {
    expect(fruitCodec.isEmpty({})).toBe(true);
    expect(fruitCodec.isEmpty({ apple: 'fuji' })).toBe(false);
  });
});
