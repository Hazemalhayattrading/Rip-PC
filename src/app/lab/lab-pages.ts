/**
 * The lab's pages as the lab names them: the nav labels (lab-spec §1) and the one sentence under
 * each page's heading, which the lab home repeats in its list of pages (lab-spec §8). Only pages
 * that exist are here. A new lab page id in `LAB_PAGES` (src/app/routes.ts) must get its label
 * and sentence here, or the typecheck fails.
 */
import type { LabPage } from '../routes';

export const LAB_PAGE_LABELS: Readonly<Record<LabPage, string>> = {
  index: 'Overview',
  parts: 'Parts',
  accuracy: 'Accuracy',
};

/** What each page shows, in one sentence: lab-spec §8 for the home, plan §1 for the others. */
export const LAB_PAGE_SENTENCES: Readonly<Record<LabPage, string>> = {
  index: 'The engine’s answers for real catalogue parts, with their sources.',
  parts: 'Every catalogue part and spec, each with its source and date.',
  accuracy:
    'Every benchmark anchor with its source, and which games, GPU chips and CPUs have anchors.',
};
