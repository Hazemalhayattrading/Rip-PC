import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_PATHS, SPEC_CATEGORIES } from '../../src/data/schema';
import { utcToday } from '../../src/data/validate';
import {
  CatalogueError,
  buildCatalogue,
  catalogueDataPaths,
  catalogueFileName,
  readDataFiles,
} from './catalogue';

const ROOT = resolve(import.meta.dirname, '../..');
const TODAY = utcToday();
const texts = readDataFiles(ROOT);

/** The data files with one file's parsed JSON changed by `edit`. */
function withEdit(
  path: string,
  edit: (json: Record<string, unknown>) => void,
): Record<string, string> {
  const json = JSON.parse(texts[path] ?? '') as Record<string, unknown>;
  edit(json);
  return { ...texts, [path]: JSON.stringify(json) };
}

describe('catalogueDataPaths', () => {
  it('lists every data file except the audits, which are not catalogue data', () => {
    const paths = catalogueDataPaths();
    expect(paths).toContain(DATA_PATHS.publishers);
    expect(paths).toContain(DATA_PATHS.games);
    expect(paths).toContain(DATA_PATHS.prices.SA);
    expect(paths).toContain(DATA_PATHS.prices.US);
    expect(paths).toContain(DATA_PATHS.benchmarks.game);
    expect(paths).toContain(DATA_PATHS.benchmarks.creator);
    for (const category of SPEC_CATEGORIES) expect(paths).toContain(DATA_PATHS.specs[category]);
    expect(paths).not.toContain(DATA_PATHS.audits);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('buildCatalogue, on the real data', () => {
  const built = buildCatalogue(texts, TODAY);
  const { catalogue } = built;

  it('carries every record of every data file', () => {
    for (const category of SPEC_CATEGORIES) {
      const file = JSON.parse(texts[DATA_PATHS.specs[category]] ?? '') as { items: unknown[] };
      expect(catalogue.parts[category], category).toHaveLength(file.items.length);
    }
    const games = JSON.parse(texts[DATA_PATHS.games] ?? '') as { games: unknown[] };
    expect(catalogue.games).toHaveLength(games.games.length);
    expect(catalogue.prices.SA.market).toBe('SA');
    expect(catalogue.prices.US.market).toBe('US');
    expect(catalogue.publishers.length).toBeGreaterThan(0);
  });

  it('holds the 143 benchmark anchors of plan §4: 116 game rows and 27 creator rows', () => {
    expect(catalogue.gameBenchmarks).toHaveLength(116);
    expect(catalogue.creatorBenchmarks).toHaveLength(27);
  });

  it('writes minified JSON that reads back as the same catalogue', () => {
    expect(built.json).not.toContain('\n');
    expect(JSON.parse(built.json)).toEqual(catalogue);
    expect(catalogue.schemaVersion).toBe(1);
  });

  it('names the file after the SHA-256 of its content', () => {
    const digest = createHash('sha256').update(built.json).digest('hex');
    expect(built.fileName).toBe(`catalogue-${digest.slice(0, 16)}.json`);
    expect(catalogueFileName(built.json)).toBe(built.fileName);
  });

  it('records the SHA-256 of the data files it was built from', () => {
    expect(catalogue.dataHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: the same files give the same bytes', () => {
    expect(buildCatalogue(texts, TODAY).json).toBe(built.json);
  });

  it('changes its data hash and file name when any data changes', () => {
    const edited = withEdit(DATA_PATHS.specs.cpu, (json) => {
      const items = json.items as { name: string }[];
      const first = items[0];
      if (first) first.name = `${first.name} `;
    });
    // A trailing space is still valid data, so the build passes and only the bytes change.
    const again = buildCatalogue(edited, TODAY);
    expect(again.catalogue.dataHash).not.toBe(catalogue.dataHash);
    expect(again.fileName).not.toBe(built.fileName);
  });
});

describe('buildCatalogue, on bad data', () => {
  it('fails with every validation error, so a bad file can never ship', () => {
    const broken = withEdit(DATA_PATHS.specs.cpu, (json) => {
      const items = json.items as Record<string, unknown>[];
      if (items[0]) delete items[0].socket;
    });
    expect(() => buildCatalogue(broken, TODAY)).toThrow(CatalogueError);
    try {
      buildCatalogue(broken, TODAY);
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogueError);
      const { issues } = error as CatalogueError;
      expect(issues.some((issue) => issue.includes('data/parts/cpu.json'))).toBe(true);
      expect((error as Error).message).toMatch(/^The catalogue has \d+ validation errors?:/);
    }
  });

  it('names a file that is not valid JSON', () => {
    const broken = { ...texts, [DATA_PATHS.games]: '{ "schemaVersion": 1,' };
    expect(() => buildCatalogue(broken, TODAY)).toThrow(
      new CatalogueError([`${DATA_PATHS.games}: not valid JSON`]),
    );
  });

  it('names a missing file', () => {
    const { [DATA_PATHS.prices.SA]: _missing, ...rest } = texts;
    expect(() => buildCatalogue(rest, TODAY)).toThrow(/data\/prices\/sa\.json/);
  });
});
