import { describe, expect, it, vi } from 'vitest';
import { KNOWN_ROUTES } from '../../src/app/routes';
import { escapeHtml, planStaticPages, staticRoutePages, withPageMeta } from './static-route-pages';

const TEMPLATE = [
  '<!doctype html><html lang="en"><head>',
  '<title>Rig Lab</title>',
  '<meta name="description" content="Home." />',
  '<script type="module" src="/Rip-PC/assets/index-abc.js"></script>',
  '</head><body><div id="root"></div></body></html>',
].join('\n');

describe('planStaticPages', () => {
  it('plans one file per known route, then 404.html, with no duplicates', () => {
    const pages = planStaticPages();
    expect(pages).toHaveLength(KNOWN_ROUTES.length + 1);
    expect(pages[0]?.fileName).toBe('index.html');
    expect(pages.at(-1)).toEqual({
      fileName: '404.html',
      meta: expect.objectContaining({ heading: 'Page not found' }) as unknown,
    });
    expect(new Set(pages.map((p) => p.fileName)).size).toBe(pages.length);
    expect(pages.map((p) => p.fileName)).toContain('build/cpu.html');
  });

  it('plans the lab home as lab/index.html and each lab page as lab/<page>.html', () => {
    const files = planStaticPages().map((p) => p.fileName);
    expect(files).toEqual(
      expect.arrayContaining(['lab/index.html', 'lab/parts.html', 'lab/accuracy.html']),
    );
    expect(files).not.toContain('lab.html');
  });
});

const ROBOTS_NOINDEX = '<meta name="robots" content="noindex" />';

describe('withPageMeta: robots', () => {
  const page = { title: 't', heading: 'h', description: 'd' };

  it('asks search engines not to index a page that is not indexable, inside <head>', () => {
    const html = withPageMeta(TEMPLATE, { ...page, indexable: false });
    expect(html.split(ROBOTS_NOINDEX)).toHaveLength(2);
    expect(html.indexOf(ROBOTS_NOINDEX)).toBeGreaterThan(html.indexOf('<head>'));
    expect(html.indexOf(ROBOTS_NOINDEX)).toBeLessThan(html.indexOf('</head>'));
  });

  it('writes no robots tag for an indexable page, so its HTML stays as it was', () => {
    const html = withPageMeta(TEMPLATE, { ...page, indexable: true });
    expect(html).not.toContain('robots');
    expect(html).toBe(
      TEMPLATE.replace('<title>Rig Lab</title>', '<title>t</title>').replace(
        'content="Home."',
        'content="d"',
      ),
    );
  });

  it('rejects a template that already has a robots tag, because the route table owns it', () => {
    const template = TEMPLATE.replace('</head>', '<meta name="robots" content="none" /></head>');
    expect(() => withPageMeta(template, { ...page, indexable: true })).toThrow(
      /must not have a <meta name="robots">/,
    );
  });
});

