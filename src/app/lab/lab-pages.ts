/**
 * The lab's pages as the lab names them: the sub-navigation's labels, what each page does, and
 * the pages that arrive later (plan §1). A new lab page id in `LAB_PAGES` (src/app/routes.ts)
 * must get its label and summary here, or the typecheck fails.
 */
import type { LabPage } from '../routes';

export const LAB_PAGE_LABELS: Readonly<Record<LabPage, string>> = {
  index: 'Lab home',
  parts: 'Parts',
  accuracy: 'Accuracy',
};

/** One short paragraph per lab page: what it does. */
export const LAB_PAGE_SUMMARIES: Readonly<Record<LabPage, string>> = {
  index:
    'What each lab page does, and how many parts, prices and benchmark anchors the catalogue holds.',
  parts:
    'Pick a part in each category and read every spec the catalogue holds for it: value, unit, whether the maker publishes it, and each source with its date and link. Each part’s prices in Saudi Arabia and the US come with it, never converted.',
  accuracy:
    'Every benchmark anchor, game and creator, with its test settings, its test system and its source; coverage grids of games by GPU chip and by CPU; and the games, chips and CPUs that have no anchor yet. WP-E3 adds the model’s estimate and its error for each anchor.',
};

/** Lab pages still to come, with the work package that brings each one (plan §1). */
export const LATER_LAB_PAGES: readonly {
  readonly path: string;
  readonly summary: string;
  readonly arrivesWith: string;
}[] = [
  {
    path: '/lab/compat',
    summary:
      'One row per compatibility rule: ok, warn or block, with the reason, the rule id and the sources.',
    arrivesWith: 'WP-E1',
  },
  {
    path: '/lab/power',
    summary: 'The power breakdown, the two totals and the recommended PSU range.',
    arrivesWith: 'WP-E2',
  },
  {
    path: '/lab/games',
    summary:
      'Frame rates as a range with a confidence level, which part limits them, and the anchors behind them.',
    arrivesWith: 'WP-E3',
  },
  {
    path: '/lab/creator',
    summary: 'Estimates for Blender, Cinebench, video export, code compile and local AI.',
    arrivesWith: 'WP-E4',
  },
  {
    path: '/lab/bottleneck',
    summary: 'The plain-English verdict, and one to three rebalanced builds at the same price.',
    arrivesWith: 'WP-E5',
  },
];
