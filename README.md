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

- Node **22.22.2** (see [`.nvmrc`](.nvmrc); ESLint 10 needs 22.13 or later) and npm 10. CI
  uses the version in `.nvmrc`, so use the same one locally.
- `npm ci`
- Playwright's Chromium, once: `npx playwright install chromium`. `@playwright/test` is pinned
  to 1.56.1, so this installs Chromium build 1194, the one CI uses.

### MCP servers for Claude Code

- **Playwright** is declared in [`.mcp.json`](.mcp.json). Claude Code loads it for everyone who
  opens the project, after asking each person once. It drives the installed Google Chrome,
  headless.
- **Context7** (current library docs, [`CLAUDE.md`](CLAUDE.md) rule 6) is **not** in
  `.mcp.json`, because it takes a personal API key and no key may enter the repo. Add it once,
  at user scope, with your own key from the [Context7 dashboard](https://context7.com/dashboard):

  ```sh
  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp --api-key <your key>
  ```

  User scope keeps it in your own `~/.claude.json` (`%USERPROFILE%\.claude.json` on Windows),
  outside the repo, and it then loads in every project. `claude mcp get context7` shows where
  it is defined. Don't add a `context7` entry to `.mcp.json`, even one without a key: a
  project-scope server overrides a user-scope one with the same name, so it would hide yours.

### On Windows

Use Git for Windows and run the commands in Git Bash. The quality-gate hook in
`.claude/settings.json` runs `bash scripts/verify-gate.sh`, so Claude Code needs Git Bash too.

- **Node 22**, per `.nvmrc`, with nvm-windows or fnm. Node 24 also passes `npm run verify`
  (checked on 2026-10-01), but npm then prints an `EBADENGINE` warning, because `engines` asks
  for `^22.13.0`, and CI runs 22.
- **Symlinks.** `.claude/skills/*` are 45 symlinks into `.agents/skills/`. Without symlink
  support, Git checks each one out as a small text file, and Claude Code then finds no project
  skills. Turn on **Developer Mode** (Settings → System → For developers), then clone with
  `git clone -c core.symlinks=true <repo url>`. To fix an existing clone, with Developer Mode
  on: run `git config core.symlinks true`, delete the `.claude/skills` folder, and run
  `git checkout -- .claude/skills`.
- **Line endings.** `.gitattributes` (`* text=auto eol=lf`) checks every text file out with LF,
  whatever `core.autocrlf` says, so a fresh clone passes Prettier. A checkout made before that
  file existed can still hold CRLF copies, which fail `prettier --check` and with it
  `npm run verify`. `git ls-files --eol | grep w/crlf` lists them; check them out again.
- **No Docker, no visual baselines.** Visual baselines are made and compared only in the pinned
  Playwright Docker image (`tests/visual/run-in-docker.sh`), which needs Docker Desktop. Never
  create baselines on Windows directly: its font rendering differs from the image's. Everything
  else, `npm run verify` included, runs without Docker. See
  [`tests/visual/README.md`](tests/visual/README.md).
- **Lighthouse CI** needs no `CHROME_PATH` here: it finds the installed Google Chrome (checked
  on 2026-10-01 with Chrome 151). CI points it at Playwright's Chromium 1194 instead, so local
  Lighthouse numbers come from a different browser build than CI's.

### In the Phase 0 cloud container (history)

Phase 0 started in a Claude Code cloud container. These notes apply only there: Chromium was
preinstalled at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`), so the install step was
skipped, and Lighthouse CI needed `CHROME_PATH=/opt/pw-browsers/chromium`. No config depends on
these paths.

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

### Performance budgets and the data audit

QA owns these tools ([`docs/qa/test-plan.md`](docs/qa/test-plan.md) §6 and §7), and every
threshold comes from [`tests/perf/budget.json`](tests/perf/budget.json). All but
`audit:sample` measure the production build, so run `npm run build` first. CI runs the first
four in its **Performance budgets** job on every push and pull request, once `npm run verify`
has passed.

| Command | What it does |
|---|---|
| `npm run perf:bundle` | Initial JS (gzip) of every built page against the 250 KB budget, with lazy chunks such as 3D reported apart. Writes `artifacts/perf/bundle-budget.json` |
| `npm run perf:lhci` | Lighthouse CI on the landing page, mobile preset: 3 runs, median, asserting performance, LCP, CLS and TBT. Reports go to `artifacts/lhci/mobile/` |
| `npm run perf:lhci:desktop` | The same with the desktop preset, into `artifacts/lhci/desktop/` |
| `npm run perf:vitals` | LCP and CLS from the web-vitals library on cold loads, at 390 and 1440 px and CPU x1 and x4 (Playwright project `perf`) |
| `npm run perf:fps` | The 3D frame-rate probe. Needs `--mode reference` on real hardware or `--mode ci`, and `--url`; usage is at the top of `tests/perf/fps-probe.mjs`. It has no scene to measure until Phase 3 |
| `npm run audit:sample` | The seeded, reproducible sample for the data audit. Needs `--seed` and `--manifest` or `--data-dir`; usage is at the top of `tests/audit/sample.mjs` |

Pass a tool's own flags after `--`, for example
`npm run audit:sample -- --seed <seed> --data-dir data/parts`.

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

**Design tokens and the theme.** [`src/app/app.css`](src/app/app.css) imports design-lead's
tokens and base styles from `src/styles/`, with Tailwind's Preflight on. Only Rig Lab's own
colours, type roles, radii and shadows exist; Tailwind's defaults are removed
([`docs/design/tokens.md`](docs/design/tokens.md)). Unit tests are left out of Tailwind's class
detection, so a utility named only in a test never ships. Rig Lab opens dark. The "Light theme"
toggle stores the choice in `localStorage` (`rig-lab-theme`), and an inline script in
`index.html` restores it before the first paint. The theme never follows the operating system,
and it is never part of a share link.

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
