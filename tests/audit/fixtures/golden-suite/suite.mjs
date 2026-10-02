/**
 * A stand-in for the engine's golden test, for tests/audit/golden-count.test.mjs. Like the real one
 * it is generated from the anchor files, one case per row. Each scenario file under src/ calls
 * defineGoldenSuite with the defect it plants; "none" is the clean suite. The bodies check nothing
 * about the model: only the names and whether they pass matter to the count.
 *
 * The clean suite builds each title with a template literal. "truncated" uses it.each with "$id",
 * which Vitest 5 cuts at 40 characters by default (taskTitleValueFormatTruncate): 141 of the 143
 * anchor ids at c621c15 are longer than that, and cut down they collapse into 32 distinct names.
 */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const load = (file) =>
  JSON.parse(readFileSync(new URL(`./data/benchmarks/${file}`, import.meta.url), 'utf8')).items;

export function defineGoldenSuite(defect = 'none') {
  let rows = [...load('game.json'), ...load('creator.json')];
  // The defect that equal counts hide: the first row has no case and the second has two.
  if (defect === 'duplicate') rows = [rows[1], ...rows.slice(1)];
  if (defect === 'missing') rows = rows.slice(1);
  if (defect === 'extra') rows = [...rows, { id: 'tpu-not-an-anchor-row' }];
  if (defect === 'truncated') {
    it.each(rows)('[golden] $id: reproduces the published number within ±5%', () => {});
    return;
  }
  for (const [i, row] of rows.entries()) {
    const title =
      defect === 'malformed' && i === 0
        ? `[golden]${row.id}`
        : `[golden] ${row.id}: reproduces the published number within ±5%`;
    (defect === 'skipped' && i === 0 ? it.skip : it)(title, () => {
      expect(defect === 'failing' && i === 0, 'a planted failure').toBe(false);
    });
  }
  it('is not a golden case', () => {});
}
