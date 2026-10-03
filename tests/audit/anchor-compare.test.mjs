/**
 * Tests for tests/audit/anchor-compare.mjs (check C, stage 2). Each scenario is a small anchor
 * file, its blind key list from anchor-keys, and a transcription, with one planted defect or one
 * documented convention. Real part names, as in the catalogue.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { buildKeyList, rowsOf } from './anchor-keys.mjs';
import { compare, CompareInputError, printedDecimals } from './anchor-compare.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'anchor-compare.mjs');
const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const PAGE = 'https://reviews.example/cpus/page-18';
function gameRow(overrides = {}) {
  return {
    id: 'g-1',
    gameId: 'game-a',
    limiter: 'cpu',
    testSystem: {
      cpu: { name: 'Intel Core Ultra 9 285K (stock)', catalogueId: 'intel-core-ultra-9-285k' },
      gpu: {
        chipName: 'GeForce RTX 5090',
        chipId: 'nvidia-geforce-rtx-5090',
        card: 'NVIDIA GeForce RTX 5090 Founders Edition',
        cardId: 'nvidia-geforce-rtx-5090-founders-edition',
      },
      ram: '2 x 16 GB DDR5-6000',
      motherboard: null,
      os: 'Windows 11',
      gpuDriver: null,
    },
    gameVersion: null,
    scene: null,
    resolution: '1920x1080',
    preset: 'High',
    rayTracing: 'off',
    upscaling: { method: 'native', mode: null, version: null },
    frameGeneration: 'off',
    avgFps: 145.6,
    onePercentLowFps: 59,
    publishedAt: '2026-01-28',
    sources: [
      {
        url: PAGE,
        publisher: 'example',
        retrievedAt: '2026-09-30',
        docType: 'review',
        fields: ['avgFps', 'onePercentLowFps', 'resolution', 'preset', 'rayTracing', 'scene'],
        title: 'A CPU review',
        locator: 'Chart "Game A, 1080p"',
      },
      {
        url: 'https://reviews.example/cpus/setup',
        publisher: 'example',
        retrievedAt: '2026-09-30',
        docType: 'review',
        fields: ['testSystem', 'upscaling', 'frameGeneration', 'publishedAt'],
        title: 'Test setup',
      },
    ],
    notes: [
      {
        field: 'upscaling',
        text: 'The review mentions no upscaling or frame generation; recorded as native.',
      },
    ],
    ...overrides,
  };
}
const CREATOR_PAGE = 'https://opendata.example/benchmarks/query/';
function creatorRow(overrides = {}) {
  return {
    id: 'c-1',
    app: 'cinebench-2024',
    appVersion: '2024',
    test: 'multi-core',
    device: 'cpu',
    backend: null,
    subject: { type: 'cpu', cpuId: 'intel-core-ultra-9-285k' },
    score: 2448,
    unit: 'points',
    aggregate: null,
    testSystem: { cpu: 'Intel Core Ultra 9 285K', gpu: null, ram: '2 x 16 GB', os: 'Windows 11' },
    publishedAt: '2026-09-30',
    sources: [
      {
        url: CREATOR_PAGE,
        publisher: 'example',
        retrievedAt: '2026-09-30',
        docType: 'dataset',
        fields: [
          'app',
          'appVersion',
          'test',
          'device',
          'score',
          'unit',
          'testSystem',
          'publishedAt',
        ],
        title: 'A database',
      },
    ],
    notes: [
      {
        field: 'publishedAt',
        text: 'A live database has no publication date; this is the date it was read.',
      },
    ],
    ...overrides,
  };
}
const CATALOGUE = {
  cpu: new Map([
    [
      'intel-core-ultra-9-285k',
      { id: 'intel-core-ultra-9-285k', name: 'Intel Core Ultra 9 Processor 285K' },
    ],
  ]),
  'gpu-chip': new Map([
    ['nvidia-geforce-rtx-5090', { id: 'nvidia-geforce-rtx-5090', name: 'GeForce RTX 5090' }],
  ]),
  'gpu-card': new Map([
    [
      'nvidia-geforce-rtx-5090-founders-edition',
      {
        id: 'nvidia-geforce-rtx-5090-founders-edition',
        name: 'GeForce RTX 5090 Founders Edition',
        chipId: 'nvidia-geforce-rtx-5090',
      },
    ],
  ]),
};
const files = (game = [], creator = []) => [
  { file: 'data/benchmarks/game.json', json: { schemaVersion: 1, items: game } },
  { file: 'data/benchmarks/creator.json', json: { schemaVersion: 1, items: creator } },
];

const v = (verdict, source = null) => ({ verdict, source, locator: 'page', capture: 'captures/x' });
const GAME_VERDICTS = {
  gameId: v('MATCH', 'Game A'),
  limiter: v('NOT STATED'),
  resolution: v('MATCH', '1920x1080'),
  preset: v('MATCH', 'High'),
  rayTracing: v('MATCH', 'no RT'),
  'upscaling.method': v('NOT STATED'),
  'upscaling.mode': v('NOT STATED'),
  'upscaling.version': v('NOT STATED'),
  frameGeneration: v('NOT STATED'),
  scene: v('NOT STATED'),
  gameVersion: v('NOT STATED'),
  publishedAt: v('MATCH', 'January 28, 2026'),
  'testSystem.cpu.name': v('MATCH', 'Core Ultra 9 285K'),
  'testSystem.gpu.chipName': v('MATCH', 'RTX 5090'),
  'testSystem.gpu.card': v('MATCH', 'RTX 5090 Founders Edition'),
  'testSystem.ram': v('MATCH', '2x 16 GB DDR5-6000'),
  'testSystem.motherboard': v('NOT STATED'),
  'testSystem.os': v('MATCH', 'Windows 11'),
  'testSystem.gpuDriver': v('NOT STATED'),
};
const printed = (value, printedAs) => ({
  value,
  printedAs,
  how: 'printed',
  locator: 'bar',
  capture: 'c',
});
function gameTranscript(row = {}) {
  return {
    id: 'g-1',
    values: { avgFps: printed(145.6, '145.6'), onePercentLowFps: printed(59, '59,0') },
    conditions: { ...GAME_VERDICTS },
    unverifiable: null,
    ...row,
  };
}
function creatorTranscript(row = {}) {
  return {
    id: 'c-1',
    values: { score: printed(2448, '2448') },
    conditions: {
      app: v('MATCH', 'Cinebench 2024'),
      appVersion: v('MATCH', 'Cinebench 2024'),
      test: v('MATCH', 'Multi-Core'),
      device: v('MATCH', 'CPU'),
      backend: v('NOT STATED'),
      subject: v('MATCH', 'Core Ultra 9 285K'),
      unit: v('NOT STATED'),
      aggregate: v('NOT STATED'),
      'testSystem.cpu': v('MATCH', 'Core Ultra 9 285K'),
      'testSystem.gpu': v('NOT STATED'),
      'testSystem.ram': v('MATCH', '2x 16 GB'),
      'testSystem.os': v('MATCH', 'Windows 11'),
      publishedAt: v('NOT STATED'),
    },
    unverifiable: null,
    ...row,
  };
}

/** Builds the key list from the rows as given, then compares a transcription with `data`. */
function run({ game = [], creator = [], data, rows, shared, resolutions, review = PAGE }) {
  const keyRows = rowsOf(files(game, creator));
  const { list } = buildKeyList(keyRows, review);
  const dataRows = data ? rowsOf(files(data.game ?? game, data.creator ?? creator)) : keyRows;
  return compare({
    transcribed: { keyListSha256: 'k', rows, shared },
    keyList: list,
    keyListSha256: 'k',
    rows: dataRows,
    catalogue: CATALOGUE,
    resolutions,
  });
}
const outcomeOf = (r, field, id = 'g-1') =>
  r.records.find((x) => x.record === id && x.field === field);

