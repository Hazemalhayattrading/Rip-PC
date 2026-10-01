import { describe, expect, it } from 'vitest';
import { utcToday, validateFiles } from './validate';

/**
 * Maker support pages: a source's URL must open the tab its `docType` names. ASUS keeps the CPU support
 * list, the BIOS downloads and the FAQ on tabs of one product page, so a wrong tab looks like a valid
 * ASUS link (QA-P0-008: two CPU-support sources opened the FAQ tab).
 */

const modules = import.meta.glob<unknown>('../../data/**/*.json', { eager: true, import: 'default' });
const files = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [path.replace(/^(?:\.\.\/)+/, ''), json]),
);
const { dataset } = validateFiles(files, { today: utcToday() });

/** The ASUS support tab each document type lives on (the CPU list has two paths that open it). */
const ASUS_TABS: Record<string, RegExp> = {
  'cpu-support-list': /\/helpdesk_(?:qvl_)?cpu\/$/,
  'bios-release-notes': /\/helpdesk_bios\/$/,
};

describe('maker support pages', () => {
  const asus = (dataset.specs.motherboard ?? []).flatMap((board) =>
    board.sources
      .filter((s) => s.publisher === 'asus' && s.docType in ASUS_TABS)
      .map((s) => ({ board: board.id, docType: s.docType, url: new URL(s.url) })),
  );

  it('finds the ASUS CPU-support and BIOS sources', () => {
    expect(asus.length).toBeGreaterThan(0);
  });

  it.each(asus.map((s) => [`${s.board} ${s.docType}`, s] as const))('%s opens its own ASUS support tab', (_, s) => {
    expect(s.url.pathname).toMatch(ASUS_TABS[s.docType] ?? /$^/);
    expect(s.url.searchParams.get('model2Name')).toBeTruthy();
  });
});
