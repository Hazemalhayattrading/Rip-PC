import { describe, expect, it } from 'vitest';
import { captureStem, freeCaptureBase } from '../../data/tools/capture-name.mjs';
import { PriceObservation } from './schema/price';

/** The price runners' capture names (`data/tools/capture-name.mjs`): one file per attempt, none overwritten. */

describe('capture names for the price runners', () => {
  const stem = captureStem('product', 'SA', 'amd-ryzen-7-9700x', 'amazon-sa', '2026-10-02');

  it('names a product page the way price records cite it', () => {
    expect(stem).toBe('artifacts/prices/SA/amd-ryzen-7-9700x--amazon-sa--2026-10-02');
  });

  it('names a search page with its date', () => {
    expect(captureStem('search', 'US', 'deepcool-ch560', 'newegg', '2026-10-02')).toBe(
      'artifacts/prices/search/US/deepcool-ch560--newegg-search--2026-10-02',
    );
  });

  it('keeps the plain name for the first attempt of the day', () => {
    expect(freeCaptureBase(stem, () => false)).toBe(stem);
  });

  it('numbers every later attempt, so no saved capture is overwritten', () => {
    const saved = new Set([`${stem}.html`, `${stem}.png`, `${stem}--2.html`]);
    expect(freeCaptureBase(stem, (p) => saved.has(p))).toBe(`${stem}--3`);
  });

  it('counts a lone screenshot or text file as a taken name', () => {
    expect(freeCaptureBase(stem, (p) => p === `${stem}.png`)).toBe(`${stem}--2`);
    expect(freeCaptureBase(stem, (p) => p === `${stem}.txt`)).toBe(`${stem}--2`);
  });

  it('gives only names the price schema accepts', () => {
    for (const base of [stem, `${stem}--2`, `${stem}--12`]) {
      expect(PriceObservation.shape.capture.safeParse(`${base}.html`).success, base).toBe(true);
    }
  });

  it('rejects anything that is not a kind, market, ID or date', () => {
    expect(() => captureStem('price', 'US', 'a', 'b', '2026-10-02')).toThrow(/kind/);
    expect(() => captureStem('product', 'UK', 'a', 'b', '2026-10-02')).toThrow(/market/);
    expect(() => captureStem('product', 'US', 'A B', 'b', '2026-10-02')).toThrow(/kebab-case/);
    expect(() => captureStem('product', 'US', 'a', 'b', '02/10/2026')).toThrow(/date/);
  });
});
