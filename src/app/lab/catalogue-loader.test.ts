import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import { createCatalogueLoader } from './catalogue-loader';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../../..')),
  utcToday(),
);

/** A fetch that answers from a list, and counts its calls. */
function fakeFetch(answers: readonly (() => Promise<Response>)[]) {
  let calls = 0;
  const fetchImpl = (): Promise<Response> => {
    const answer = answers[Math.min(calls, answers.length - 1)];
    calls += 1;
    if (answer === undefined) throw new Error('no answer');
    return answer();
  };
  return { fetchImpl, calls: () => calls };
}

const ok = () => Promise.resolve(new Response(JSON.stringify(catalogue)));

describe('createCatalogueLoader', () => {
  it('fetches once, and gives every caller the same promise, as React’s use() needs', async () => {
    const { fetchImpl, calls } = fakeFetch([ok]);
    const load = createCatalogueLoader('/catalogue.json', fetchImpl);
    const first = load();
    expect(load()).toBe(first);
    expect((await first).dataHash).toBe(catalogue.dataHash);
    expect(calls()).toBe(1);
  });

  it('keeps a failed load, so use() reads the failure instead of suspending again', async () => {
    const { fetchImpl, calls } = fakeFetch([
      () => Promise.reject(new TypeError('Failed to fetch')),
      ok,
    ]);
    const load = createCatalogueLoader('/catalogue.json', fetchImpl);
    const first = load();
    await expect(first).rejects.toThrow('Failed to fetch');
    // The page's Reload button reloads the page; nothing retries behind the error's back.
    expect(load()).toBe(first);
    expect(calls()).toBe(1);
  });

  it('says what failed when the server answers with an error, or the file isn’t a catalogue', async () => {
    const notFound = createCatalogueLoader(
      '/catalogue.json',
      fakeFetch([() => Promise.resolve(new Response('', { status: 404 }))]).fetchImpl,
    );
    await expect(notFound()).rejects.toThrow('the server answered 404');
    const wrong = createCatalogueLoader(
      '/catalogue.json',
      fakeFetch([() => Promise.resolve(new Response('{"schemaVersion":2}'))]).fetchImpl,
    );
    await expect(wrong()).rejects.toThrow('not in the format this page expects');
  });
});
