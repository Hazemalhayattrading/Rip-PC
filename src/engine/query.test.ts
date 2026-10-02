import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { utcToday } from '../data/validate';
import { checkCompatibility, type CompatRule } from './compat/check';
import * as engine from './index';
import { parseQueryInput, runQueries, type QueryInput } from './query';
import { ruleSpec } from './rules';
import { systemOf } from './system';
import type { BuildParts, RuleResult } from './types';

const ROOT = resolve(import.meta.dirname, '../..');
const { catalogue } = buildCatalogue(readDataFiles(ROOT), utcToday());
const SAMPLE: unknown = JSON.parse(
  readFileSync(resolve(ROOT, 'scripts/engine-dump.sample-query.json'), 'utf8'),
);

const NOTHING: BuildParts = {
  cpu: null,
  motherboard: null,
  ram: null,
  'gpu-card': null,
  storage: [],
  psu: null,
  cooler: null,
  case: null,
  'case-fan': null,
  radiatorPosition: null,
};

/** The problems the parser reports for an input, or [] when it parses. */
function problemsOf(json: unknown): readonly string[] {
  const parsed = parseQueryInput(json, catalogue);
  return parsed.ok ? [] : parsed.problems;
}

/** An input with one build, `b`, whose parts are `parts`. */
const withParts = (parts: unknown): unknown => ({ schemaVersion: 1, builds: [{ id: 'b', parts }] });

/** An input with one build, `b`, with the extra keys of `build`. */
const withBuild = (build: Record<string, unknown>): unknown => ({
  schemaVersion: 1,
  builds: [{ id: 'b', parts: {}, ...build }],
});

const PARTS = '$.builds[0].parts';

