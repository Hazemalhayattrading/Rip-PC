import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceLink } from './SourceLink';

const URL = 'https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-9070-xt-16g-gddr6';

function html(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

/** The text a reader sees: tags out, entities decoded. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&#x27;/g, '’');
}

describe('SourceLink', () => {
  it('names the publisher and the document, and says the link opens a new tab', () => {
    const markup = html(
      <SourceLink
        url={URL}
        publisher="SAPPHIRE"
        document="product page"
        dates={[{ verb: 'read', date: '2026-09-30' }]}
      />,
    );
    expect(markup).toContain(`href="${URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('<span translate="no">SAPPHIRE</span>, product page');
    expect(markup).toContain('<span class="sr-only"> (opens in a new tab)</span>');
    expect(text(markup)).toBe('SAPPHIRE, product page (opens in a new tab), read 30 Sep 2026');
  });

  it('draws the arrow in its wrapper’s colour, hidden from screen readers', () => {
    const markup = html(<SourceLink url={URL} publisher="SAPPHIRE" document="product page" />);
    expect(markup).toMatch(
      /<span class="ml-0\.5 inline-block align-\[-0\.125em\] text-ink-3" aria-hidden="true"><svg class="size-3\.5"[^>]*stroke="currentColor"/,
    );
    expect(markup).not.toMatch(/<svg[^>]*text-ink/);
  });

  it('keeps each date in one piece, in a time element', () => {
    const markup = html(
      <SourceLink
        url={URL}
        publisher="TechPowerUp"
        document="review"
        dates={[
          { verb: 'published', date: '2026-05-06' },
          { verb: 'read', date: '2026-09-30' },
        ]}
      />,
    );
    expect(markup).toContain(
      '<span class="whitespace-nowrap text-ink-3">, published <time dateTime="2026-05-06">6 May 2026</time>,</span> <span class="whitespace-nowrap text-ink-3">read <time dateTime="2026-09-30">30 Sep 2026</time></span>',
    );
    expect(text(markup)).toBe(
      'TechPowerUp, review (opens in a new tab), published 6 May 2026, read 30 Sep 2026',
    );
  });

  it('adds the archived copy as a second link, after the date', () => {
    const markup = html(
      <SourceLink
        url={URL}
        publisher="SAPPHIRE"
        document="product page"
        dates={[{ verb: 'read', date: '2026-09-30' }]}
        archiveUrl="https://web.archive.org/web/20260930120000/https://example.com/"
      />,
    );
    expect(text(markup)).toBe(
      'SAPPHIRE, product page (opens in a new tab), read 30 Sep 2026, archived copy (opens in a new tab)',
    );
    expect(markup).toContain(
      'href="https://web.archive.org/web/20260930120000/https://example.com/"',
    );
  });

  it('shows no date when a table column already gives it', () => {
    expect(text(html(<SourceLink url={URL} publisher="Amazon.sa" document="product page" />))).toBe(
      'Amazon.sa, product page (opens in a new tab)',
    );
  });
});
