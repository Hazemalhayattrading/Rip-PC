/**
 * Focus and scroll when the page changes in the app (design-lead's rules, QA-P1-001):
 * 1. A route change (a link: a new path in a new history entry) jumps to the top at once, never
 *    smoothly, then moves focus to the new page without scrolling.
 * 2. Back or Forward leave the browser's own scroll restoration alone
 *    (`history.scrollRestoration` stays `auto`) and move focus without scrolling.
 * 3. An in-page change (a pick rewriting `?b=`, the theme) moves neither: only a new path counts,
 *    which `SiteLayout` checks.
 * Back and Forward fire `popstate`; a link goes through wouter's patched `pushState`, which
 * announces itself with a `pushState` event. Pure, so it is tested without a browser.
 */

/** Where focus goes after an in-app page change. */
export type NavigationFocus = 'main' | 'h1';

/**
 * The shipped focus target. design-lead's rule is the new page's `h1` (every page's h1 has
 * `tabIndex={-1}` for it). It ships as `main`, as before, until QA keys its smoke and navigation
 * specs on this constant; then build-lead flips it to `h1`, the only change left.
 */
export const NAVIGATION_FOCUS: NavigationFocus = 'main';

export type Arrival = 'route-change' | 'history-traversal';

export interface ArrivalTracker {
  /** How the visitor arrived at the current path. */
  readonly current: () => Arrival;
  readonly disconnect: () => void;
}

/** Follows a window's history events. `replaceState` and `hashchange` leave the arrival as is. */
export function trackArrival(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
): ArrivalTracker {
  let arrival: Arrival = 'route-change';
  const traversed = () => {
    arrival = 'history-traversal';
  };
  const pushed = () => {
    arrival = 'route-change';
  };
  target.addEventListener('popstate', traversed);
  target.addEventListener('pushState', pushed);
  return {
    current: () => arrival,
    disconnect: () => {
      target.removeEventListener('popstate', traversed);
      target.removeEventListener('pushState', pushed);
    },
  };
}

/**
 * A link to the page already shown, such as the current step in the steps list: wouter pushes the
 * same path again, so nothing renders, yet the visitor followed a link (rule 1), and Back from it
 * is a traversal (rule 2). This settles such a history event at once. A new path is settled once
 * it has rendered (`usePageArrival`), so `samePath` tells the two apart.
 * @returns a function that stops listening
 */
export function settleSamePath(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  samePath: () => boolean,
  settle: (arrival: Arrival) => void,
): () => void {
  const pushed = () => {
    if (samePath()) settle('route-change');
  };
  const traversed = () => {
    if (samePath()) settle('history-traversal');
  };
  target.addEventListener('pushState', pushed);
  target.addEventListener('popstate', traversed);
  return () => {
    target.removeEventListener('pushState', pushed);
    target.removeEventListener('popstate', traversed);
  };
}

/** What a new page needs from the window. */
export interface PageView {
  /** Jump to the top at once, never smoothly. */
  readonly scrollToTop: () => void;
  /** Focus the new page's `main` or its `h1`, without scrolling. */
  readonly focus: (target: NavigationFocus) => void;
}

/** Rules 1 and 2: what happens once a new path has rendered. */
export function settleNewPage(
  arrival: Arrival,
  view: PageView,
  target: NavigationFocus = NAVIGATION_FOCUS,
): void {
  if (arrival === 'route-change') view.scrollToTop();
  view.focus(target);
}

interface Focusable {
  focus(options?: FocusOptions): void;
}

/** Focuses `main`, or the h1 inside it (falling back to `main` without one), without scrolling. */
export function focusNewPage(
  main: Focusable & { querySelector(selectors: 'h1'): Focusable | null },
  target: NavigationFocus,
): void {
  const element = target === 'h1' ? (main.querySelector('h1') ?? main) : main;
  element.focus({ preventScroll: true });
}
