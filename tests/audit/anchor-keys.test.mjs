/**
 * Tests for tests/audit/anchor-keys.mjs (brief C, the blind key list). The leak scenarios are small
 * anchor files built here, each planting one way a value could reach the worker. The real anchor
 * files are only partitioned into reviews: building their lists runs on each WP-D2 batch, by
 * qa-lead, so a new data field stops the tool there and never turns data-lead's verify red.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  buildKeyList,
  DEFAULT_ANCHORS,
  givesAway,
  keyEntry,
  KeyInputError,
  listReviews,
  numbersIn,
  parsePart,
  readingsOf,
  reviewKey,
  rowsOf,
  VALUE_FIELDS,
} from './anchor-keys.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const CLI = path.join(HERE, 'anchor-keys.mjs');
const NBSP = String.fromCharCode(0xa0);

const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const PAGE = 'https://reviews.example/gpus/page-4';
function gameRow(id, { url = PAGE, avgFps = 145.6, low = 126.2, locator, notes = [] } = {}) {
  return {
    id,
    gameId: 'game-a',
    limiter: 'gpu',
    testSystem: {
      cpu: { name: 'CPU X (stock)', catalogueId: null },
      gpu: { chipName: 'GPU Y', chipId: null, card: null, cardId: null },
      ram: '2 x 16 GB DDR5-6000 30-38-38-96',
      motherboard: null,
      os: null,
      gpuDriver: 'Adrenalin 26.3.1',
    },
    gameVersion: null,
    scene: null,
    resolution: '2560x1440',
    preset: 'High',
    rayTracing: 'off',
    upscaling: { method: 'native', mode: null, version: null },
    frameGeneration: 'off',
    avgFps,
    onePercentLowFps: low,
    publishedAt: '2026-05-06',
    sources: [
      {
        url,
        publisher: 'example',
        retrievedAt: '2026-09-30',
        docType: 'review',
        fields: ['avgFps', 'onePercentLowFps', 'resolution'],
        title: 'GPUs in 2026',
        locator: locator ?? 'Chart "Game A, 2.560 × 1.440", image 14 of 22',
      },
    ],
    notes,
  };
}
function creatorRow(id, { score = 16066.37, notes = [] } = {}) {
  return {
    id,
    app: 'blender',
    appVersion: '5.2.0',
    test: 'monster',
    device: 'gpu',
    backend: 'optix',
    subject: { type: 'gpu', chipId: 'gpu-y' },
    score,
    unit: 'samples per minute',
    aggregate: 'median',
    testSystem: { cpu: null, gpu: 'GPU Y', ram: null, os: null },
    publishedAt: '2026-08-01',
    sources: [
      {
        url: 'https://opendata.example/benchmarks/query/?compute_type=OPTIX',
        publisher: 'blender',
        retrievedAt: '2026-09-30',
        docType: 'dataset',
        fields: ['score'],
        title: 'Blender Open Data',
      },
    ],
    notes,
  };
}
const files = (game, creator = []) => [
  { file: 'data/benchmarks/game.json', json: { schemaVersion: 1, items: game } },
  { file: 'data/benchmarks/creator.json', json: { schemaVersion: 1, items: creator } },
];
const note = (text, field) => (field ? { field, text } : { text });
const leaksIn = (game, creator = [], review = PAGE, options) =>
  buildKeyList(rowsOf(files(game, creator)), review, options).leaks;

describe('reading the numbers printed in a text', () => {
  it('reads both decimal marks, thousands groups, and a no-break space', () => {
    expect(readingsOf('145,6')).toContainEqual({ n: 145.6, decimals: 1 });
    expect(readingsOf('2.448')).toEqual(
      expect.arrayContaining([
        { n: 2.448, decimals: 3 },
        { n: 2448, decimals: 0 },
      ]),
    );
    expect(readingsOf(`5${NBSP}798,32`)).toContainEqual({ n: 5798.32, decimals: 2 });
  });

  it('skips times, dates, ranges, dotted versions and numbers glued to a word', () => {
    const tokens = (t) => numbersIn(t).map((x) => x.token);
    expect(tokens('updated 2026-06-24T21:35:42Z')).toEqual([]);
    expect(tokens('DDR5-6000 30-38-38-96, Adrenalin 26.3.1, Blender 5.2.0')).toEqual([]);
    expect(tokens('the B580 and an R5 chip')).toEqual([]);
    expect(tokens('image 14 of 22, from 16066.367391397402')).toEqual([
      '14',
      '22',
      '16066.367391397402',
    ]);
  });

  it.each([
    ['a finer print that rounds to the value, up', 16066.367391397402, 12, 16066.37, true],
    ['a finer print that rounds to the value, down', 5798.320400580914, 12, 5798.32, true],
    ['the value as printed', 145.6, 1, 145.6, true],
    ['the value rounded, keeping a decimal', 5798.3, 1, 5798.32, true],
    ['the value rounded to 4 digits', 5798, 0, 5798.32, true],
    ['a whole value, printed with a decimal', 14.4, 1, 14, true],
    ['a 2-digit rounding of a decimal value', 33, 0, 33.1, false],
    ['another number', 145.4, 1, 145.6, false],
  ])('%s: %s (%s decimals) gives %s away: %s', (_, n, decimals, value, expected) => {
    expect(givesAway({ n, decimals }, value)).toBe(expected);
  });
});

describe('an entry holds claims, never values', () => {
  it('keeps every condition and source, and no value field', () => {
    const [r] = rowsOf(files([gameRow('g-1')]));
    const entry = keyEntry(r);
    for (const field of VALUE_FIELDS) expect(entry).not.toHaveProperty(field);
    expect(entry).toMatchObject({ kind: 'game', id: 'g-1', resolution: '2560x1440' });
    expect(entry.sources[0].locator).toContain('image 14 of 22');
    entry.testSystem.gpu.chipName = 'changed';
    expect(r.row.testSystem.gpu.chipName).toBe('GPU Y');
  });

  it.each([
    ['a row', (row) => ({ ...row, avgFpsRounded: 146 }), 'avgFpsRounded'],
    [
      'a source',
      (row) => ({ ...row, sources: [{ ...row.sources[0], fpsShown: 145.6 }] }),
      'fpsShown',
    ],
    ['a note', (row) => ({ ...row, notes: [{ text: 'x', fps: 145.6 }] }), 'fps'],
  ])('stops on a field it does not know, in %s', (_, plant, field) => {
    const [r] = rowsOf(files([plant(gameRow('g-1'))]));
    expect(() => keyEntry(r)).toThrow(KeyInputError);
    expect(() => keyEntry(r)).toThrow(field);
  });
});

describe('source reviews', () => {
  it('are the first source page without its query: the backend queries are one review', () => {
    const rows = rowsOf(
      files(
        [gameRow('g-1'), gameRow('g-2', { url: `${PAGE}?page=2#chart` })],
        [creatorRow('c-1'), creatorRow('c-2')],
      ),
    );
    expect(listReviews(rows)).toEqual([
      { review: PAGE, rows: 2, kinds: ['game'] },
      { review: 'https://opendata.example/benchmarks/query/', rows: 2, kinds: ['creator'] },
    ]);
    expect(reviewKey(`${PAGE}?a=1`)).toBe(PAGE);
  });

  it('refuse a duplicate id or a row with no source', () => {
    expect(() => rowsOf(files([gameRow('g-1'), gameRow('g-1')]))).toThrow('listed twice');
    expect(() => rowsOf(files([{ ...gameRow('g-1'), sources: [] }]))).toThrow('no sources');
  });

  it('split with --part into parts that cover the review once', () => {
    const rows = rowsOf(files(['a', 'b', 'c', 'd', 'e'].map((id) => gameRow(id))));
    const ids = (i) =>
      buildKeyList(rows, PAGE, { part: parsePart(`${i}/2`) }).list.keys.map((k) => k.id);
    expect([...ids(1), ...ids(2)]).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(() => parsePart('3/2')).toThrow(KeyInputError);
    expect(() => buildKeyList(rows, 'https://other.example/')).toThrow('no anchor row');
  });

  it('partition the real anchor files: each row in exactly one review', () => {
    const real = DEFAULT_ANCHORS.map((file) => ({
      file,
      json: JSON.parse(readFileSync(path.join(REPO, file), 'utf8')),
    }));
    const rows = rowsOf(real);
    const reviews = listReviews(rows);
    expect(reviews.reduce((sum, r) => sum + r.rows, 0)).toBe(
      real.reduce((sum, f) => sum + f.json.items.length, 0),
    );
    expect(new Set(reviews.map((r) => r.review)).size).toBe(reviews.length);
  });
});

describe('planted leaks', () => {
  it("a note printing the row's own value, in German", () => {
    const leaks = leaksIn([gameRow('g-1', { notes: [note('ComputerBase shows 145,6 FPS.')] })]);
    expect(leaks).toMatchObject([
      {
        id: 'g-1',
        where: 'notes[0].text',
        value: { id: 'g-1', field: 'avgFps', printed: '145,6' },
      },
    ]);
  });

  it("a note printing another row's value", () => {
    const leaks = leaksIn([
      gameRow('g-1', { notes: [note('g-2 leads (33.1 fps).', 'avgFps')] }),
      gameRow('g-2', { avgFps: 33.1, low: 20.4 }),
    ]);
    expect(leaks.map((l) => l.value.id)).toEqual(['g-2']);
  });

  it('a note printing a finer value that rounds up to the stored one', () => {
    const leaks = leaksIn(
      [],
      [creatorRow('c-1', { notes: [note('Median, rounded from 16066.367391397402.', 'score')] })],
      'https://opendata.example/benchmarks/query/',
    );
    expect(leaks).toHaveLength(1);
  });

  it("a locator printing the row's own value", () => {
    const leaks = leaksIn([gameRow('g-1', { locator: 'bar "GPU Y: 145.6 fps"' })]);
    expect(leaks.map((l) => l.where)).toEqual(['sources[0].locator']);
  });

  it("a locator printing another row's decimal value", () => {
    const leaks = leaksIn([
      gameRow('g-1', { locator: 'Chart "Game A", next to 33.1' }),
      gameRow('g-2', { avgFps: 33.1, low: 20.4 }),
    ]);
    expect(leaks.map((l) => [l.id, l.value.id])).toEqual([['g-1', 'g-2']]);
  });

  it("but not a locator's own numbering that equals another row's whole value", () => {
    const g2 = gameRow('g-2', { avgFps: 20.1, low: 14, locator: 'Chart "Game A", image 3 of 22' });
    expect(leaksIn([gameRow('g-1'), g2])).toEqual([]);
  });

  it('nor a time, a range or a version that contains a value', () => {
    const notes = [
      note('Updated 2026-06-24T21:35:42Z.'),
      note('RAM 30-38-38-96, Adrenalin 26.3.1'),
    ];
    expect(leaksIn([gameRow('g-1', { avgFps: 35, low: 26.3, notes })])).toEqual([]);
  });

  it("a part's notes are checked against the whole review's values", () => {
    const rows = rowsOf(
      files([
        gameRow('a', { notes: [note('e shows 33.1.')] }),
        gameRow('b'),
        gameRow('c'),
        gameRow('e', { avgFps: 33.1, low: 20.4 }),
      ]),
    );
    expect(buildKeyList(rows, PAGE, { part: parsePart('1/2') }).leaks).toHaveLength(1);
  });

  it('--drop-leaking-notes withholds a leaking note and says which field it was on', () => {
    const rows = rowsOf(
      files([
        gameRow('g-1', {
          notes: [note('ComputerBase shows 145,6 FPS.', 'avgFps'), note('No game version.')],
        }),
      ]),
    );
    const { list, leaks } = buildKeyList(rows, PAGE, { dropLeakingNotes: true });
    expect(leaks).toEqual([]);
    expect(list.withheldNotes).toBe(1);
    expect(list.keys[0].notes).toEqual([{ text: 'No game version.' }]);
    expect(list.keys[0].withheldNotes).toEqual([{ field: 'avgFps' }]);
  });

  it('but cannot clear a leaking locator', () => {
    const rows = rowsOf(files([gameRow('g-1', { locator: 'bar "GPU Y: 145.6 fps"' })]));
    expect(buildKeyList(rows, PAGE, { dropLeakingNotes: true }).leaks).toHaveLength(1);
  });
});

describe('the command line', () => {
  function repoWith(game, creator = []) {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'anchor-keys-'));
    temp.push(dir);
    mkdirSync(path.join(dir, 'data', 'benchmarks'), { recursive: true });
    for (const { file, json } of files(game, creator))
      writeFileSync(path.join(dir, file), JSON.stringify(json));
    return dir;
  }
  const run = (args) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 30_000 });

  it('lists the reviews, and writes a list with no value, whose SHA-256 it prints', () => {
    const dir = repoWith([gameRow('g-1'), gameRow('g-2', { avgFps: 99.9, low: 80.1 })]);
    const listed = run(['--list', '--repo-root', dir]);
    expect(listed.status).toBe(0);
    expect(listed.stdout).toContain(`   2  game  ${PAGE}`);
    const out = path.join(dir, 'keys', 'page-4.json');
    const built = run(['--review', PAGE, '--out', out, '--repo-root', dir]);
    expect(built.status, built.stderr).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(built.stdout).toContain(createHash('sha256').update(text).digest('hex'));
    for (const value of ['145.6', '126.2', '99.9', '80.1']) expect(text).not.toContain(value);
    expect(JSON.parse(text)).toMatchObject({ review: PAGE, rows: 2, withheldNotes: 0 });
  });

  it('exits 1 and writes nothing when a value leaks', () => {
    const dir = repoWith([gameRow('g-1', { notes: [note('Shows 145.6.')] })]);
    const out = path.join(dir, 'keys.json');
    const r = run(['--review', PAGE, '--out', out, '--repo-root', dir]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('"145.6" is g-1 avgFps');
    expect(existsSync(out)).toBe(false);
    expect(
      run(['--review', PAGE, '--drop-leaking-notes', '--out', out, '--repo-root', dir]).status,
    ).toBe(0);
  });

  it('exits 2 when it cannot build a blind list', () => {
    const dir = repoWith([{ ...gameRow('g-1'), fpsRounded: 146 }]);
    const out = path.join(dir, 'keys.json');
    const unknown = run(['--review', PAGE, '--out', out, '--repo-root', dir]);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('fpsRounded');
    expect(run(['--review', PAGE, '--part', '0/2', '--out', out, '--repo-root', dir]).status).toBe(
      2,
    );
    expect(run(['--review', PAGE, '--repo-root', dir]).status).toBe(2);
  });
});
