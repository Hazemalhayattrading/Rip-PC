import { describe, expect, it } from 'vitest';
import { formatIssue, utcToday, validateFiles } from './validate';

/** Every JSON file under data/, keyed by repo-relative path (e.g. `data/parts/cpu.json`). */
const modules = import.meta.glob<unknown>('../../data/**/*.json', { eager: true, import: 'default' });
const files = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [path.replace(/^(?:\.\.\/)+/, ''), json]),
);

describe('dataset (data/**)', () => {
  const result = validateFiles(files, { today: utcToday() });

  it('passes every validation rule', () => {
    expect(result.errors.map(formatIssue)).toEqual([]);
  });

  it('lists its warnings (non-blocking)', () => {
    for (const w of result.warnings) console.warn(formatIssue(w));
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
