/**
 * The single typed route table for Rig Lab.
 *
 * Three consumers read it, so they can never drift apart:
 * - the app, to decide what to render for a path;
 * - the build (`scripts/vite/static-route-pages.ts`), to write one HTML file per known route;
 * - the e2e smoke test, to load every known route directly.
 *
 * This module is pure data and functions: no React, no DOM, no Vite globals, so Node tooling
 * can import it. Paths here are relative to the site base (see `BASE_PATH`).
 */

/** GitHub Pages serves the site at https://hazemalhayattrading.github.io/Rip-PC/. */
export const BASE_PATH = '/Rip-PC/';

/** The builder steps, in the order the visitor walks through them (BUILD_PROMPT §2, Phase 2). */
export const BUILD_STEPS = [
  'use-case',
  'budget',
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'cooling',
  'case',
  'looks',
  'review',
] as const;

export type BuildStep = (typeof BUILD_STEPS)[number];

export const BUILD_STEP_LABELS: Readonly<Record<BuildStep, string>> = {
  'use-case': 'Use case',
  budget: 'Budget',
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'Memory (RAM)',
  gpu: 'Graphics card (GPU)',
  storage: 'Storage',
  psu: 'Power supply (PSU)',
  cooling: 'CPU cooling',
  case: 'Case',
  looks: 'Fans and looks',
  review: 'Review',
};

/** What the visitor does on each step, for the page description. */
const BUILD_STEP_TASKS: Readonly<Record<BuildStep, string>> = {
  'use-case': 'say what the PC is for',
  budget: 'set your budget',
  cpu: 'choose the CPU',
  motherboard: 'choose the motherboard',
  ram: 'choose the memory (RAM)',
  gpu: 'choose the graphics card (GPU)',
  storage: 'choose the storage',
  psu: 'choose the power supply (PSU)',
  cooling: 'choose the CPU cooler',
  case: 'choose the case',
  looks: 'choose the fans and looks',
  review: 'review the whole build',
};

/**
 * The Engine lab's pages (plan §1), each a route under `/lab/`. A later lab page (WP-E1 to
 * WP-E5: compat, power, games, creator, bottleneck) is one more id here, its meta in `LAB_META`
 * below, and its view in `src/app/lab/`.
 */
export const LAB_PAGES = ['index', 'parts', 'accuracy'] as const;

export type LabPage = (typeof LAB_PAGES)[number];

/** A known route. Build steps carry a typed `step` parameter, lab pages a `page`. */
export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'build'; readonly step: BuildStep }
  | { readonly name: 'results' }
  | { readonly name: 'bottleneck' }
  | { readonly name: 'buy' }
  | { readonly name: 'sources' }
  | { readonly name: 'lab'; readonly page: LabPage };

export type RouteName = Route['name'];

/** The result of matching a path: a known route, or the 404 view. */
export type RouteMatch = Route | { readonly name: 'not-found' };

/** What the document head and the page heading show for a route. */
export interface PageMeta {
  /** The `<title>`. */
  readonly title: string;
  /** The page's single `<h1>`. Unique across routes. */
  readonly heading: string;
  /** The `<meta name="description">`. */
  readonly description: string;
  /**
   * `false` asks search engines not to index the page: the build writes
   * `<meta name="robots" content="noindex">` into its HTML, and the app keeps that tag in step
   * on in-app navigation. Only the Engine lab, an internal preview, is not indexable (plan §1).
   */
  readonly indexable: boolean;
}

const SITE_NAME = 'Rig Lab';

export function isBuildStep(value: string): value is BuildStep {
  return (BUILD_STEPS as readonly string[]).includes(value);
}

/**
 * Every known route, in site order. Home first, then the build steps, then the result pages,
 * then the Engine lab.
 */
export const KNOWN_ROUTES: readonly Route[] = [
  { name: 'home' },
  ...BUILD_STEPS.map((step): Route => ({ name: 'build', step })),
  { name: 'results' },
  { name: 'bottleneck' },
  { name: 'buy' },
  { name: 'sources' },
  ...LAB_PAGES.map((page): Route => ({ name: 'lab', page })),
];

/**
 * The canonical path of a route, relative to the base. No trailing slash, except for the two
 * folder indexes: home (`/`) and the lab home (`/lab/`, the address plan §1 uses). GitHub Pages
 * answers `/lab` with a 301 to `/lab/`, because `lab/` is a folder that holds lab pages.
 */
export function pathOf(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'build':
      return `/build/${route.step}`;
    case 'results':
      return '/results';
    case 'bottleneck':
      return '/bottleneck';
    case 'buy':
      return '/buy';
    case 'sources':
      return '/sources';
    case 'lab':
      return route.page === 'index' ? '/lab/' : `/lab/${route.page}`;
  }
}

const ROUTES_BY_PATH: ReadonlyMap<string, Route> = new Map(
  KNOWN_ROUTES.map((route) => [pathOf(route), route]),
);

const NOT_FOUND: RouteMatch = { name: 'not-found' };

const INDEX_HTML = 'index.html';

/**
 * Matches a path (relative to the base, without query or hash) against the route table.
 * Matching is exact and case-sensitive, the same rule GitHub Pages applies to the files the
 * build writes, so the app renders a known route exactly when the server has a file for it.
 * GitHub Pages also serves a folder's `index.html` at its own address, so `/index.html` is home
 * and `/lab/index.html` the lab home (QA-P1-002). No other route ends in a slash, so
 * `/build/index.html` stays not found.
 */