describe('parseQueryInput', () => {
  it('reads the sample input: two real builds, every missing part unpicked', () => {
    const parsed = parseQueryInput(SAMPLE, catalogue);
    expect(parsed).toStrictEqual({
      ok: true,
      input: {
        schemaVersion: 1,
        builds: [
          {
            id: 'rx-9070-xt-in-the-north-with-a-front-360',
            parts: {
              ...NOTHING,
              cpu: 'amd-ryzen-7-9800x3d',
              motherboard: 'asus-tuf-gaming-x870-plus-wifi',
              ram: 'gskill-trident-z5-neo-rgb-ddr5-6000-cl30-2x16gb',
              'gpu-card': 'sapphire-pulse-radeon-rx-9070-xt-16gb',
              storage: ['wd-black-sn850x-2tb'],
              psu: 'deepcool-pn850m',
              cooler: 'arctic-liquid-freezer-iii-pro-360',
              case: 'fractal-north-charcoal-black-tg-light',
              radiatorPosition: 'front',
            },
          },
          {
            id: 'core-i5-12400f-without-a-graphics-card',
            parts: {
              ...NOTHING,
              cpu: 'intel-core-i5-12400f',
              motherboard: 'asus-prime-b760m-a-wifi-d4',
              ram: 'teamgroup-t-force-vulcan-z-ddr4-3200-cl16-2x16gb',
              storage: ['wd-blue-sa510-2-5-inch-1tb'],
              psu: 'deepcool-pn650m',
              cooler: 'deepcool-an400',
              case: 'fractal-pop-mini-air-rgb-black-tg-clear-tint',
              'case-fan': { partId: 'arctic-p12-pwm-pst-black', packs: 1 },
            },
          },
        ],
      },
    });
  });

  it('takes BuildParts\' own "not picked" forms: null, and an empty drive list', () => {
    const parsed = parseQueryInput(
      withParts({
        cpu: null,
        'gpu-card': null,
        storage: [],
        'case-fan': null,
        radiatorPosition: null,
      }),
      catalogue,
    );
    expect(parsed).toStrictEqual({
      ok: true,
      input: { schemaVersion: 1, builds: [{ id: 'b', parts: NOTHING }] },
    });
  });

  it('takes a drive more than once, case fans in several packs, and no builds at all', () => {
    const parsed = parseQueryInput(
      withParts({
        storage: ['samsung-990-pro-2tb', 'samsung-990-pro-2tb'],
        'case-fan': { partId: 'arctic-p14-pwm-pst-black', packs: 3 },
      }),
      catalogue,
    );
    expect(parsed.ok && parsed.input.builds[0]?.parts).toMatchObject({
      storage: ['samsung-990-pro-2tb', 'samsung-990-pro-2tb'],
      'case-fan': { partId: 'arctic-p14-pwm-pst-black', packs: 3 },
    });
    expect(parseQueryInput({ schemaVersion: 1, builds: [] }, catalogue)).toStrictEqual({
      ok: true,
      input: { schemaVersion: 1, builds: [] },
    });
  });

  it.each([
    ['an array', [], ['$: the query input must be a JSON object.']],
    ['null', null, ['$: the query input must be a JSON object.']],
    ['another schema version', { schemaVersion: 2, builds: [] }, ['$.schemaVersion: must be 1.']],
    ['no schema version', { builds: [] }, ['$.schemaVersion: must be 1.']],
    ['no builds', { schemaVersion: 1 }, ['$.builds: must be a list of builds.']],
    [
      'builds that are not a list',
      { schemaVersion: 1, builds: {} },
      ['$.builds: must be a list of builds.'],
    ],
    [
      'a build that is not an object',
      { schemaVersion: 1, builds: ['b'] },
      ['$.builds[0]: must be an object with an id and parts.'],
    ],
    [
      'a build without an id',
      { schemaVersion: 1, builds: [{ parts: {} }] },
      ['$.builds[0].id: must be a non-empty string.'],
    ],
    ['an empty id', withBuild({ id: ' ' }), ['$.builds[0].id: must be a non-empty string.']],
    [
      'an id that is not a string',
      withBuild({ id: 7 }),
      ['$.builds[0].id: must be a non-empty string.'],
    ],
    [
      'two builds with one id',
      {
        schemaVersion: 1,
        builds: [
          { id: 'a', parts: {} },
          { id: 'a', parts: {} },
        ],
      },
      ['$.builds[1].id: "a" is used by another build.'],
    ],
    [
      'a build without parts',
      { schemaVersion: 1, builds: [{ id: 'b' }] },
      ['$.builds[0].parts: must be an object.'],
    ],
    ['parts that are a list', withParts([]), [`${PARTS}: must be an object.`]],
    [
      'an unknown key in the input',
      { schemaVersion: 1, builds: [], notes: 'x' },
      ['$.notes: unknown key. The input takes schemaVersion and builds.'],
    ],
    [
      'an unknown key in a build',
      withBuild({ note: 'x' }),
      ['$.builds[0].note: unknown key. A build takes id and parts.'],
    ],
    [
      'an unknown key in parts',
      withParts({ gpu: 'x' }),
      [
        `${PARTS}.gpu: unknown key. Parts take cpu, motherboard, ram, gpu-card, storage, psu, cooler, case, case-fan and radiatorPosition.`,
      ],
    ],
    [
      'a part the catalogue does not have',
      withParts({ cpu: 'amd-ryzen-9-9999x' }),
      [`${PARTS}.cpu: "amd-ryzen-9-9999x" is not a CPU in the catalogue.`],
    ],
    [
      'a part of another category',
      withParts({ cpu: 'nvidia-geforce-rtx-5090-founders-edition' }),
      [
        `${PARTS}.cpu: "nvidia-geforce-rtx-5090-founders-edition" is not a CPU in the catalogue: it is a graphics card.`,
      ],
    ],
    [
      'a GPU chip in place of a card',
      withParts({ 'gpu-card': 'nvidia-geforce-rtx-5090' }),
      [
        `${PARTS}["gpu-card"]: "nvidia-geforce-rtx-5090" is not a graphics card in the catalogue: it is a GPU chip.`,
      ],
    ],
    [
      'a part that is not a string',
      withParts({ ram: 3 }),
      [`${PARTS}.ram: must be a memory kit id or null.`],
    ],
    [
      'drives that are not a list',
      withParts({ storage: 'samsung-990-pro-2tb' }),
      [`${PARTS}.storage: must be a list of drive ids.`],
    ],
    [
      'drives as null',
      withParts({ storage: null }),
      [`${PARTS}.storage: must be a list of drive ids.`],
    ],
    [
      'drives the catalogue does not have',
      withParts({ storage: ['samsung-990-pro-2tb', 'no-such-drive', 4] }),
      [
        `${PARTS}.storage[1]: "no-such-drive" is not a drive in the catalogue.`,
        `${PARTS}.storage[2]: must be a drive id.`,
      ],
    ],
    [
      'case fans that are not an object',
      withParts({ 'case-fan': 'arctic-p12-pwm-pst-black' }),
      [`${PARTS}["case-fan"]: must be an object with partId and packs, or null.`],
    ],
    [
      'case fans with a wrong id, no packs and an unknown key',
      withParts({ 'case-fan': { partId: 'no-such-fan', packs: 0, count: 2 } }),
      [
        `${PARTS}["case-fan"].partId: "no-such-fan" is not a case fan in the catalogue.`,
        `${PARTS}["case-fan"].packs: must be a whole number of packs, 1 or more.`,
        `${PARTS}["case-fan"].count: unknown key. A case fan takes partId and packs.`,
      ],
    ],
    [
      'case fans without an id, in half a pack',
      withParts({ 'case-fan': { packs: 1.5 } }),
      [
        `${PARTS}["case-fan"].partId: must be a case fan id.`,
        `${PARTS}["case-fan"].packs: must be a whole number of packs, 1 or more.`,
      ],
    ],
    [
      'a radiator position the schema does not have',
      withParts({ radiatorPosition: 'back' }),
      [`${PARTS}.radiatorPosition: must be front, top, rear, bottom, side, psu-shroud or null.`],
    ],
    ['an fps query', withBuild({ fps: [] }), ['$.builds[0].fps: fps queries arrive with WP-E3.']],
    [
      'a creator query',
      withBuild({ creator: [] }),
      ['$.builds[0].creator: creator queries arrive with WP-E4.'],
    ],
    [
      'a bottleneck query',
      withBuild({ bottleneck: [] }),
      ['$.builds[0].bottleneck: bottleneck queries arrive with WP-E5.'],
    ],
    [
      'test systems',
      { schemaVersion: 1, builds: [], systems: [] },
      ['$.systems: test systems arrive with WP-E3.'],
    ],
  ])('reports %s', (_label, json, problems) => {
    expect(problemsOf(json)).toEqual(problems);
  });

  it('reports every problem at once, each with its JSON path', () => {
    const json = {
      schemaVersion: 3,
      builds: [
        { id: 'a', parts: { cpu: 'x', case: 'y' } },
        { id: 'a', parts: { radiatorPosition: 'z' }, fps: [] },
      ],
      systems: [],
    };
    expect(problemsOf(json)).toEqual([
      '$.schemaVersion: must be 1.',
      '$.builds[0].parts.cpu: "x" is not a CPU in the catalogue.',
      '$.builds[0].parts.case: "y" is not a case in the catalogue.',
      '$.builds[1].id: "a" is used by another build.',
      '$.builds[1].parts.radiatorPosition: must be front, top, rear, bottom, side, psu-shroud or null.',
      '$.builds[1].fps: fps queries arrive with WP-E3.',
      '$.systems: test systems arrive with WP-E3.',
    ]);
  });
});

