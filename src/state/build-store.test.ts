import { describe, expect, it } from 'vitest';
import { MAX_PART_ID_LENGTH, MAX_PAYLOAD_LENGTH, buildCodec } from './build-codec';
import { buildStore, canAddDrive, createBuildStore, encodeSelections } from './build-store';

/** The longest part id the codec takes, made unique by its last characters. */
const longId = (n: number) => `${'a'.repeat(MAX_PART_ID_LENGTH - 4)}-${String(n).padStart(3, '0')}`;

describe('build store', () => {
  it('starts empty with no link error', () => {
    const store = createBuildStore();
    expect(store.getState().selections).toEqual({});
    expect(store.getState().decodeError).toBeNull();
  });

  it('selects one part per category, replacing earlier picks', () => {
    const store = createBuildStore();
    store.getState().select('cpu', 'amd-ryzen-7-9800x3d');
    store.getState().select('gpu-card', 'asus-tuf-rtx-5070-ti');
    store.getState().select('cpu', 'intel-core-ultra-7-265k');
    expect(store.getState().selections).toEqual({
      cpu: 'intel-core-ultra-7-265k',
      'gpu-card': 'asus-tuf-rtx-5070-ti',
    });
    expect(Object.isFrozen(store.getState().selections)).toBe(true);
  });

  it.each(['', 'Not-Kebab', 'a b', 'a_b', 'a--b'])('refuses the part id %j', (partId) => {
    const store = createBuildStore();
    expect(() => {
      store.getState().select('cpu', partId);
    }).toThrow(RangeError);
    expect(() => {
      store.getState().setDrives(['drive-a', partId]);
    }).toThrow(RangeError);
    expect(() => {
      store.getState().setFans(partId, 1);
    }).toThrow(RangeError);
    expect(store.getState().selections).toEqual({});
  });

  it('clears one category and leaves the rest', () => {
    const store = createBuildStore();
    store.getState().select('cpu', 'chip-a');
    store.getState().select('ram', 'kit-b');
    store.getState().clear('cpu');
    expect(store.getState().selections).toEqual({ ram: 'kit-b' });
  });

  it('does not notify listeners when clearing a category that is already empty', () => {
    const store = createBuildStore();
    store.getState().select('ram', 'kit-b');
    let notified = 0;
    store.subscribe(() => {
      notified++;
    });
    store.getState().clear('cpu');
    expect(notified).toBe(0);
    expect(store.getState().selections).toEqual({ ram: 'kit-b' });
  });

  it('loads a build from a link parameter', () => {
    const store = createBuildStore();
    store.getState().loadEncoded('v1.c_chip-a.g_card-b');
    expect(store.getState().selections).toEqual({ cpu: 'chip-a', 'gpu-card': 'card-b' });
    expect(store.getState().decodeError).toBeNull();
  });

  it('loads drives and fan packs from a link parameter', () => {
    const store = createBuildStore();
    store.getState().loadEncoded('v1.s_drive-a.s_drive-b.f_fan-x.f_fan-x');
    expect(store.getState().selections).toEqual({
      storage: ['drive-a', 'drive-b'],
      'case-fan': { partId: 'fan-x', packs: 2 },
    });
  });

  it.each([null, ''])('treats %j as a link without a build', (encoded) => {
    const store = createBuildStore();
    store.getState().select('cpu', 'chip-a');
    store.getState().loadEncoded(encoded);
    expect(store.getState().selections).toEqual({});
    expect(store.getState().decodeError).toBeNull();
  });

  it('turns an unreadable link into an empty build with the error kept', () => {
    const store = createBuildStore();
    store.getState().select('cpu', 'chip-a');
    store.getState().loadEncoded('v9.c_chip-a');
    expect(store.getState().selections).toEqual({});
    expect(store.getState().decodeError).toMatchObject({ code: 'unsupported-version' });
  });

  it('forgets the link error once the visitor picks a part, or resets', () => {
    const store = createBuildStore();
    store.getState().loadEncoded('garbage');
    expect(store.getState().decodeError).not.toBeNull();
    store.getState().select('cpu', 'chip-a');
    expect(store.getState().decodeError).toBeNull();

    store.getState().loadEncoded('garbage');
    store.getState().setDrives(['drive-a']);
    expect(store.getState().decodeError).toBeNull();

    store.getState().loadEncoded('garbage');
    store.getState().setFans('fan-x', 1);
    expect(store.getState().decodeError).toBeNull();

    store.getState().loadEncoded('garbage');
    store.getState().reset();
    expect(store.getState().decodeError).toBeNull();
    expect(store.getState().selections).toEqual({});
  });

  it('exports one shared store for the app', () => {
    expect(buildStore.getState().selections).toEqual({});
  });
});

