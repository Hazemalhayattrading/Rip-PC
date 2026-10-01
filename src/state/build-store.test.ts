import { describe, expect, it } from 'vitest';
import { buildStore, createBuildStore, encodeSelections } from './build-store';

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
    store.getState().reset();
    expect(store.getState().decodeError).toBeNull();
    expect(store.getState().selections).toEqual({});
  });

  it('exports one shared store for the app', () => {
    expect(buildStore.getState().selections).toEqual({});
  });
});

describe('encodeSelections', () => {
  it('omits the empty build and encodes the rest', () => {
    expect(encodeSelections({})).toBeNull();
    expect(encodeSelections({ ram: 'kit-b', cpu: 'chip-a' })).toBe('v1.c_chip-a.r_kit-b');
  });
});