const parsedSample = parseQueryInput(SAMPLE, catalogue);
const sample: QueryInput = parsedSample.ok ? parsedSample.input : { schemaVersion: 1, builds: [] };

/** A stand-in rule result, sound unless `reason` breaks the copy guide. */
const okResult = (reason = 'A stand-in reason.'): RuleResult => ({
  ruleId: 'cpu-socket',
  status: 'ok',
  cantVerify: false,
  parts: [{ category: 'cpu', partId: 'amd-ryzen-7-9800x3d' }],
  reason,
  action: null,
  steps: null,
  evidence: [
    {
      partId: 'amd-ryzen-7-9800x3d',
      category: 'cpu',
      field: 'socket',
      value: 'AM5',
      unit: null,
      availability: 'published',
      condition: null,
      note: null,
      sources: [],
    },
  ],
  layoutId: null,
});

const fakeRule = (reason?: string): CompatRule => ({
  spec: ruleSpec('cpu-socket'),
  evaluate: () => okResult(reason),
});

describe('runQueries', () => {
  it("gives each build its parts, its system, its compatibility report and that report's problems", () => {
    const rules = [fakeRule()];
    const output = runQueries(sample, catalogue, rules);
    expect(output).toStrictEqual({
      schemaVersion: 1,
      builds: sample.builds.map(({ id, parts }) => ({
        id,
        parts,
        system: systemOf(parts, catalogue),
        compatibility: checkCompatibility(parts, catalogue, rules),
        problems: [],
      })),
    });
    expect(output.builds[0]?.system).toMatchObject({
      cpuId: 'amd-ryzen-7-9800x3d',
      gpuChipId: 'amd-radeon-rx-9070-xt',
    });
  });

  it('runs COMPAT_RULES by default: empty reports until WP-E1', () => {
    const [first] = runQueries(sample, catalogue).builds;
    expect(first?.compatibility).toStrictEqual({
      results: [],
      notRun: [],
      worst: null,
      layout: null,
      driveSlots: null,
      power: null,
    });
    expect(first?.problems).toEqual([]);
  });

  it('lists the problems of an answer that breaks the contract', () => {
    const [first] = runQueries(sample, catalogue, [fakeRule('no full stop')]).builds;
    expect(first?.problems).toEqual([
      'cpu-socket: the reason must be one sentence that ends with a full stop.',
    ]);
  });

  it('asks for a CPU when a build has none', () => {
    const input: QueryInput = { schemaVersion: 1, builds: [{ id: 'empty', parts: NOTHING }] };
    expect(runQueries(input, catalogue).builds[0]?.system).toEqual({
      kind: 'needs-parts',
      needs: ['cpu'],
      reason: 'Pick a CPU to estimate performance.',
    });
  });

  it('writes plain JSON', () => {
    const output = runQueries(sample, catalogue, [fakeRule()]);
    expect(JSON.parse(JSON.stringify(output))).toStrictEqual(output);
  });

  it('is exported from the engine entry module', () => {
    expect(engine.parseQueryInput).toBe(parseQueryInput);
    expect(engine.runQueries).toBe(runQueries);
  });
});
