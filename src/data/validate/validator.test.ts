import { describe, expect, it } from 'vitest';
import type { SourceRef } from '../schema/common';
import { DATA_PATHS } from '../schema/files';
import { formatIssue, validateFiles, type RuleId } from './index';
import { fixtureData, toFiles, TODAY, type FixtureData } from './test-fixtures';

type Result = ReturnType<typeof validateFiles>;

function run(mutate?: (d: FixtureData) => void, mutateFiles?: (files: Record<string, unknown>) => void): Result {
  const d = fixtureData();
  mutate?.(d);
  const files = toFiles(d);
  mutateFiles?.(files);
  return validateFiles(files, { today: TODAY });
}

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error('fixture list is empty');
  return item;
}

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`fixture list has no item ${String(index)}`);
  return item;
}

function expectRule(result: Result, rule: RuleId): void {
  const rules = result.errors.map((e) => e.rule);
  expect(rules, result.errors.map(formatIssue).join('\n')).toContain(rule);
}

function expectNoRule(result: Result, rule: RuleId): void {
  const hits = result.errors.filter((e) => e.rule === rule).map(formatIssue);
  expect(hits).toEqual([]);
}

function expectClean(result: Result): void {
  expect(result.errors.map(formatIssue)).toEqual([]);
}

const cpu = (d: FixtureData) => first(d.specs.cpu);
const board = (d: FixtureData) => first(d.specs.motherboard);
const card = (d: FixtureData) => first(d.specs['gpu-card']);
const usObs = (d: FixtureData) => first(d.prices.US.observations);
const usGap = (d: FixtureData) => first(d.prices.US.gaps);
const liveRow = (d: FixtureData) => at(d.gameBenchmarks, 0);
const archivedRow = (d: FixtureData) => at(d.gameBenchmarks, 1);
const firstSource = (r: { sources: SourceRef[] }): SourceRef => first(r.sources);

describe('fixture', () => {
  it('is a fully valid dataset', () => {
    expectClean(run());
  });
});

describe('files and schema', () => {
  it('file-missing: a data file that is not there', () => {
    expectRule(run(undefined, (f) => { Reflect.deleteProperty(f, DATA_PATHS.specs.psu); }), 'file-missing');
  });
  it('schema: unknown keys are rejected (strict objects)', () => {
    expectRule(run((d) => { Object.assign(cpu(d), { coreCount: 8 }); }), 'schema');
  });
  it('schema: frame generation never enters the native anchor table', () => {
    expectRule(run((d) => { Object.assign(liveRow(d), { frameGeneration: 'on' }); }), 'schema');
  });
  it('id-kebab: IDs must be kebab-case', () => {
    expectRule(run((d) => { cpu(d).id = 'Fixture_CPU'; }), 'id-kebab');
  });
  it('id-unique: IDs are unique across categories', () => {
    expectRule(run((d) => { board(d).id = 'fx-cpu-am5'; }), 'id-unique');
  });
  it('id-unique: publisher IDs are unique', () => {
    expectRule(run((d) => { d.publishers.push({ id: 'amd', name: 'Dup', kind: 'manufacturer', domains: ['dup.example'] }); }), 'id-unique');
  });
});

describe('publisher registry', () => {
  it('registry: a retailer must list its markets, and only retailers do', () => {
    expectRule(run((d) => { Reflect.deleteProperty(first(d.publishers.filter((p) => p.id === 'shop-us')), 'markets'); }), 'registry');
    expectRule(run((d) => { Object.assign(first(d.publishers), { markets: ['US'] }); }), 'registry');
  });
  it('registry: a domain belongs to one publisher', () => {
    expectRule(run((d) => { d.publishers.push({ id: 'acme-two', name: 'Acme 2', kind: 'manufacturer', domains: ['acme.example'] }); }), 'registry');
  });
  it('publisher-known: every source publisher is registered', () => {
    expectRule(run((d) => { firstSource(cpu(d)).publisher = 'nobody'; }), 'publisher-known');
  });
  it('publisher-domain: the url must be on the publisher domain', () => {
    expectRule(run((d) => { firstSource(cpu(d)).url = 'https://acme.example/not-amd'; }), 'publisher-domain');
    expectNoRule(run((d) => { firstSource(cpu(d)).url = 'https://sub.amd.com/page'; }), 'publisher-domain');
  });
  it('publisher-kind: a manufacturer must be a manufacturer-kind publisher', () => {
    expectRule(run((d) => { card(d).manufacturer = 'shop-us'; }), 'publisher-kind');
  });
});