describe('drives', () => {
  it('sets the drives in the order given, a drive repeating', () => {
    const store = createBuildStore();
    store.getState().select('motherboard', 'board-a');
    store.getState().setDrives(['drive-a', 'drive-b', 'drive-a']);
    expect(store.getState().selections).toEqual({
      motherboard: 'board-a',
      storage: ['drive-a', 'drive-b', 'drive-a'],
    });
    expect(Object.isFrozen(store.getState().selections.storage)).toBe(true);
  });

  it('keeps no copy of the list it was given', () => {
    const store = createBuildStore();
    const drives = ['drive-a'];
    store.getState().setDrives(drives);
    drives.push('drive-b');
    expect(store.getState().selections.storage).toEqual(['drive-a']);
  });

  it('removes the drives for an empty list, or on clear', () => {
    const store = createBuildStore();
    store.getState().setDrives(['drive-a']);
    store.getState().setDrives([]);
    expect(store.getState().selections).toEqual({});
    store.getState().setDrives(['drive-a']);
    store.getState().clear('storage');
    expect(store.getState().selections).toEqual({});
  });
});

describe('case fans', () => {
  it('holds one fan model and its packs, replacing an earlier pick', () => {
    const store = createBuildStore();
    store.getState().setFans('fan-x', 2);
    store.getState().setFans('fan-y', 1);
    expect(store.getState().selections).toEqual({ 'case-fan': { partId: 'fan-y', packs: 1 } });
    expect(Object.isFrozen(store.getState().selections['case-fan'])).toBe(true);
    store.getState().clear('case-fan');
    expect(store.getState().selections).toEqual({});
  });

  it.each([0, -2, 1.5, Number.NaN])('refuses %d packs', (packs) => {
    const store = createBuildStore();
    expect(() => {
      store.getState().setFans('fan-x', packs);
    }).toThrow(RangeError);
    expect(store.getState().selections).toEqual({});
  });
});

describe('a build too long for a link', () => {
  it('is refused, so every build the store holds opens again from its link', () => {
    const store = createBuildStore();
    // 13 drives of 83 characters each, plus "v1": 1,081 characters.
    const drives = Array.from({ length: 13 }, (_, i) => longId(i));
    expect(buildCodec.encode({ storage: drives }).length).toBeGreaterThan(MAX_PAYLOAD_LENGTH);
    expect(() => {
      store.getState().setDrives(drives);
    }).toThrow(/too long for a link/);
    expect(store.getState().selections).toEqual({});
  });
});

describe('canAddDrive', () => {
  it('allows another drive while one more of the longest ids still fits a link', () => {
    expect(canAddDrive({})).toBe(true);
    const drives = Array.from({ length: 11 }, (_, i) => longId(i));
    // 11 drives of 83 characters each, plus "v1": 915 characters, and a 12th makes 998.
    expect(canAddDrive({ storage: drives })).toBe(true);
    expect(canAddDrive({ storage: [...drives, longId(11)] })).toBe(false);
  });
});

describe('encodeSelections', () => {
  it('omits the empty build and encodes the rest', () => {
    expect(encodeSelections({})).toBeNull();
    expect(encodeSelections({ storage: [] })).toBeNull();
    expect(encodeSelections({ ram: 'kit-b', cpu: 'chip-a' })).toBe('v1.c_chip-a.r_kit-b');
    expect(encodeSelections({ storage: ['d-1', 'd-2'] })).toBe('v1.s_d-1.s_d-2');
  });
});
