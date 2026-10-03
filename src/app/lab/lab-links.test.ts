import { describe, expect, it } from 'vitest';
import { PICKER_CATEGORIES, PICKER_LABELS, partsPageHref, shownCategory } from './lab-links';

describe('the one-part picker’s categories', () => {
  it('follows the codec’s order with the step labels, and puts GPU chips after the cards', () => {
    expect(PICKER_CATEGORIES.map((category) => PICKER_LABELS[category])).toEqual([
      'CPU',
      'Motherboard',
      'Memory (RAM)',
      'Graphics card (GPU)',
      'GPU chip',
      'Storage',
      'Power supply (PSU)',
      'CPU cooling',
      'Case',
      'Case fans',
    ]);
  });
});

describe('partsPageHref', () => {
  it('opens the parts page on a part, with the part picked in the build', () => {
    expect(partsPageHref({}, { category: 'cpu', id: 'amd-ryzen-7-9800x3d' })).toBe(
      '/lab/parts?b=v1.c_amd-ryzen-7-9800x3d&cat=cpu',
    );
    expect(
      partsPageHref(
        { cpu: 'cpu-a', case: 'case-a' },
        { category: 'gpu-card', id: 'sapphire-pulse-radeon-rx-9070-xt-16gb' },
      ),
    ).toBe('/lab/parts?b=v1.c_cpu-a.g_sapphire-pulse-radeon-rx-9070-xt-16gb.x_case-a&cat=gpu-card');
  });

  it('shows a GPU chip through the lab’s own chip parameter, and leaves the build as it is', () => {
    expect(partsPageHref({ cpu: 'cpu-a' }, { category: 'gpu-chip', id: 'intel-arc-b580' })).toBe(
      '/lab/parts?b=v1.c_cpu-a&cat=gpu-chip&chip=intel-arc-b580',
    );
    expect(partsPageHref({}, { category: 'gpu-chip', id: 'intel-arc-b580' })).toBe(
      '/lab/parts?cat=gpu-chip&chip=intel-arc-b580',
    );
  });
});

describe('shownCategory', () => {
  it('shows the category the link names', () => {
    expect(shownCategory(new URLSearchParams('cat=case'), { cpu: 'cpu-a' })).toBe('case');
    expect(shownCategory(new URLSearchParams('cat=gpu-chip'), {})).toBe('gpu-chip');
  });

  it('otherwise opens on the first category the link picks a part in', () => {
    expect(shownCategory(new URLSearchParams(''), { case: 'case-a', motherboard: 'board-a' })).toBe(
      'motherboard',
    );
    expect(shownCategory(new URLSearchParams(''), { storage: ['drive-a'] })).toBe('storage');
    expect(shownCategory(new URLSearchParams('chip=intel-arc-b580'), { psu: 'psu-a' })).toBe(
      'gpu-chip',
    );
  });

  it('opens on CPU for an empty link, or a category it doesn’t know', () => {
    expect(shownCategory(new URLSearchParams(''), {})).toBe('cpu');
    expect(shownCategory(new URLSearchParams('cat=toaster'), {})).toBe('cpu');
    expect(shownCategory(new URLSearchParams(''), { storage: [] })).toBe('cpu');
  });
});