describe('sources, archives and coverage', () => {
  it('url-is-archive: a spec source url may not be an archive link', () => {
    expectRule(
      run((d) => { firstSource(cpu(d)).url = 'https://web.archive.org/web/20250101000000/https://www.amd.com/en/products/fixture-cpu'; }),
      'url-is-archive',
    );
  });
  it('archive-form: a spec may use a Wayback snapshot of the same page', () => {
    expectClean(
      run((d) => {
        firstSource(cpu(d)).archiveUrl = 'https://web.archive.org/web/20250801000000/https://www.amd.com/en/products/fixture-cpu';
      }),
    );
  });
  it('archive-form: rejects non-Wayback links, other pages and snapshots after retrievedAt', () => {
    expectRule(run((d) => { firstSource(cpu(d)).archiveUrl = 'https://archive.ph/AbCdE'; }), 'archive-form');
    expectRule(
      run((d) => { firstSource(cpu(d)).archiveUrl = 'https://web.archive.org/web/20250801000000/https://www.amd.com/en/products/other'; }),
      'archive-form',
    );
    expectRule(
      run((d) => { firstSource(cpu(d)).archiveUrl = 'https://web.archive.org/web/20261005000000/https://www.amd.com/en/products/fixture-cpu'; }),
      'archive-form',
    );
  });
  it('date-future: no retrievedAt after today', () => {
    expectRule(run((d) => { firstSource(cpu(d)).retrievedAt = '2026-10-01'; }), 'date-future');
  });
  it('coverage: a value no source backs is rejected', () => {
    expectRule(run((d) => { firstSource(cpu(d)).fields = ['cores', 'threads']; }), 'coverage');
    expectClean(run((d) => { firstSource(cpu(d)).fields = ['cores', 'threads']; cpu(d).sources.push({ url: 'https://www.amd.com/x', publisher: 'amd', retrievedAt: TODAY, docType: 'datasheet' }); }));
  });
  it('coverage: a reviewer source does not back a spec', () => {
    expectRule(run((d) => { card(d).sources = [{ url: 'https://bench-a.example/card', publisher: 'bench-a', retrievedAt: TODAY, docType: 'review' }]; }), 'coverage');
  });
  it('null-note: a null value needs a note, unless null means "none"', () => {
    expectRule(run((d) => { Reflect.deleteProperty(cpu(d), 'notes'); }), 'null-note');
    expectClean(run((d) => { cpu(d).igpu = null; cpu(d).boxCooler = null; }));
  });
  it('field-path: fields and note paths must exist', () => {
    expectRule(run((d) => { firstSource(cpu(d)).fields = ['coreCount']; }), 'field-path');
    expectRule(run((d) => { cpu(d).notes = [{ field: 'power.ppt', text: 'typo' }]; }), 'field-path');
  });
  it('spec-retailer-only: a spec record sourced only from retailers is rejected', () => {
    expectRule(run((d) => { card(d).sources = [{ url: 'https://shop-us.example/p/fx-card', publisher: 'shop-us', retrievedAt: TODAY, docType: 'product-page' }]; }), 'spec-retailer-only');
  });
  it('spec-own-manufacturer: a spec needs a source from its own manufacturer', () => {
    expectRule(run((d) => { card(d).sources = [{ url: 'https://www.amd.com/card', publisher: 'amd', retrievedAt: TODAY, docType: 'spec-page' }]; }), 'spec-own-manufacturer');
  });
  it('doc-type: BIOS support needs the CPU support list, lane sharing needs the manual', () => {
    expectRule(run((d) => { at(board(d).sources, 1).docType = 'spec-page'; }), 'doc-type');
    expectRule(run((d) => { at(board(d).sources, 2).docType = 'spec-page'; }), 'doc-type');
  });
});

