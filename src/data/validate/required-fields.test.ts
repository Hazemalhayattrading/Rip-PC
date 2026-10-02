import { describe, expect, it } from 'vitest';
import { DATA_PATHS } from '../schema/files';
import { formatIssue, validateFiles } from './index';
import { fixtureData, toFiles, TODAY, type FixtureData } from './test-fixtures';

/**
 * The fields 12 compatibility rules read can never be unknown: a null (or an empty list, where `[]`
 * would mean nothing) is rejected by the schema. These tests carry the rules' unknown-data guarantee
 * (Director's ruling 9f47477). QA's compat-trace requires each one by its exact title, from
 * `tests/audit/compat-rules.json` "requiredFields", so the titles must not change.
 */

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error('fixture list is empty');
  return item;
}

const cpu = (d: FixtureData) => first(d.specs.cpu);
const board = (d: FixtureData) => first(d.specs.motherboard);
const ram = (d: FixtureData) => first(d.specs.ram);
const storage = (d: FixtureData) => first(d.specs.storage);
const cooler = (d: FixtureData) => first(d.specs.cooler);
const pcCase = (d: FixtureData) => first(d.specs.case);

/** The record must be rejected by its schema, at exactly this path inside its data file. */
function expectSchemaRejects(mutate: (d: FixtureData) => void, file: string, path: string): void {
  const d = fixtureData();
  mutate(d);
  const { errors } = validateFiles(toFiles(d), { today: TODAY });
  const hits = errors.filter((e) => e.rule === 'schema' && e.file === file && e.path === path);
  expect(hits, errors.map(formatIssue).join('\n')).not.toEqual([]);
}

interface Case {
  field: string;
  file: string;
  path: string;
  mutate: (d: FixtureData) => void;
}

const NULL_REJECTED: Case[] = [
  { field: 'cpu.socket', file: DATA_PATHS.specs.cpu, path: 'items.0.socket', mutate: (d) => Object.assign(cpu(d), { socket: null }) },
  { field: 'motherboard.socket', file: DATA_PATHS.specs.motherboard, path: 'items.0.socket', mutate: (d) => Object.assign(board(d), { socket: null }) },
  {
    field: 'motherboard.biosSupport.cpus[].listing',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.biosSupport.cpus.0.listing',
    mutate: (d) => Object.assign(first(board(d).biosSupport.cpus), { listing: null }),
  },
  { field: 'ram.type', file: DATA_PATHS.specs.ram, path: 'items.0.type', mutate: (d) => Object.assign(ram(d), { type: null }) },
  {
    field: 'motherboard.memory.type',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.memory.type',
    mutate: (d) => Object.assign(board(d).memory, { type: null }),
  },
  { field: 'ram.moduleCount', file: DATA_PATHS.specs.ram, path: 'items.0.moduleCount', mutate: (d) => Object.assign(ram(d), { moduleCount: null }) },
  {
    field: 'motherboard.memory.slots',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.memory.slots',
    mutate: (d) => Object.assign(board(d).memory, { slots: null }),
  },
  { field: 'cooler.heightMm', file: DATA_PATHS.specs.cooler, path: 'items.0.heightMm', mutate: (d) => Object.assign(cooler(d), { heightMm: null }) },
  {
    field: 'case.coolerClearance[].maxHeightMm',
    file: DATA_PATHS.specs.case,
    path: 'items.0.coolerClearance.0.maxHeightMm',
    mutate: (d) => Object.assign(first(pcCase(d).coolerClearance), { maxHeightMm: null }),
  },
  {
    field: 'case.layoutPositions[].coolerMaxHeightMm',
    file: DATA_PATHS.specs.case,
    path: 'items.0.layoutPositions.0.coolerMaxHeightMm',
    mutate: (d) => {
      pcCase(d).layoutPositions = [
        { position: '1', coolerMaxHeightMm: 77, gpuMaxThicknessMm: 43, tallGpuLimit: null, radiatorFanMaxThicknessMm: 49 },
      ];
      Object.assign(first(pcCase(d).layoutPositions ?? []), { coolerMaxHeightMm: null });
    },
  },
  { field: 'storage.interface', file: DATA_PATHS.specs.storage, path: 'items.0.interface', mutate: (d) => Object.assign(storage(d), { interface: null }) },
  { field: 'storage.formFactor', file: DATA_PATHS.specs.storage, path: 'items.0.formFactor', mutate: (d) => Object.assign(storage(d), { formFactor: null }) },
  { field: 'motherboard.m2Slots', file: DATA_PATHS.specs.motherboard, path: 'items.0.m2Slots', mutate: (d) => Object.assign(board(d), { m2Slots: null }) },
  {
    field: 'motherboard.m2Slots[].sataSupport',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.m2Slots.0.sataSupport',
    mutate: (d) => Object.assign(first(board(d).m2Slots), { sataSupport: null }),
  },
  { field: 'motherboard.sataPorts', file: DATA_PATHS.specs.motherboard, path: 'items.0.sataPorts', mutate: (d) => Object.assign(board(d), { sataPorts: null }) },
  {
    field: 'motherboard.laneSharing',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.laneSharing',
    mutate: (d) => Object.assign(board(d), { laneSharing: null }),
  },
  { field: 'motherboard.formFactor', file: DATA_PATHS.specs.motherboard, path: 'items.0.formFactor', mutate: (d) => Object.assign(board(d), { formFactor: null }) },
  { field: 'case.frontIo.usbC', file: DATA_PATHS.specs.case, path: 'items.0.frontIo.usbC', mutate: (d) => Object.assign(pcCase(d).frontIo, { usbC: null }) },
  {
    field: 'motherboard.headers.usbCFront',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.headers.usbCFront',
    mutate: (d) => Object.assign(board(d).headers, { usbCFront: null }),
  },
];

const EMPTY_REJECTED: Case[] = [
  { field: 'case.coolerClearance', file: DATA_PATHS.specs.case, path: 'items.0.coolerClearance', mutate: (d) => { pcCase(d).coolerClearance = []; } },
  {
    field: 'motherboard.m2Slots[].sizes',
    file: DATA_PATHS.specs.motherboard,
    path: 'items.0.m2Slots.0.sizes',
    mutate: (d) => { first(board(d).m2Slots).sizes = []; },
  },
  { field: 'case.supportedBoards', file: DATA_PATHS.specs.case, path: 'items.0.supportedBoards', mutate: (d) => { pcCase(d).supportedBoards = []; } },
  { field: 'cooler.sockets', file: DATA_PATHS.specs.cooler, path: 'items.0.sockets', mutate: (d) => { cooler(d).sockets = []; } },
];

describe('fields the compatibility rules read are never unknown', () => {
  for (const c of NULL_REJECTED) {
    it(`[schema] ${c.field}: null is rejected`, () => {
      expectSchemaRejects(c.mutate, c.file, c.path);
    });
  }
  for (const c of EMPTY_REJECTED) {
    it(`[schema] ${c.field}: an empty list is rejected`, () => {
      expectSchemaRejects(c.mutate, c.file, c.path);
    });
  }
});
