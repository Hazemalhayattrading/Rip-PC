import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SourceRef } from '../../data/schema';
import type { SpecEvidence } from '../../engine/types';
import { EvidenceList } from './EvidenceList';
import { SpecSources, SpecValue } from './SpecValue';

const NAMES: Readonly<Record<string, string>> = {
  sapphire: 'SAPPHIRE',
  'fractal-design': 'Fractal Design',
  deepcool: 'DeepCool',
};
const publisherName = (id: string) => NAMES[id] ?? id;

const SAPPHIRE: SourceRef = {
  url: 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-9070-xt-16g-gddr6',
  publisher: 'sapphire',
  retrievedAt: '2026-09-30',
  docType: 'product-page',
  title: 'PULSE AMD Radeon RX 9070 XT',
};
const FRACTAL: SourceRef = {
  url: 'https://www.fractal-design.com/products/cases/north/north/',
  publisher: 'fractal-design',
  retrievedAt: '2026-09-30',
  docType: 'spec-page',
};

function evidence(fields: Partial<SpecEvidence>): SpecEvidence {
  return {
    partId: 'part',
    category: 'gpu-card',
    field: 'lengthMm',
    value: 320,
    unit: 'mm',
    availability: 'published',
    condition: null,
    note: null,
    sources: [SAPPHIRE],
    ...fields,
  };
}

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&#x27;/g, '’')
    .replace(/&quot;/g, '"');
}

describe('SpecValue', () => {
  it('shows a value exactly as stored, with its unit, never translated', () => {
    const markup = renderToStaticMarkup(
      <SpecValue evidence={evidence({ value: 5200, unit: 'MHz' })} />,
    );
    // A no-break space (U+00A0) between the number and its unit (copy guide §3).
    expect(markup).toBe('<span translate="no">5,200\u00A0MHz</span>');
  });

  it('adds a limit’s condition, and the maker’s own words under it in quotes', () => {
    const markup = renderToStaticMarkup(
      <SpecValue
        evidence={evidence({
          category: 'case',
          field: 'gpuClearance.1.maxLengthMm',
          value: 300,
          condition: 'with a 360\u00A0mm front radiator',
        })}
        asPublished="up to 300 mm with a 360 mm front radiator"
      />,
    );
    expect(text(markup)).toBe(
      '300\u00A0mm with a 360\u00A0mm front radiator“up to 300 mm with a 360 mm front radiator”',
    );
    expect(markup).toContain(
      '<span class="block type-caption text-ink-3">“up to 300 mm with a 360 mm front radiator”</span>',
    );
  });

  it('says "None" for a part that has none, and "Not published" for a value the maker withholds', () => {
    expect(
      text(
        renderToStaticMarkup(
          <SpecValue evidence={evidence({ value: null, availability: 'none' })} />,
        ),
      ),
    ).toBe('None');
    expect(
      text(
        renderToStaticMarkup(
          <SpecValue evidence={evidence({ value: null, availability: 'not-published' })} />,
        ),
      ),
    ).toBe('Not published');
  });

  it('writes a date as a date, and yes or no in words anyone can translate', () => {
    expect(
      renderToStaticMarkup(
        <SpecValue evidence={evidence({ field: 'launchDate', value: '2025-01-23', unit: null })} />,
      ),
    ).toBe('<time dateTime="2025-01-23">23 Jan 2025</time>');
    expect(
      renderToStaticMarkup(<SpecValue evidence={evidence({ value: true, unit: null })} />),
    ).toBe('Yes');
  });
});

describe('SpecSources', () => {
  it('lists each source on its own line, read on its date, then the note', () => {
    const markup = renderToStaticMarkup(
      <SpecSources
        evidence={evidence({ sources: [SAPPHIRE, FRACTAL], note: 'Measured without the bracket.' })}
        publisherName={publisherName}
      />,
    );
    expect(text(markup)).toBe(
      'SAPPHIRE, product page (opens in a new tab), read 30 Sep 2026' +
        'Fractal Design, spec page (opens in a new tab), read 30 Sep 2026' +
        'Measured without the bracket.',
    );
    expect(markup).not.toContain('PULSE AMD Radeon RX 9070 XT');
    expect(markup).toContain(
      '<span class="block type-caption text-ink-3">Measured without the bracket.</span>',
    );
  });

  it('shows the note it is given in place of the evidence’s own', () => {
    const markup = renderToStaticMarkup(
      <SpecSources
        evidence={evidence({ note: 'A note on the whole group.' })}
        note={null}
        publisherName={publisherName}
      />,
    );
    expect(markup).not.toContain('A note on the whole group.');
  });

  it('gives a value the maker withholds its reason, even without a source', () => {
    const markup = renderToStaticMarkup(
      <SpecSources
        evidence={evidence({
          value: null,
          availability: 'not-published',
          note: 'DeepCool gives no number.',
          sources: [],
        })}
        publisherName={publisherName}
      />,
    );
    expect(text(markup)).toBe('DeepCool gives no number.');
  });
});

describe('EvidenceList', () => {
  it('lists each spec as a term with its value and its sources, under "Sources"', () => {
    const markup = renderToStaticMarkup(
      <EvidenceList
        items={[
          { evidence: evidence({}) },
          {
            evidence: evidence({
              category: 'case',
              field: 'gpuClearance.0.maxLengthMm',
              value: 355,
              sources: [FRACTAL],
            }),
          },
          {
            evidence: evidence({
              category: 'cooler',
              field: 'ramClearanceMm',
              value: null,
              availability: 'not-published',
              note: 'DeepCool gives no number.',
            }),
          },
        ]}
        publisherName={publisherName}
      />,
    );
    expect(
      markup.startsWith(
        '<div><p class="mb-1 type-caption text-ink-3">Sources</p><dl class="grid gap-y-2 type-small',
      ),
    ).toBe(true);
    expect(markup.match(/<dt class="text-ink-2">([^<]*)<\/dt>/g)).toEqual([
      '<dt class="text-ink-2">Graphics card: length</dt>',
      '<dt class="text-ink-2">Case: graphics card limit</dt>',
      '<dt class="text-ink-2">Cooler: memory clearance</dt>',
    ]);
    expect(markup).toContain(
      '<dd class="whitespace-nowrap text-ink"><span translate="no">320\u00A0mm</span></dd>',
    );
    expect(markup).toContain('<dd class="whitespace-nowrap text-ink-2">Not published</dd>');
    expect(markup).toContain('@2xl:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)]');
    expect(markup).toContain(
      '<div class="flex flex-wrap gap-x-2 @2xl:col-span-3 @2xl:grid @2xl:grid-cols-subgrid">',
    );
  });

  it('lets a conditional value wrap, because its condition is words', () => {
    const markup = renderToStaticMarkup(
      <EvidenceList
        items={[
          {
            evidence: evidence({
              category: 'case',
              field: 'gpuClearance.1.maxLengthMm',
              value: 300,
              condition: 'with a 360\u00A0mm front radiator',
            }),
          },
        ]}
        publisherName={publisherName}
      />,
    );
    expect(markup).toContain('<dd class="text-ink">');
  });
});
