import { describe, expect, it } from 'vitest';
import { createBuildStore } from './build-store';
import {
  connectBuildToUrl,
  hrefWithBuild,
  readBuildParam,
  withBuildParam,
  type UrlPort,
} from './url-sync';

/** A URL port backed by a plain string, recording every write. */
function fakeUrl(initial: string): UrlPort & { current: string; writes: string[] } {
  const port = {
    current: initial,
    writes: [] as string[],
    search: () => port.current,
    replaceSearch: (search: string) => {
      port.current = search;
      port.writes.push(search);
    },
  };
  return port;
}

describe('query helpers', () => {
  it('reads the build parameter', () => {
    expect(readBuildParam('?b=v1.c_chip')).toBe('v1.c_chip');
    expect(readBuildParam('?utm=x&b=v1')).toBe('v1');
    expect(readBuildParam('')).toBeNull();
    expect(readBuildParam('?b=')).toBe('');
  });

  it('sets or removes the build parameter and keeps the others', () => {
    expect(withBuildParam('', 'v1.c_chip')).toBe('?b=v1.c_chip');
    expect(withBuildParam('?utm=x', 'v1.c_chip')).toBe('?utm=x&b=v1.c_chip');
    expect(withBuildParam('?b=old&utm=x', 'v1.c_new')).toBe('?b=v1.c_new&utm=x');
    expect(withBuildParam('?b=old&utm=x', null)).toBe('?utm=x');
    expect(withBuildParam('?b=old', null)).toBe('');
    expect(withBuildParam('', null)).toBe('');
  });

  it('builds links that carry the build, or not', () => {
    expect(hrefWithBuild('/build/cpu', 'v1.c_chip')).toBe('/build/cpu?b=v1.c_chip');
    expect(hrefWithBuild('/build/cpu', null)).toBe('/build/cpu');
  });
});

describe('connectBuildToUrl', () => {
  it('loads the build from the URL and leaves a canonical URL alone', () => {
    const store = createBuildStore();
    const url = fakeUrl('?b=v1.c_chip-a.g_card-b');
    connectBuildToUrl(store, url);
    expect(store.getState().selections).toEqual({ cpu: 'chip-a', 'gpu-card': 'card-b' });
    expect(url.writes).toEqual([]);
  });

  it('rewrites a build given out of order into its canonical form', () => {
    const store = createBuildStore();
    const url = fakeUrl('?b=v1.g_card-b.c_chip-a');
    connectBuildToUrl(store, url);
    expect(url.writes).toEqual(['?b=v1.c_chip-a.g_card-b']);
  });

  it('drops an unreadable build from the URL, keeps other parameters, and flags the error', () => {
    const store = createBuildStore();
    const url = fakeUrl('?utm=news&b=%3Cscript%3E');
    connectBuildToUrl(store, url);
    expect(store.getState().selections).toEqual({});
    expect(store.getState().decodeError).toMatchObject({ code: 'malformed' });
    expect(url.current).toBe('?utm=news');
  });

  it('writes nothing for a URL without a build', () => {
    const store = createBuildStore();
    const url = fakeUrl('');
    connectBuildToUrl(store, url);
    expect(url.writes).toEqual([]);
  });

  it('mirrors every change to the build into the URL', () => {
    const store = createBuildStore();
    const url = fakeUrl('?utm=news');
    connectBuildToUrl(store, url);
    store.getState().select('cpu', 'chip-a');
    expect(url.current).toBe('?utm=news&b=v1.c_chip-a');
    store.getState().select('ram', 'kit-c');
    expect(url.current).toBe('?utm=news&b=v1.c_chip-a.r_kit-c');
    store.getState().reset();
    expect(url.current).toBe('?utm=news');
  });

  it('does not write when a change leaves the encoding the same', () => {
    const store = createBuildStore();
    const url = fakeUrl('?b=v1.c_chip-a');
    connectBuildToUrl(store, url);
    store.getState().select('cpu', 'chip-a');
    expect(url.writes).toEqual([]);
  });

  it('puts the build back after a navigation that dropped it', () => {
    const store = createBuildStore();
    const url = fakeUrl('?b=v1.c_chip-a');
    const sync = connectBuildToUrl(store, url);
    url.current = '';
    sync.reconcile();
    expect(url.current).toBe('?b=v1.c_chip-a');
    sync.reconcile();
    expect(url.writes).toEqual(['?b=v1.c_chip-a']);
  });

  it('keeps the current build when Back lands on an entry with an older one', () => {
    const store = createBuildStore();
    const url = fakeUrl('?b=v1.c_chip-a');
    const sync = connectBuildToUrl(store, url);
    store.getState().select('gpu-card', 'card-b');
    url.current = '?b=v1.c_chip-a';
    sync.reconcile();
    expect(store.getState().selections).toEqual({ cpu: 'chip-a', 'gpu-card': 'card-b' });
    expect(url.current).toBe('?b=v1.c_chip-a.g_card-b');
  });

  it('ignores store updates that leave the build itself unchanged', () => {
    const store = createBuildStore();
    const url = fakeUrl('?utm=news');
    connectBuildToUrl(store, url);
    store.getState().loadEncoded('garbage');
    expect(store.getState().decodeError).not.toBeNull();
    expect(url.writes).toEqual([]);
  });

  it('stops mirroring after disconnect', () => {
    const store = createBuildStore();
    const url = fakeUrl('');
    const sync = connectBuildToUrl(store, url);
    sync.disconnect();
    store.getState().select('cpu', 'chip-a');
    expect(url.writes).toEqual([]);
  });
});
