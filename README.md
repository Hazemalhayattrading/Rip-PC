# Rig Lab

A PC builder: pick every part and every look, watch the PC assemble in 3D, and get a sourced
picture of what that exact build will do before you buy it. The brief is in
[`BUILD_PROMPT.md`](BUILD_PROMPT.md) and the team rules are in [`CLAUDE.md`](CLAUDE.md).

The site is served by GitHub Pages at **https://hazemalhayattrading.github.io/Rip-PC/**.

## One-time setup Hazem must do on GitHub

Deploys run from GitHub Actions, and GitHub does not let a workflow switch this on by itself:

1. Open the repository on GitHub, then **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main`, or run **Actions → Deploy to GitHub Pages → Run workflow**.

Until step 2 is done, the deploy workflow fails at `actions/configure-pages`. Everything else
(CI on every branch and pull request) works without it.

## Local setup

- Node **22.22.2** (see [`.nvmrc`](.nvmrc); ESLint 10 needs 22.13 or later) and npm 10.
- `npm ci`
- Playwright's Chromium, once: `npx playwright install chromium`. In the Rig Lab Claude
  container, skip this: Chromium is preinstalled at `/opt/pw-browsers`
  (`PLAYWRIGHT_BROWSERS_PATH`), and `@playwright/test` is pinned to 1.56.1 to match it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173/Rip-PC/ |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` the way GitHub Pages does, at http://localhost:4173/Rip-PC/ |
| `npm run typecheck` | `tsc -b` over the app and tooling projects |
| `npm run lint` | ESLint (type-aware), then `prettier --check` |
| `npm run format` | Prettier, writing fixes |
| `npm run test` | Vitest unit tests (engine, data, state, build scripts), in Node |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Unit tests with coverage and the coverage gates |
| `npm run e2e` | All Playwright tests, against the production build (run `npm run build` first) |
| `npm run e2e:smoke` | Only the `@smoke` Playwright tests |
| `npm run verify` | typecheck, lint, test:coverage, build, e2e:smoke: the merge gate |

`npm run verify` must pass before anything merges. CI runs it on every push and pull request,
and `scripts/verify-gate.sh` runs it before a task can be marked complete.

## How the site is put together

**Base path.** Every mode (dev, build, preview) serves under `/Rip-PC/`, the GitHub Pages
project path. It is set once, as `BASE_PATH` in [`src/app/routes.ts`](src/app/routes.ts). The
deploy workflow checks that Pages really serves the site there before it deploys.

**Routes.** `src/app/routes.ts` is the single typed route table: `/`, the 12 build steps
`/build/<step>`, `/results`, `/bottleneck`, `/buy`, `/sources`, and a 404 view. The app, the
build and the e2e tests all read it.

**One HTML file per route.** GitHub Pages is a static host, so the build
([`scripts/vite/static-route-pages.ts`](scripts/vite/static-route-pages.ts)) writes a real
file for every route, with that route's title and description: `dist/index.html`,
`dist/build/cpu.html`, `dist/results.html` and so on, plus `dist/404.html`. Pages answers
`/Rip-PC/build/cpu` with `build/cpu.html` and a 200. It is `cpu.html` and not
`cpu/index.html` because Pages answers a directory path without a trailing slash with a 301
redirect (checked against a live Pages site on 2026-09-30). Any other path gets `404.html` with
status 404, and the app shows its 404 view.

**Preview behaves like Pages.** `npm run preview` resolves `/x` to `x.html` and answers
unknown paths with `404.html` and a 404
([`scripts/vite/github-pages-preview.ts`](scripts/vite/github-pages-preview.ts)), so the e2e
tests check the deployed file layout, not a single-page-app fallback.

**The build lives in the URL.** Every page's address is a share link: `?b=` holds the build in
a compact, versioned format, for example `?b=v1.c_<cpu-id>.g_<gpu-card-id>`
([`src/state/build-codec.ts`](src/state/build-codec.ts)). In-app links carry it, Back and
reload keep it, and a link that cannot be read opens an empty build with a notice instead of
crashing. The one-letter category codes are part of the v1 format: never change or reuse one.

**3D loads only where it is used.** three.js, React Three Fiber, drei and postprocessing may be
imported only under `src/three/`, and `src/three/` only through the `React.lazy` import in
[`src/components/garage/GarageSlot.tsx`](src/components/garage/GarageSlot.tsx). ESLint
enforces both. The landing page never downloads the 3D chunk, and browsers without WebGL 2
get a message instead of it.

**Coverage gates.** `src/engine/**` and `src/state/**` must stay at 100% line, branch, function
and statement coverage (`vitest.config.ts`).

## Conventions

- TypeScript `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax` and `erasableSyntaxOnly`. No `any`: ESLint rejects it.
- Imports inside `src/` have no file extension. Files that Node or Vite's config loader may
  load directly (tool configs, `scripts/`, `tests/`) import with explicit `.ts` extensions.
- Unit tests sit next to the code as `*.test.ts`. Playwright tests live in `tests/e2e/` as
  `*.spec.ts`.
- Screenshots go to `artifacts/screenshots/<phase>/<task>/`, which git ignores.

## Toolchain decisions

- **TypeScript 6.0.3, not 7.** TypeScript 7 (the native compiler) is the current release, but
  typescript-eslint 8.71, and its canary, only support `typescript >=4.8.4 <6.1.0`. The type-aware
  lint rules are part of the merge gate, so TypeScript stays on the newest 6.0 release until
  typescript-eslint supports 7. The official `create-vite` React template also pins
  `~6.0.2`.
- **ESLint 10 with eslint-plugin-jsx-a11y 6.10.2.** jsx-a11y's latest release declares
  support up to ESLint 9, so `package.json` overrides that peer range. The plugin only uses
  rule APIs that ESLint 10 still has, and its rules are verified to fire.
- **wouter for routing.** It supports the base path, typed params (through the route table),
  lazy components and query strings. It adds 2.6 KB gzip to the landing page, against 13.0 KB
  for React Router 8 and 25.9 KB for TanStack Router, measured on the same page.
- **`zod/mini` in the initial bundle.** The URL codec ships on every page. A codec-sized
  schema costs 5.1 KB gzip with `zod/mini` and 20.6 KB with classic `zod`. Data schemas in
  `src/data/` use classic `zod`, and load lazily with the catalogue.
- **Playwright pinned to 1.56.1**, so local runs and CI use the same Chromium build (1194).
  Upgrade it on purpose, never by accident.

## Continuous integration and deploys

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml): on every push and pull request, runs
  `npm ci` and `npm run verify` on Node from `.nvmrc`, and uploads the Playwright report and
  traces when something fails.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): on push to `main` or a manual
  run, runs `npm run verify`, uploads `dist/` and deploys it to GitHub Pages. One deployment
  runs at a time, and a running one is never cancelled.
