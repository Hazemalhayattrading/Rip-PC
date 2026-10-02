import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { ResolvedConfig } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { utcToday } from '../../src/data/validate';
import { buildCatalogue, readDataFiles } from '../catalogue/catalogue';
import {
  CATALOGUE_URL_MODULE,
  DEV_CATALOGUE_PATH,
  catalogueAsset,
  catalogueUrlModule,
  serveCatalogue,
} from './catalogue';

const ROOT = resolve(import.meta.dirname, '../..');
const RESOLVED_ID = `\0${CATALOGUE_URL_MODULE}`;

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function request(
  handler: ReturnType<typeof serveCatalogue>,
  url: string,
): { response: FakeResponse; next: ReturnType<typeof vi.fn> } {
  const response: FakeResponse = { statusCode: 0, headers: {}, body: '' };
  const res = {
    set statusCode(code: number) {
      response.statusCode = code;
    },
    setHeader(name: string, value: string) {
      response.headers[name] = value;
    },
    end(body: string) {
      response.body = body;
    },
  };
  const next = vi.fn();
  handler({ url } as IncomingMessage, res as unknown as ServerResponse, next);
  return { response, next };
}

describe('catalogueUrlModule', () => {
  it('exports the URL as a string literal', () => {
    expect(catalogueUrlModule('/Rip-PC/assets/catalogue-0123.json')).toBe(
      'export default "/Rip-PC/assets/catalogue-0123.json";\n',
    );
  });
});

describe('serveCatalogue (dev)', () => {
  const handler = serveCatalogue('/Rip-PC/', () => '{"schemaVersion":1}');

  it('answers the catalogue path with fresh JSON that is never cached', () => {
    const { response, next } = request(handler, `/Rip-PC/${DEV_CATALOGUE_PATH}?t=1`);
    expect(next).not.toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: '{"schemaVersion":1}',
    });
  });

  it('passes every other path on', () => {
    for (const url of ['/Rip-PC/', `/${DEV_CATALOGUE_PATH}`, '/Rip-PC/__rig-lab/other.json']) {
      const { response, next } = request(handler, url);
      expect(next).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(0);
    }
  });

  it('answers 500 with the problem when the catalogue does not build', () => {
    const failing = serveCatalogue('/Rip-PC/', () => {
      throw new Error('The catalogue has 1 validation error:\nbad row');
    });
    const { response } = request(failing, `/Rip-PC/${DEV_CATALOGUE_PATH}`);
    expect(response.statusCode).toBe(500);
    expect(response.body).toBe('The catalogue has 1 validation error:\nbad row');
  });

  it('reports a thrown non-error value as text', () => {
    const failing = serveCatalogue('/Rip-PC/', () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
      throw 'boom';
    });
    expect(request(failing, `/Rip-PC/${DEV_CATALOGUE_PATH}`).response.body).toBe('boom');
  });
});

// The plugin's hooks are plain functions; tests call them with a minimal plugin context.
type Hook = (this: unknown, ...args: unknown[]) => unknown;

function hook(plugin: ReturnType<typeof catalogueAsset>, name: string): Hook {
  const value = (plugin as unknown as Record<string, unknown>)[name];
  if (typeof value !== 'function') throw new Error(`The plugin has no ${name} hook.`);
  return value as Hook;
}

function context() {
  return {
    emitFile: vi.fn(() => 'ref'),
    warn: vi.fn(),
    error: vi.fn((message: string) => {
      throw new Error(message);
    }),
  };
}

function config(command: 'build' | 'serve'): ResolvedConfig {
  return {
    command,
    root: ROOT,
    base: '/Rip-PC/',
    build: { assetsDir: 'assets' },
  } as ResolvedConfig;
}

describe('catalogueAsset (plugin)', () => {
  it('resolves only its own virtual module', () => {
    const plugin = catalogueAsset();
    expect(hook(plugin, 'resolveId').call(context(), CATALOGUE_URL_MODULE)).toBe(RESOLVED_ID);
    expect(hook(plugin, 'resolveId').call(context(), 'virtual:other')).toBeNull();
  });

  it('builds: emits the validated, content-hashed catalogue and exports its URL', () => {
    const plugin = catalogueAsset();
    const ctx = context();
    hook(plugin, 'configResolved').call(ctx, config('build'));
    hook(plugin, 'buildStart').call(ctx, {});

    const expected = buildCatalogue(readDataFiles(ROOT), utcToday());
    expect(ctx.emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: `assets/${expected.fileName}`,
      source: expected.json,
    });
    expect(hook(plugin, 'load').call(ctx, RESOLVED_ID)).toBe(
      catalogueUrlModule(`/Rip-PC/assets/${expected.fileName}`),
    );
    expect(hook(plugin, 'load').call(ctx, '/src/main.tsx')).toBeNull();
  });

  it('fails the build when the data does not validate', () => {
    // Every source was retrieved after this date, so the validator rejects the dataset.
    const plugin = catalogueAsset({ root: ROOT, today: () => '2000-01-01' });
    const ctx = context();
    hook(plugin, 'configResolved').call(ctx, config('build'));
    expect(() => hook(plugin, 'buildStart').call(ctx, {})).toThrow(
      /^The catalogue has \d+ validation errors/,
    );
    expect(ctx.emitFile).not.toHaveBeenCalled();
  });

  it('serves: points the module at the dev path and emits nothing', () => {
    const plugin = catalogueAsset();
    const ctx = context();
    hook(plugin, 'configResolved').call(ctx, config('serve'));
    hook(plugin, 'buildStart').call(ctx, {});
    expect(ctx.emitFile).not.toHaveBeenCalled();
    expect(hook(plugin, 'load').call(ctx, RESOLVED_ID)).toBe(
      catalogueUrlModule(`/Rip-PC/${DEV_CATALOGUE_PATH}`),
    );
  });

  it('serves: installs the dev middleware with the configured base', () => {
    const plugin = catalogueAsset();
    const use = vi.fn();
    hook(plugin, 'configureServer').call(context(), {
      config: { base: '/Rip-PC/' },
      middlewares: { use },
    });
    expect(use).toHaveBeenCalledOnce();
    const handler = use.mock.calls[0]?.[0] as ReturnType<typeof serveCatalogue>;
    const { response } = request(handler, `/Rip-PC/${DEV_CATALOGUE_PATH}`);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ schemaVersion: 1 });
  });

  it('refuses to export a URL before the build has emitted the file', () => {
    const plugin = catalogueAsset();
    const ctx = context();
    hook(plugin, 'configResolved').call(ctx, config('build'));
    expect(() => hook(plugin, 'load').call(ctx, RESOLVED_ID)).toThrow(
      'The catalogue URL was requested before the catalogue was built.',
    );
  });
});
