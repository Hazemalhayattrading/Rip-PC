import { describe, expect, it } from 'vitest';
import { DOC_TYPES } from '../../data/schema';
import { documentName } from './source-text';

describe('documentName', () => {
  it('names a document by its type in English (copy guide §12)', () => {
    expect(documentName({ docType: 'spec-page' })).toBe('spec page');
    expect(documentName({ docType: 'product-page' })).toBe('product page');
    expect(documentName({ docType: 'cpu-support-list' })).toBe('CPU support list');
    expect(documentName({ docType: 'bios-release-notes' })).toBe('BIOS release notes');
    expect(documentName({ docType: 'benchmark-database' })).toBe('benchmark results');
    expect(documentName({ docType: 'manual' })).toBe('user manual');
  });

  it('adds a manual’s page, from where the source says the values are', () => {
    expect(documentName({ docType: 'manual', locator: 'p. vii, Storage' })).toBe(
      'user manual, p. vii, Storage',
    );
  });

  it('never shows where in any other document the values are, nor its title', () => {
    expect(
      documentName({ docType: 'review', locator: 'Das Testsystem im Detail', title: 'Test' }),
    ).toBe('review');
  });

  it('has a name for every document type the data can hold', () => {
    for (const docType of DOC_TYPES) expect(documentName({ docType })).not.toBe('');
  });
});
