import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import { CHIP_PARAM, labPartsHref, partAnchorId } from './lab-links';
import { findRecord, pickedParts, pricesOf, publisherName } from './parts-model';

const ROOT = resolve(import.meta.dirname, '../../..');
const { catalogue } = buildCatalogue(readDataFiles(ROOT), utcToday());

const CARD = 'sapphire-pulse-radeon-rx-9070-xt-16gb';
const CARD_CHIP = 'amd-radeon-rx-9070-xt';

/** What each picked part's section says about itself: the category, id and whether it is known. */
function outline(sections: ReturnType<typeof pickedParts>) {
  return sections.map((s) => [s.category, s.id, s.record === null ? 'unknown' : 'known', s.via]);
}

describe('findRecord', () => {
  it('finds a part by category and id, and nothing in another category', () => {
    expect(findRecord(catalogue, 'gpu-card', CARD)?.name).toBe(
      'SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB',
    );
    expect(findRecord(catalogue, 'cpu', CARD)).toBeNull();
    expect(findRecord(catalogue, 'cpu', 'no-such-part')).toBeNull();
  });
});

describe('pickedParts', () => {
  it('lists the picks in builder order, with each graphics card’s chip right after it', () => {
    const sections = pickedParts(
      catalogue,
      {
        case: 'fractal-north-charcoal-black-tg-light',
        'gpu-card': CARD,
        cpu: 'amd-ryzen-7-9800x3d',
      },
      null,
    );
    expect(outline(sections)).toEqual([
      ['cpu', 'amd-ryzen-7-9800x3d', 'known', 'build'],
      ['gpu-card', CARD, 'known', 'build'],
      ['gpu-chip', CARD_CHIP, 'known', 'card'],
      ['case', 'fractal-north-charcoal-black-tg-light', 'known', 'build'],
    ]);
  });

  it('keeps an id the catalogue does not have, in its place, as unknown', () => {
    const sections = pickedParts(catalogue, { cpu: CARD, ram: 'no-such-kit' }, null);
    expect(outline(sections)).toEqual([
      ['cpu', CARD, 'unknown', 'build'],
      ['ram', 'no-such-kit', 'unknown', 'build'],
    ]);
  });

  it('adds the chip from the link last, or says it is unknown', () => {
    expect(outline(pickedParts(catalogue, {}, 'intel-arc-b580'))).toEqual([
      ['gpu-chip', 'intel-arc-b580', 'known', 'link'],
    ]);
    expect(outline(pickedParts(catalogue, {}, 'no-such-chip'))).toEqual([
      ['gpu-chip', 'no-such-chip', 'unknown', 'link'],
    ]);
  });

  it('shows a chip once when the link names the picked card’s own chip', () => {
    expect(outline(pickedParts(catalogue, { 'gpu-card': CARD }, CARD_CHIP))).toEqual([
      ['gpu-card', CARD, 'known', 'build'],
      ['gpu-chip', CARD_CHIP, 'known', 'card'],
    ]);
  });

  it('shows nothing for an empty build without a chip', () => {
    expect(pickedParts(catalogue, {}, null)).toEqual([]);
  });
});

describe('pricesOf', () => {
  it('gives each market’s observations and gaps for one part, never converted', () => {
    const raw = (market: string) =>
      JSON.parse(readFileSync(resolve(ROOT, `data/prices/${market}.json`), 'utf8')) as {
        observations: { partId: string; amount: number }[];
        gaps: { partId: string }[];
      };
    const sa = raw('sa');
    const us = raw('us');
    const part = sa.observations[0]?.partId ?? '';
    const prices = pricesOf(catalogue, part);
    expect(prices.map((p) => [p.market, p.currency])).toEqual([
      ['SA', 'SAR'],
      ['US', 'USD'],
    ]);
    expect(prices[0]?.observations.map((o) => o.amount)).toEqual(
      sa.observations.filter((o) => o.partId === part).map((o) => o.amount),
    );
    expect(prices[1]?.observations.map((o) => o.amount)).toEqual(
      us.observations.filter((o) => o.partId === part).map((o) => o.amount),
    );
    expect(prices[0]?.gaps).toHaveLength(sa.gaps.filter((g) => g.partId === part).length);
    expect(prices[1]?.gaps).toHaveLength(us.gaps.filter((g) => g.partId === part).length);
  });
});

describe('publisherName', () => {
  it('looks a publisher up by id, and falls back to the id itself', () => {
    expect(publisherName(catalogue, 'amazon-sa')).toBe('Amazon.sa');
    expect(publisherName(catalogue, 'no-such-publisher')).toBe('no-such-publisher');
  });
});

describe('partAnchorId', () => {
  it('gives each part section an id that a link on the same page can point to', () => {
    expect(partAnchorId('gpu-chip', CARD_CHIP)).toBe('part-gpu-chip-amd-radeon-rx-9070-xt');
    expect(partAnchorId('gpu-card', CARD)).not.toBe(partAnchorId('gpu-chip', CARD));
  });
});

describe('labPartsHref', () => {
  it('opens the parts page with a build and, when given, a GPU chip', () => {
    expect(labPartsHref(null)).toBe('/lab/parts');
    expect(labPartsHref('v1.c_amd-ryzen-7-9800x3d')).toBe('/lab/parts?b=v1.c_amd-ryzen-7-9800x3d');
    expect(labPartsHref('v1.c_x', 'intel-arc-b580')).toBe(
      '/lab/parts?b=v1.c_x&chip=intel-arc-b580',
    );
    expect(labPartsHref(null, 'intel-arc-b580')).toBe('/lab/parts?chip=intel-arc-b580');
    expect(CHIP_PARAM).toBe('chip');
  });
});
