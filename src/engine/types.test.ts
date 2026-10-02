import { describe, expect, it } from 'vitest';
import * as engine from './index';
import { CONFIDENCES, CREATOR_WORKLOADS, RULE_IDS, RULE_STATUSES } from './types';

describe('RULE_IDS', () => {
  it('lists the 20 rules of plan §3, in its order', () => {
    expect(RULE_IDS).toEqual([
      'cpu-socket',
      'cpu-chipset',
      'bios-version',
      'ram-type',
      'ram-slots',
      'ram-speed',
      'gpu-length',
      'gpu-thickness',
      'cooler-height',
      'ram-cooler-clearance',
      'radiator-fit',
      'psu-form-factor',
      'psu-length',
      'psu-wattage',
      'gpu-power-connector',
      'm2-lanes',
      'board-form-factor',
      'usb-c-header',
      'cooler-socket',
      'display-output',
    ]);
  });

  it('holds unique kebab-case ids', () => {
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length);
    for (const id of RULE_IDS) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe('the status, confidence and workload lists', () => {
  it('gives the three statuses of BUILD_PROMPT §5.1, worst last', () => {
    expect(RULE_STATUSES).toEqual(['ok', 'warn', 'block']);
  });

  it('gives the three confidence levels, lowest first', () => {
    expect(CONFIDENCES).toEqual(['low', 'medium', 'high']);
  });

  it('gives the creator workloads of BUILD_PROMPT §5.3', () => {
    expect(CREATOR_WORKLOADS).toEqual([
      'blender',
      'cinebench-2024-single',
      'cinebench-2024-multi',
      'video-export',
      'code-compile',
      'local-ai',
    ]);
  });
});

describe('the engine entry module', () => {
  it('re-exports the contract and estimate()', () => {
    expect(engine.RULE_IDS).toBe(RULE_IDS);
    expect(engine.estimate(1, 2, 'low')).toEqual({ low: 1, high: 2, confidence: 'low' });
  });
});
