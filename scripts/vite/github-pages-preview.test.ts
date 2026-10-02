import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  folderIndexPaths,
  folderRedirects,
  githubPagesPreview,
  notFoundLikeGithubPages,
} from './github-pages-preview';

let root: string;
let dist: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'rig-lab-pages-'));
  dist = join(root, 'dist');
  mkdirSync(join(dist, 'build'), { recursive: true });
  mkdirSync(join(dist, 'lab'), { recursive: true });
  mkdirSync(join(root, 'outside'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(dist, 'build', 'cpu.html'), '<h1>cpu</h1>');
  writeFileSync(join(dist, 'lab', 'index.html'), '<h1>Engine lab</h1>');
  writeFileSync(join(dist, 'lab', 'parts.html'), '<h1>Parts and specs</h1>');
  writeFileSync(join(dist, '404.html'), '<h1>Page not found</h1>');
  writeFileSync(join(root, 'secret.html'), 'outside the output directory');
  writeFileSync(join(root, 'outside', 'index.html'), 'a folder outside the output directory');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
}

function run(url: string | undefined, base = '/Rip-PC/') {
  const response: FakeResponse = { statusCode: 200, headers: {}, body: undefined };
  const res = {
    set statusCode(code: number) {
      response.statusCode = code;
    },
    setHeader(name: string, value: string) {
      response.headers[name.toLowerCase()] = value;
    },
    end(body?: Buffer) {
      response.body = body?.toString('utf8') ?? '';
    },
  };
  const next = vi.fn();
  notFoundLikeGithubPages(dist, base)(
    { url } as IncomingMessage,
    res as unknown as ServerResponse,
    next,
  );
  return { response, next };
}

describe('notFoundLikeGithubPages', () => {
  it.each([
    '/build/cpu.html',
    '/index.html',
    '/build/cpu.html?b=v1.c_x#top',
    '/lab/index.html',
    '/lab/parts.html',
  ])('lets the existing file %s through to Vite', (url) => {
    const { response, next } = run(url);
    expect(next).toHaveBeenCalledOnce();
    expect(response.body).toBeUndefined();
  });

  it.each([
    '/build/nope',
    '/build/nope.html',
    '/assets/missing.js',
    '/build',
    '/build/',
    '/../secret.html',
    '/../outside',
    '/%E0%A4%A.html',
    undefined,
  ])('answers %s with 404 and the 404.html page', (url) => {
    const { response, next } = run(url);
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(response.body).toBe('<h1>Page not found</h1>');
  });

  it.each([
    ['/lab', '/Rip-PC/lab/'],
    ['/lab?b=v1.c_amd-ryzen-7-9800x3d', '/Rip-PC/lab/?b=v1.c_amd-ryzen-7-9800x3d'],
    ['/lab?b=v1.c_x&chip=y', '/Rip-PC/lab/?b=v1.c_x&chip=y'],
  ])(
    'answers the folder %s, which holds an index.html, with a 301 to its trailing slash',
    (url, location) => {
      const { response, next } = run(url);
      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(301);
      expect(response.headers.location).toBe(location);
    },
  );

  it('puts the base in front of the redirect, whatever the base is', () => {
    expect(run('/lab', '/').response.headers.location).toBe('/lab/');
  });
});

type ConfigurePreviewServer = (server: unknown) => (() => void) | undefined;

function hookFor(outDir: string) {
  const use = vi.fn<(middleware: ReturnType<typeof notFoundLikeGithubPages>) => void>();
  const server = { config: { root, base: '/Rip-PC/', build: { outDir } }, middlewares: { use } };
  const hook = githubPagesPreview().configurePreviewServer as unknown as ConfigurePreviewServer;
  return { use, call: () => hook(server) };
}

describe('githubPagesPreview plugin', () => {
  it('installs the 404 middleware after Vite’s own middlewares', () => {
    const { use, call } = hookFor('dist');
    const postHook = call();
    expect(use).not.toHaveBeenCalled();
    postHook?.();
    expect(use).toHaveBeenCalledOnce();
  });

  it('redirects folders under the server’s base', () => {
    const { use, call } = hookFor('dist');
    call()?.();
    const middleware = use.mock.calls[0]?.[0];
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 0,
      setHeader: (name: string, value: string) => (headers[name.toLowerCase()] = value),
      end: () => undefined,
    };
    middleware?.({ url: '/lab' } as IncomingMessage, res as unknown as ServerResponse, vi.fn());
    expect(res.statusCode).toBe(301);
    expect(headers.location).toBe('/Rip-PC/lab/');
  });

  it('refuses to start without a build', () => {
    const { call } = hookFor('missing-dist');
    expect(call).toThrow(/Run `npm run build` before/);
  });
});

/** Runs the dev redirect middleware on one URL. */
function runDev(url: string, base = '/Rip-PC/') {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader: (name: string, value: string) => (headers[name.toLowerCase()] = value),
    end: vi.fn(),
  };
  const next = vi.fn();
  folderRedirects(base)({ url } as IncomingMessage, res as unknown as ServerResponse, next);
  return { res, headers, next };
}

describe('folderIndexPaths', () => {
  it('lists the route table’s folder indexes other than home, without their slash', () => {
    expect(folderIndexPaths()).toEqual(['/lab']);
  });
});

describe('folderRedirects, for the dev server', () => {
  it.each([
    ['/Rip-PC/lab', '/Rip-PC/lab/'],
    ['/Rip-PC/lab?b=v1.c_amd-ryzen-7-9800x3d', '/Rip-PC/lab/?b=v1.c_amd-ryzen-7-9800x3d'],
  ])('answers %s with a 301 to %s, as GitHub Pages does', (url, location) => {
    const { res, headers, next } = runDev(url);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(301);
    expect(headers.location).toBe(location);
    expect(res.end).toHaveBeenCalledOnce();
  });

  it.each(['/Rip-PC/lab/', '/Rip-PC/lab/parts', '/Rip-PC/build', '/Rip-PC/', '/lab', '/Rip-PC/labs'])(
    'passes %s on to Vite',
    (url) => {
      const { res, next } = runDev(url);
      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
    },
  );

  it('puts the base in front, whatever the base is', () => {
    expect(runDev('/lab', '/').headers.location).toBe('/lab/');
  });

  it('is installed before Vite’s own dev middlewares, which still see the base', () => {
    const use = vi.fn<(middleware: ReturnType<typeof folderRedirects>) => void>();
    const server = { config: { base: '/Rip-PC/' }, middlewares: { use } };
    const hook = githubPagesPreview().configureServer as unknown as (s: unknown) => unknown;
    expect(hook(server)).toBeUndefined();
    expect(use).toHaveBeenCalledOnce();
    const headers: Record<string, string> = {};
    const res = { statusCode: 0, setHeader: (n: string, v: string) => (headers[n.toLowerCase()] = v), end: () => undefined };
    use.mock.calls[0]?.[0]({ url: '/Rip-PC/lab' } as IncomingMessage, res as unknown as ServerResponse, vi.fn());
    expect(res.statusCode).toBe(301);
    expect(headers.location).toBe('/Rip-PC/lab/');
  });
});