describe('withPageMeta', () => {
  it('sets the title and description and leaves everything else alone', () => {
    const html = withPageMeta(TEMPLATE, {
      title: 'Step 3 of 12: CPU · Rig Lab',
      heading: 'unused',
      description: 'Choose your CPU.',
      indexable: true,
    });
    expect(html).toContain('<title>Step 3 of 12: CPU · Rig Lab</title>');
    expect(html).toContain('<meta name="description" content="Choose your CPU." />');
    expect(html).toContain('<script type="module" src="/Rip-PC/assets/index-abc.js"></script>');
    expect(html).not.toContain('Home.');
  });

  it('handles a description tag that Prettier wrapped over several lines', () => {
    const wrapped = TEMPLATE.replace(
      '<meta name="description" content="Home." />',
      '<meta\n      name="description"\n      content="Home."\n    />',
    );
    const html = withPageMeta(wrapped, {
      title: 't',
      heading: 'h',
      description: 'Choose.',
      indexable: true,
    });
    expect(html).toContain('<meta name="description" content="Choose." />');
    expect(html).not.toContain('Home.');
  });

  it('escapes markup and never expands replacement patterns such as $&', () => {
    const html = withPageMeta(TEMPLATE, {
      title: 'A <b> & "C" $& $1',
      heading: 'unused',
      description: 'Say "hi" & <leave> $&',
      indexable: true,
    });
    expect(html).toContain('<title>A &lt;b&gt; &amp; &quot;C&quot; $&amp; $1</title>');
    expect(html).toContain('content="Say &quot;hi&quot; &amp; &lt;leave&gt; $&amp;"');
  });

  it.each([
    ['no title', TEMPLATE.replace('<title>Rig Lab</title>', '')],
    ['two titles', TEMPLATE.replace('</head>', '<title>Again</title></head>')],
    ['no description', TEMPLATE.replace('<meta name="description" content="Home." />', '')],
  ])('rejects a template with %s', (_label, template) => {
    expect(() =>
      withPageMeta(template, { title: 't', heading: 'h', description: 'd', indexable: true }),
    ).toThrow(/exactly one <title> and one <meta name="description">/);
  });

  it('escapes the four HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});

type GenerateBundle = (
  this: { emitFile: (file: unknown) => string; error: (message: string) => never },
  options: unknown,
  bundle: Record<string, unknown>,
) => void;

function generateBundleHook(): GenerateBundle {
  return staticRoutePages().generateBundle as unknown as GenerateBundle;
}

describe('staticRoutePages plugin', () => {
  it('rewrites index.html and emits every other route page plus 404.html', () => {
    const emitFile = vi.fn<(file: unknown) => string>(() => 'ref');
    const error = vi.fn<(message: string) => never>((message) => {
      throw new Error(message);
    });
    const indexAsset = { type: 'asset', fileName: 'index.html', source: TEMPLATE };
    generateBundleHook().call({ emitFile, error }, {}, { 'index.html': indexAsset });

    expect(indexAsset.source).toContain('<title>Rig Lab</title>');
    expect(indexAsset.source).toContain('content="Pick every part of a PC');
    const emitted = emitFile.mock.calls.map(
      ([file]) => file as { fileName: string; source: string },
    );
    expect(emitted.map((f) => f.fileName)).toEqual(
      planStaticPages()
        .map((p) => p.fileName)
        .filter((name) => name !== 'index.html'),
    );
    const cpu = emitted.find((f) => f.fileName === 'build/cpu.html');
    expect(cpu?.source).toContain('<title>Step 3 of 12: CPU · Rig Lab</title>');
    expect(error).not.toHaveBeenCalled();
  });

  it('marks every lab page noindex, and no product page or the 404 page', () => {
    const emitFile = vi.fn<(file: unknown) => string>(() => 'ref');
    const error = vi.fn<(message: string) => never>((message) => {
      throw new Error(message);
    });
    const indexAsset = { type: 'asset', fileName: 'index.html', source: TEMPLATE };
    generateBundleHook().call({ emitFile, error }, {}, { 'index.html': indexAsset });

    const emitted = emitFile.mock.calls.map(
      ([file]) => file as { fileName: string; source: string },
    );
    const noindex = emitted
      .filter((file) => file.source.includes(ROBOTS_NOINDEX))
      .map((file) => file.fileName);
    expect(noindex).toEqual(['lab/index.html', 'lab/parts.html', 'lab/accuracy.html']);
    expect(indexAsset.source).not.toContain('robots');
    const notFound = emitted.find((file) => file.fileName === '404.html');
    expect(notFound?.source).not.toContain('robots');
    const labHome = emitted.find((file) => file.fileName === 'lab/index.html');
    expect(labHome?.source).toContain('<title>Engine lab · Rig Lab</title>');
  });

  it('reads an index.html asset given as bytes', () => {
    const emitFile = vi.fn<(file: unknown) => string>(() => 'ref');
    const error = vi.fn<(message: string) => never>((message) => {
      throw new Error(message);
    });
    const indexAsset = {
      type: 'asset',
      fileName: 'index.html',
      source: new TextEncoder().encode(TEMPLATE),
    };
    generateBundleHook().call({ emitFile, error }, {}, { 'index.html': indexAsset });
    expect(typeof indexAsset.source).toBe('string');
    expect(emitFile).toHaveBeenCalledTimes(planStaticPages().length - 1);
  });

  it('fails the build when index.html is missing', () => {
    const emitFile = vi.fn<(file: unknown) => string>(() => 'ref');
    const error = vi.fn<(message: string) => never>((message) => {
      throw new Error(message);
    });
    expect(() => {
      generateBundleHook().call({ emitFile, error }, {}, {});
    }).toThrow(/index\.html is missing from the bundle/);
    expect(emitFile).not.toHaveBeenCalled();
  });

  it('runs only at build time, after the core HTML plugin', () => {
    const plugin = staticRoutePages();
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('post');
  });
});