describe('a clean transcription', () => {
  it('passes: printed values at their precision, exempt fields, nulls, conventions and the catalogue', () => {
    const r = run({ game: [gameRow()], rows: [gameTranscript()] });
    expect(r.defects).toEqual([]);
    expect(r.ok).toBe(true);
    expect(outcomeOf(r, 'onePercentLowFps').outcome).toBe('MATCH');
    expect(outcomeOf(r, 'limiter').outcome).toBe('EXEMPT');
    expect(outcomeOf(r, 'scene').outcome).toBe('NULL OK');
    expect(outcomeOf(r, 'upscaling.method')).toMatchObject({
      outcome: 'MATCH',
      convention: 'absence',
    });
    expect(outcomeOf(r, 'frameGeneration')).toMatchObject({
      outcome: 'MATCH',
      convention: 'absence',
    });
    expect(outcomeOf(r, 'testSystem.cpu.catalogueId')).toMatchObject({ outcome: 'MATCH' });
    expect(outcomeOf(r, 'testSystem.gpu.cardId')).toMatchObject({ outcome: 'MATCH' });
  });

  it('reads a printed number in both decimal conventions', () => {
    expect(printedDecimals('145,6', 145.6)).toBe(1);
    expect(printedDecimals('59,0', 59)).toBe(1);
    expect(printedDecimals('2.448', 2448)).toBe(0);
    expect(printedDecimals('16052.86', 16052.86)).toBe(2);
    expect(printedDecimals('145,6', 146)).toBeNull();
  });
});