describe('references and boards', () => {
  it('ref: cards point at real chips', () => {
    expectRule(run((d) => { card(d).chipId = 'no-such-chip'; }), 'ref');
  });
  it('ref: prices point at purchasable parts', () => {
    expectRule(run((d) => { usObs(d).partId = 'fx-chip'; }), 'ref');
  });
  it('ref: benchmarks point at real games, CPUs, chips and cards', () => {
    expectRule(run((d) => { liveRow(d).gameId = 'no-such-game'; }), 'ref');
    expectRule(run((d) => { liveRow(d).testSystem.gpu.cardId = 'no-such-card'; }), 'ref');
  });
  it('ref-slot: lane-sharing rules point at real slots on the board', () => {
    expectRule(run((d) => { at(board(d).laneSharing, 0).trigger.slot = 'm2-9'; }), 'ref-slot');
    expectRule(run((d) => { at(board(d).laneSharing, 0).effects = [{ type: 'disables', slots: ['sata-9'] }]; }), 'ref-slot');
    expectRule(run((d) => { at(board(d).sataPorts, 1).id = 'sata-1'; }), 'ref-slot');
  });
  it('bios-coverage: every catalogue CPU on the socket has a BIOS row', () => {
    expectRule(run((d) => { board(d).biosSupport.cpus = []; }), 'bios-coverage');
    expectRule(
      run((d) => { board(d).biosSupport.families = [{ family: 'ryzen-7000', minBiosVersion: null, statement: 'all' }]; }),
      'bios-coverage',
    );
  });
  it('sanity: a BIOS row has a version exactly when it is listed "since" one', () => {
    expectRule(run((d) => { first(board(d).biosSupport.cpus).minBiosVersion = null; }), 'sanity');
    expectClean(run((d) => { Object.assign(first(board(d).biosSupport.cpus), { listing: 'all', minBiosVersion: null, asListed: 'all' }); }));
  });
});

describe('sanity', () => {
  it('threads >= cores and boost >= base', () => {
    expectRule(run((d) => { cpu(d).threads = 4; }), 'sanity');
    expectRule(run((d) => { cpu(d).boostClockMhz = 3000; }), 'sanity');
  });
  it('socket, chipset and memory agree', () => {
    expectRule(run((d) => { board(d).memory.type = 'DDR4'; }), 'sanity');
    expectRule(run((d) => { board(d).chipset = 'Z890'; }), 'sanity');
  });
  it('lane-sharing effects are physically possible', () => {
    expectRule(run((d) => { at(board(d).laneSharing, 1).effects = [{ type: 'reduces', slot: 'pcie-2', lanes: 8 }]; }), 'sanity');
  });
  it('an AIO radiator matches its fans', () => {
    const aio = (fanCount: number) => (d: FixtureData) => {
      const air = first(d.specs.cooler);
      if (air.type !== 'air') throw new Error('fixture cooler should be air');
      const { heightMm: _h, ramClearanceMm: _r, ...shared } = air;
      d.specs.cooler = [
        { ...shared, type: 'aio', radiatorSizeMm: 360, radiatorLengthMm: 397, radiatorWidthMm: 120, radiatorThicknessMm: 27, tubeLengthMm: 400, fanSizeMm: 120, fanCount },
      ];
    };
    expectRule(run(aio(2)), 'sanity');
    expectClean(run(aio(3)));
  });
  it('a case layout position keeps its tall-GPU limit no looser than the normal one', () => {
    const layout = (tallLimit: number) => (d: FixtureData) => {
      first(d.specs.case).layoutPositions = [
        { position: '1', coolerMaxHeightMm: 77, gpuMaxThicknessMm: 43, tallGpuLimit: { aboveGpuHeightMm: 131, maxThicknessMm: tallLimit } },
      ];
    };
    expectRule(run(layout(50)), 'sanity');
    expectClean(run(layout(33)));
  });
});