export function matchPath(pathname: string): RouteMatch {
  const exact = ROUTES_BY_PATH.get(pathname);
  if (exact !== undefined) return exact;
  // `/lab/index.html` is the folder `/lab/`.
  const folder = pathname.endsWith(`/${INDEX_HTML}`) ? pathname.slice(0, -INDEX_HTML.length) : null;
  return (folder === null ? undefined : ROUTES_BY_PATH.get(folder)) ?? NOT_FOUND;
}

/**
 * For a path that did not match, the known route the visitor most likely meant: the same path
 * without a `.html` or `/index.html` suffix, without trailing slashes, or in lower case. A folder
 * index such as the lab home is found with its one trailing slash put back (`/lab` → `/lab/`).
 * Returns `null` when there is no close match.
 */
export function suggestRoute(pathname: string): Route | null {
  let candidate = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (candidate.length > 1) candidate = candidate.replace(/\/+$/, '');
  if (candidate === '') candidate = '/';
  for (const option of [candidate, candidate.toLowerCase()]) {
    for (const path of [option, `${option}/`]) {
      const route = ROUTES_BY_PATH.get(path);
      if (route && path !== pathname) return route;
    }
  }
  return null;
}

/** The steps before and after a build step, for previous and next links. */
export function neighbourSteps(step: BuildStep): {
  readonly previous: BuildStep | null;
  readonly next: BuildStep | null;
} {
  const index = BUILD_STEPS.indexOf(step);
  return {
    previous: BUILD_STEPS[index - 1] ?? null,
    next: BUILD_STEPS[index + 1] ?? null,
  };
}

function withSiteName(title: string): string {
  return `${title} · ${SITE_NAME}`;
}

const LAB_NAME = 'Engine lab';

/** Each lab page's heading and description. Titles add "· Engine lab · Rig Lab". */
const LAB_META: Readonly<
  Record<LabPage, { readonly heading: string; readonly description: string }>
> = {
  index: {
    heading: LAB_NAME,
    description:
      'Internal preview of the Rig Lab engine: what each lab page shows, and how many parts, prices and benchmark anchors the catalogue holds.',
  },
  parts: {
    heading: 'Parts and specs',
    description:
      'Internal preview: every catalogue part and spec, with its unit, its sources and their dates, and the part’s prices in SAR and USD.',
  },
  accuracy: {
    heading: 'Accuracy: benchmark anchors',
    description:
      'Internal preview: every benchmark anchor with its source, and which games, GPU chips and CPUs have anchors.',
  },
};

function labMeta(page: LabPage): PageMeta {
  const { heading, description } = LAB_META[page];
  return {
    title: page === 'index' ? withSiteName(LAB_NAME) : withSiteName(`${heading} · ${LAB_NAME}`),
    heading,
    description,
    indexable: false,
  };
}

/** Title, heading, description and indexability for a route or the 404 view. */
export function metaOf(match: RouteMatch): PageMeta {
  switch (match.name) {
    case 'home':
      return {
        title: SITE_NAME,
        heading: SITE_NAME,
        description:
          'Pick every part of a PC, see it assemble in 3D, and get sourced performance estimates before you buy.',
        indexable: true,
      };
    case 'build': {
      const number = BUILD_STEPS.indexOf(match.step) + 1;
      const label = BUILD_STEP_LABELS[match.step];
      const heading = `Step ${String(number)} of ${String(BUILD_STEPS.length)}: ${label}`;
      return {
        title: withSiteName(heading),
        heading,
        description: `Build step ${String(number)} of ${String(BUILD_STEPS.length)}: ${BUILD_STEP_TASKS[match.step]}.`,
        indexable: true,
      };
    }
    case 'results':
      return {
        title: withSiteName('Results'),
        heading: 'Results',
        description: 'Estimated gaming and creator performance for your build, with sources.',
        indexable: true,
      };
    case 'bottleneck':
      return {
        title: withSiteName('Bottleneck analysis'),
        heading: 'Bottleneck analysis',
        description: 'Which part holds your build back, in which workloads, and by how much.',
        indexable: true,
      };
    case 'buy':
      return {
        title: withSiteName('Buy sheet'),
        heading: 'Buy sheet',
        description: 'Your parts list with prices in SAR and USD, retailer links and dates.',
        indexable: true,
      };
    case 'sources':
      return {
        title: withSiteName('Sources'),
        heading: 'Sources',
        description: 'Every source behind the specs, benchmarks and prices on Rig Lab.',
        indexable: true,
      };
    case 'lab':
      return labMeta(match.page);
    case 'not-found':
      return {
        title: withSiteName('Page not found'),
        heading: 'Page not found',
        description: 'There is no page at this address.',
        indexable: true,
      };
  }
}

/**
 * The file the build writes for a route, relative to the output directory.
 * `/build/cpu` becomes `build/cpu.html`, never `build/cpu/index.html`: GitHub Pages serves
 * `x.html` for `/x` with a 200, but answers `/x` with a 301 to `/x/` when `x` is a directory.
 * A path that ends in a slash is a folder index: `/` is `index.html`, `/lab/` is
 * `lab/index.html`, which Pages serves at `/lab/` with a 200.
 */
export function htmlFileOf(route: Route): string {
  const path = pathOf(route);
  return path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`;
}

/** GitHub Pages serves this file, with status 404, for any path that has no file. */
export const NOT_FOUND_HTML_FILE = '404.html';
