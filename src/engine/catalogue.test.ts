import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { utcToday } from '../data/validate';
import { SPEC_CATEGORIES } from '../data/schema';
import { CATALOGUE_CATEGORIES, isCatalogue } from './catalogue';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);
/** The real catalogue as the browser receives it: parsed JSON. */
const received: unknown = JSON.parse(JSON.stringify(catalogue));

describe('CATALOGUE_CATEGORIES', () => {
  it('lists every spec category, in data-lead order', () => {
    expect(CATALOGUE_CATEGORIES).toEqual(SPEC_CATEGORIES);
  });
});

describe('isCatalogue', () => {
  it('accepts the built catalogue', () => {
    expect(isCatalogue(received)).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'catalogue'],
  ])('rejects %s', (_label, value) => {
    expect(isCatalogue(value)).toBe(false);
  });

  /** The received catalogue with one top-level field replaced. */
  const withField = (key: string, value: unknown): unknown => ({
    ...(received as Record<string, unknown>),
    [key]: value,
  });

  it.each([
    ['another schema version', 'schemaVersion', 2],
    ['a data hash that is not SHA-256 hex', 'dataHash', 'abc'],
    ['publishers that are not a list', 'publishers', {}],
    ['games that are not a list', 'games', null],
    ['game anchors that are not a list', 'gameBenchmarks', 'x'],
    ['creator anchors that are not a list', 'creatorBenchmarks', 1],
    ['parts that are not an object', 'parts', []],
    ['prices that are not an object', 'prices', null],
  ])('rejects %s', (_label, key, value) => {
    expect(isCatalogue(withField(key, value))).toBe(false);
  });

  it('rejects parts without one category', () => {
    const { case: _missing, ...parts } = catalogue.parts;
    expect(isCatalogue(withField('parts', parts))).toBe(false);
  });

  it('rejects prices without one market, or with a market that is not a price file', () => {
    expect(isCatalogue(withField('prices', { SA: catalogue.prices.SA }))).toBe(false);
    expect(isCatalogue(withField('prices', { SA: catalogue.prices.SA, US: [] }))).toBe(false);
  });
});