describe("prices (Owner's rule 1)", () => {
  it('price-currency: currency matches market', () => {
    expectRule(run((d) => { usObs(d).currency = 'SAR'; }), 'price-currency');
  });
  it('price-archive: a price with an archiveUrl is rejected', () => {
    expectRule(run((d) => { Object.assign(usObs(d), { archiveUrl: 'https://web.archive.org/web/20260930000000/https://shop-us.example/p/fx-cpu-am5' }); }), 'price-archive');
  });
  it('price-archive: a price read from an archive, cache or tracker url is rejected', () => {
    expectRule(run((d) => { usObs(d).url = 'https://web.archive.org/web/20260930000000/https://shop-us.example/p/fx-cpu-am5'; }), 'price-archive');
    expectRule(run((d) => { usObs(d).url = 'https://camelcamelcamel.com/product/B0000'; }), 'price-archive');
  });
  it('price-retailer: the publisher must be a retailer selling in that market', () => {
    expectRule(run((d) => { usObs(d).retailer = 'bench-a'; usObs(d).url = 'https://bench-a.example/p'; }), 'price-retailer');
    expectRule(run((d) => { usObs(d).retailer = 'shop-sa'; usObs(d).url = 'https://shop-sa.example/p'; }), 'price-retailer');
    expectNoRule(run(), 'price-retailer');
  });
  it('price-window: retrievedAt must fall inside the batch window', () => {
    expectRule(run((d) => { usObs(d).retrievedAt = '2026-09-29'; }), 'price-window');
    expectNoRule(run((d) => { usObs(d).retrievedAt = d.prices.US.batch.windowStart; }), 'price-window');
    expectRule(run((d) => { usGap(d).checkedAt = '2026-09-01'; }), 'price-window');
  });
  it('price-gap-reason: a gap record must state its reason', () => {
    expectRule(run((d) => { Reflect.deleteProperty(usGap(d), 'reason'); }), 'price-gap-reason');
    expectRule(run((d) => { usGap(d).reason = '   '; }), 'price-gap-reason');
    expectNoRule(run(), 'price-gap-reason');
  });
  it('price-coverage: every purchasable part has a price or a gap per market, not both', () => {
    expectRule(run((d) => { d.prices.US.gaps = d.prices.US.gaps.slice(1); }), 'price-coverage');
    expectRule(run((d) => { d.prices.US.gaps.push({ ...usGap(d), partId: 'fx-cpu-am5' }); }), 'price-coverage');
  });
  it('price-capture: the capture follows the naming convention and carries its SHA-256', () => {
    expectNoRule(run(), 'price-capture');
    expectRule(run((d) => { usObs(d).capture = 'artifacts/prices/US/fx-cpu-am5--shop-us--2026-09-29.html'; }), 'price-capture');
    expectRule(run((d) => { usObs(d).capture = 'artifacts/tmp/page.html'; }), 'price-capture');
    expectRule(run((d) => { usObs(d).captureSha256 = 'not-a-hash'; }), 'price-capture');
  });
  it('price-duplicate: one observation per part and retailer', () => {
    expectRule(run((d) => { d.prices.US.observations.push({ ...usObs(d) }); }), 'price-duplicate');
  });
});