describe('planted defects in values', () => {
  it.each([
    [
      'a printed value that differs',
      { avgFps: printed(145.4, '145.4') },
      'avgFps',
      'MISMATCH',
      'Blocker',
    ],
    [
      'data more precise than the print',
      { avgFps: printed(146, '146') },
      'avgFps',
      'MISMATCH',
      'Blocker',
    ],
    [
      'a value the source does not publish',
      { onePercentLowFps: { value: null, printedAs: null, how: 'not published' } },
      'onePercentLowFps',
      'NOT COVERED',
      'Blocker',
    ],
    [
      'a chart reading outside ±1% or ±1 unit',
      { avgFps: { value: 143, how: 'chart' } },
      'avgFps',
      'MISMATCH',
      'Blocker',
    ],
    [
      'a chart reading the row does not mark as one',
      { avgFps: { value: 146, how: 'chart' } },
      'avgFps',
      'CHART NOT MARKED',
      'Major',
    ],
  ])('%s', (_, values, field, outcome, severity) => {
    const t = gameTranscript({ values: { ...gameTranscript().values, ...values } });
    const r = run({ game: [gameRow()], rows: [t] });
    expect(outcomeOf(r, field)).toMatchObject({ outcome, severity });
    expect(r.ok).toBe(false);
  });

  it('a chart reading within tolerance, which the row marks, is a MATCH', () => {
    const row = gameRow({
      notes: [...gameRow().notes, { field: 'avgFps', text: 'Read off the chart.' }],
    });
    const t = gameTranscript({
      values: { ...gameTranscript().values, avgFps: { value: 146, how: 'chart' } },
    });
    expect(outcomeOf(run({ game: [row], rows: [t] }), 'avgFps').outcome).toBe('MATCH');
  });

  it('a value the data leaves null but the source prints is NULL BUT PUBLISHED, a Major', () => {
    const r = run({ game: [gameRow({ onePercentLowFps: null })], rows: [gameTranscript()] });
    expect(outcomeOf(r, 'onePercentLowFps')).toMatchObject({
      outcome: 'NULL BUT PUBLISHED',
      severity: 'Major',
    });
  });
});

describe('planted defects in conditions', () => {
  const withVerdicts = (conditions) =>
    gameTranscript({ conditions: { ...GAME_VERDICTS, ...conditions } });
  it.each([
    [
      'a contradicted condition',
      { preset: v('MISMATCH', 'Ultra') },
      'preset',
      'MISMATCH',
      'Blocker',
    ],
    [
      'a condition the source does not state',
      { preset: v('NOT STATED') },
      'preset',
      'NOT COVERED',
      'Blocker',
    ],
    [
      'a null condition the source states',
      { scene: v('MISMATCH', 'Built-in benchmark') },
      'scene',
      'NULL BUT PUBLISHED',
      'Blocker',
    ],
    [
      'an exempt field the source contradicts',
      { limiter: v('MISMATCH', 'GPU-limited') },
      'limiter',
      'MISMATCH',
      'Blocker',
    ],
    ['an unreachable source', { preset: v('UNVERIFIABLE') }, 'preset', 'UNVERIFIABLE', 'Major'],
  ])('%s', (_, conditions, field, outcome, severity) => {
    const r = run({ game: [gameRow()], rows: [withVerdicts(conditions)] });
    expect(outcomeOf(r, field)).toMatchObject({ outcome, severity });
  });

  it('a null claim the source confirms as none is NULL OK', () => {
    const r = run({
      game: [gameRow()],
      rows: [withVerdicts({ scene: v('MATCH', 'no scene named') })],
    });
    expect(outcomeOf(r, 'scene').outcome).toBe('NULL OK');
  });

  it('applies a shared verdict only to rows with the same claim', () => {
    const t = gameTranscript();
    delete t.conditions['testSystem.ram'];
    const shared = {
      'testSystem.ram': { claim: '2 x 16 GB DDR5-6000', ...v('MATCH', '2x 16 GB') },
    };
    expect(outcomeOf(run({ game: [gameRow()], rows: [t], shared }), 'testSystem.ram').outcome).toBe(
      'MATCH',
    );
    const otherClaim = { 'testSystem.ram': { claim: '2 x 24 GB DDR5-6000', ...v('MATCH', 'x') } };
    expect(() => run({ game: [gameRow()], rows: [t], shared: otherClaim })).toThrow(
      /no verdict for testSystem\.ram/,
    );
  });

  it('marks every field of a row the worker could not reach as UNVERIFIABLE', () => {
    const r = run({
      game: [gameRow()],
      rows: [gameTranscript({ unverifiable: 'bot check, archive missing' })],
    });
    expect(r.records.filter((x) => x.outcome === 'UNVERIFIABLE').length).toBeGreaterThan(10);
  });
});

