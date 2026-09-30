import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { githubPagesPreview, notFoundLikeGithubPages } from './github-pages-preview';

let root: string;
let dist: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'rig-lab-pages-'));
  dist = join(root, 'dist');
  mkdirSync(join(dist, 'build'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(dist, 'build', 'cpu.html'), '<h1>cpu</h1>');
  writeFileSync(join(dist, '404.html'), '<h1>Page not found</h1>');
  writeFileSync(join(root, 'secret.html'), 'outside the output directory');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
}

function run(url: string | undefined) {
  const response: FakeResponse = { statusCode: 200, headers: {}, body: undefined };
  const res = {
    set statusCode(code: number) {
      response.statusCode = code;
    },
    setHeader(name: string, value: string) {
      response.headers[name.toLowerCase()] = value;
    },
    end(body: Buffer) {
      response.body = body.toString('utf8');
    },
  };
  const next = vi.fn();
  notFoundLikeGithubPages(dist)({ url } as IncomingMessage, res as unknown as ServerResponse, next);
  return { response, next };
}

describe('notFoundLikeGithubPages', () => {
  it.each(['/build/cpu.html', '/index.html', '/build/cpu.html?b=v1.c_x#top'])(
    'lets the existing file %s through to Vite',
    (url) => {
      const { response, next } = run(url);
      expect(next).toHaveBeenCalledOnce();
      expect(response.body).toBeUndefined();
    },
  );

  it.each([
    '/build/nope',
    '/build/nope.html',
    '/assets/missing.js',
    '/build',
    '/../secret.html',
    '/%E0%A4%A.html',
    undefined,
  ])('answers %s with 404 and the 404.html page', (url) => {
    const { response, next } = run(url);
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(response.body).toBe('<h1>Page not found</h1>');
  });
});

type ConfigurePreviewServer = (server: unknown) => (() => void) | undefined;

function hookFor(outDir: string) {
  const use = vi.fn();
  const server = { config: { root, build: { outDir } }, middlewares: { use } };
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

  it('refuses to start without a build', () => {
    const { call } = hookFor('missing-dist');
    expect(call).toThrow(/Run `npm run build` before/);
  });
});