describe("benchmarks (Owner's rule 1, amended)", () => {
  it('an archived review row with publishedAt, snapshot after publication, is accepted', () => {
    expectClean(run());
    expect(firstSource(archivedRow(fixtureData()))).toHaveProperty('archiveUrl');
  });
  it('benchmark-published-at: an archived row with no publishedAt is rejected', () => {
    expectRule(run((d) => { Reflect.deleteProperty(archivedRow(d), 'publishedAt'); }), 'benchmark-published-at');
  });
  it('benchmark-published-at: a live row with no publishedAt is rejected too', () => {
    expectRule(run((d) => { Reflect.deleteProperty(liveRow(d), 'publishedAt'); }), 'benchmark-published-at');
  });
  it('benchmark-published-at: a source read before the review was published is rejected', () => {
    expectRule(run((d) => { liveRow(d).publishedAt = '2026-09-30'; firstSource(liveRow(d)).retrievedAt = '2026-09-29'; }), 'benchmark-published-at');
  });
  it('url-is-archive: a benchmark row whose url is itself an archive link is rejected', () => {
    expectRule(run((d) => { firstSource(liveRow(d)).url = 'https://web.archive.org/web/20250601120000/https://bench-a.example/review'; }), 'url-is-archive');
    expectRule(run((d) => { firstSource(liveRow(d)).url = 'https://archive.ph/2025.06.01-120000/https://bench-a.example/review'; }), 'url-is-archive');
    expectNoRule(run(), 'url-is-archive');
  });
  it('benchmark-snapshot-date: a snapshot dated before publishedAt is rejected', () => {
    expectRule(
      run((d) => { firstSource(archivedRow(d)).archiveUrl = 'https://web.archive.org/web/20250101000000/https://bench-b.example/review'; }),
      'benchmark-snapshot-date',
    );
    expectNoRule(
      run((d) => { firstSource(archivedRow(d)).archiveUrl = 'https://web.archive.org/web/20250520000000/https://bench-b.example/review'; }),
      'benchmark-snapshot-date',
    );
  });
  it('benchmark-conflict: rows >10% apart from different publishers must flag each other', () => {
    expectRule(run((d) => { archivedRow(d).avgFps = 130; }), 'benchmark-conflict');
    expectClean(
      run((d) => {
        archivedRow(d).avgFps = 130;
        archivedRow(d).onePercentLowFps = 104;
        archivedRow(d).conflictsWith = ['fx-bench-live'];
        liveRow(d).conflictsWith = ['fx-bench-archived'];
      }),
    );
    expectRule(run((d) => { liveRow(d).conflictsWith = ['fx-bench-archived']; }), 'benchmark-conflict');
  });
  it('benchmark-conditions: upscaling, limiter subject and aggregate are consistent', () => {
    expectRule(run((d) => { liveRow(d).upscaling = { method: 'native', mode: 'Quality', version: null }; }), 'benchmark-conditions');
    expectRule(run((d) => { liveRow(d).upscaling = { method: 'DLSS', mode: null, version: 'DLSS 4' }; }), 'benchmark-conditions');
    expectRule(
      run((d) => { first(d.creatorBenchmarks).testSystem = { cpu: 'Fixture', gpu: 'Fixture', ram: null, os: null }; }),
      'benchmark-conditions',
    );
  });
  it('coverage: a benchmark row from a retailer is rejected', () => {
    expectRule(run((d) => { liveRow(d).sources = [{ url: 'https://shop-us.example/review', publisher: 'shop-us', retrievedAt: TODAY, docType: 'review' }]; }), 'coverage');
  });
});

describe('games list', () => {
  it('game-list: each franchise slot names exactly one current title', () => {
    expectRule(run((d) => { d.games.games = d.games.games.filter((g) => g.franchiseSlot !== 'ea-sports-fc'); }), 'game-list');
  });
  it('game-list: a replacement names what it replaces', () => {
    expectRule(run((d) => { at(d.games.games, 2).replaces = null; }), 'game-list');
  });
  it('date-future: player counts are dated no later than today', () => {
    expectRule(run((d) => { first(first(d.games.games).playerCounts).asOf = '2026-10-05'; }), 'date-future');
  });
});