describe('the documented conventions, and only with their notes', () => {
  it('absence: native upscaling with no note is NOT COVERED', () => {
    const r = run({ game: [gameRow({ notes: [] })], rows: [gameTranscript()] });
    expect(outcomeOf(r, 'upscaling.method').outcome).toBe('NOT COVERED');
    expect(outcomeOf(r, 'frameGeneration').outcome).toBe('NOT COVERED');
  });

  it('absence: ray tracing "off", noted, when the source names none', () => {
    const notes = [
      ...gameRow().notes,
      { field: 'rayTracing', text: 'The review names no ray tracing; recorded as off.' },
    ];
    const t = gameTranscript({ conditions: { ...GAME_VERDICTS, rayTracing: v('NOT STATED') } });
    expect(outcomeOf(run({ game: [gameRow({ notes })], rows: [t] }), 'rayTracing')).toMatchObject({
      outcome: 'MATCH',
      convention: 'absence',
    });
    expect(outcomeOf(run({ game: [gameRow()], rows: [t] }), 'rayTracing').outcome).toBe(
      'NOT COVERED',
    );
  });

  it("read date: a live database's publishedAt equal to its retrievedAt, with its note", () => {
    const ok = run({ creator: [creatorRow()], rows: [creatorTranscript()], review: CREATOR_PAGE });
    expect(outcomeOf(ok, 'publishedAt', 'c-1')).toMatchObject({
      outcome: 'MATCH',
      convention: 'read date',
    });
    const later = run({
      creator: [creatorRow({ publishedAt: '2026-10-01' })],
      rows: [creatorTranscript()],
      review: CREATOR_PAGE,
    });
    expect(outcomeOf(later, 'publishedAt', 'c-1').outcome).toBe('NOT COVERED');
  });

  it("validator unit: Cinebench's points, never another unit", () => {
    const ok = run({ creator: [creatorRow()], rows: [creatorTranscript()], review: CREATOR_PAGE });
    expect(outcomeOf(ok, 'unit', 'c-1')).toMatchObject({
      outcome: 'MATCH',
      convention: 'validator unit',
    });
    expect(ok.ok).toBe(true);
    const wrong = run({
      creator: [creatorRow({ unit: 'samples-per-minute' })],
      rows: [creatorTranscript()],
      review: CREATOR_PAGE,
    });
    expect(outcomeOf(wrong, 'unit', 'c-1').outcome).toBe('NOT COVERED');
  });
});

describe('the catalogue ids, which the worker never sees', () => {
  const ts = (patch) => ({ ...gameRow().testSystem, ...patch });
  it.each([
    [
      'an id that is not in the catalogue',
      { cpu: { name: 'Intel Core Ultra 9 285K', catalogueId: 'not-a-catalogue-cpu' } },
      'testSystem.cpu.catalogueId',
    ],
    [
      'an id that names another part',
      { cpu: { name: 'AMD Ryzen 7 9800X3D', catalogueId: 'intel-core-ultra-9-285k' } },
      'testSystem.cpu.catalogueId',
    ],
    [
      "a card whose chip is not the row's",
      {
        gpu: {
          ...gameRow().testSystem.gpu,
          chipId: 'nvidia-geforce-rtx-5080',
          chipName: 'GeForce RTX 5090',
        },
      },
      'testSystem.gpu.cardId',
    ],
  ])('%s is a MAPPING Blocker', (_, patch, field) => {
    const r = run({ game: [gameRow({ testSystem: ts(patch) })], rows: [gameTranscript()] });
    expect(r.defects.some((d) => d.field === field && d.outcome === 'MAPPING')).toBe(true);
  });
});

describe('resolutions: reviewed judgements, which must still fit', () => {
  const drift = (from = 'MISMATCH') => ({
    record: 'g-1',
    field: 'avgFps',
    from,
    outcome: 'MATCH',
    why: 'a live source moved on after retrievedAt',
    evidence: 'a capture of the source at retrievedAt, with its SHA-256',
  });
  const moved = () =>
    gameTranscript({ values: { ...gameTranscript().values, avgFps: printed(145.4, '145.4') } });

  it('turns the reviewed outcome, and keeps what it replaced', () => {
    const r = run({ game: [gameRow()], rows: [moved()], resolutions: [drift()] });
    expect(r.ok).toBe(true);
    expect(outcomeOf(r, 'avgFps')).toMatchObject({ outcome: 'MATCH', resolvedFrom: 'MISMATCH' });
    expect(r.summary.resolved).toBe(1);
  });

  it.each([
    ['one whose finding changed', () => [drift('NOT COVERED')], /is MISMATCH now, not NOT COVERED/],
    [
      'one for a field that is not compared',
      () => [{ ...drift(), field: 'score' }],
      /is not compared/,
    ],
    [
      'one without its evidence',
      () => [{ ...drift(), evidence: '' }],
      /needs a "why" and its "evidence"/,
    ],
  ])('refuses %s', (_, make, message) => {
    expect(() => run({ game: [gameRow()], rows: [moved()], resolutions: make() })).toThrow(message);
  });
});

describe('a key list or transcription that does not fit', () => {
  it('refuses a transcription made from another key list', () => {
    const keyRows = rowsOf(files([gameRow()]));
    const { list } = buildKeyList(keyRows, PAGE);
    expect(() =>
      compare({
        transcribed: { keyListSha256: 'other', rows: [gameTranscript()] },
        keyList: list,
        keyListSha256: 'k',
        rows: keyRows,
        catalogue: CATALOGUE,
      }),
    ).toThrow(CompareInputError);
  });

  it('refuses data that changed since the key list was built', () => {
    expect(() =>
      run({
        game: [gameRow()],
        data: { game: [gameRow({ preset: 'Ultra' })] },
        rows: [gameTranscript()],
      }),
    ).toThrow(/changed since the key list was built/);
  });

  it("refuses a printedAs that doesn't read as the worker's value", () => {
    const t = gameTranscript({
      values: { ...gameTranscript().values, avgFps: printed(145.6, '154,6') },
    });
    expect(() => run({ game: [gameRow()], rows: [t] })).toThrow(/does not read as 145\.6/);
  });
});

describe('the command line', () => {
  function setup({ transcriptRows }) {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'anchor-compare-'));
    temp.push(dir);
    mkdirSync(path.join(dir, 'data', 'benchmarks'), { recursive: true });
    mkdirSync(path.join(dir, 'data', 'parts'), { recursive: true });
    for (const { file, json } of files([gameRow()]))
      writeFileSync(path.join(dir, file), JSON.stringify(json));
    for (const [name, map] of Object.entries(CATALOGUE))
      writeFileSync(
        path.join(dir, 'data', 'parts', `${name}.json`),
        JSON.stringify({ items: [...map.values()] }),
      );
    const { list } = buildKeyList(rowsOf(files([gameRow()])), PAGE);
    const keyText = `${JSON.stringify(list, null, 2)}\n`;
    writeFileSync(path.join(dir, 'key-list.json'), keyText);
    const sha = createHash('sha256').update(keyText).digest('hex');
    writeFileSync(
      path.join(dir, 'transcribed.json'),
      JSON.stringify({ keyListSha256: sha, rows: transcriptRows }),
    );
    return dir;
  }
  const cli = (dir, extra = []) =>
    spawnSync(
      process.execPath,
      [
        CLI,
        '--transcribed',
        path.join(dir, 'transcribed.json'),
        '--key-list',
        path.join(dir, 'key-list.json'),
        '--repo-root',
        dir,
        ...extra,
      ],
      { encoding: 'utf8', timeout: 30_000 },
    );

  it('exits 0 on a clean transcription, and writes the records with each input', () => {
    const dir = setup({ transcriptRows: [gameTranscript()] });
    const r = cli(dir, ['--json', path.join(dir, 'stage2.json')]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/PASS/);
    const out = JSON.parse(readFileSync(path.join(dir, 'stage2.json'), 'utf8'));
    expect(out.inputs.keyList.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(out.records.length).toBeGreaterThan(20);
  });

  it('exits 1 on a defect, naming it', () => {
    const t = gameTranscript({ conditions: { ...GAME_VERDICTS, preset: v('MISMATCH', 'Ultra') } });
    const r = cli(setup({ transcriptRows: [t] }));
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/Blocker MISMATCH: g-1 preset/);
  });

  it('exits 2 when it cannot compare', () => {
    expect(cli(setup({ transcriptRows: [] })).status).toBe(2);
    const clean = setup({ transcriptRows: [gameTranscript()] });
    expect(cli(clean, ['--resolutions', path.join(clean, 'missing.json')]).status).toBe(2);
  });
});
