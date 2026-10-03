import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  focusNewPage,
  settleNewPage,
  settleSamePath,
  trackArrival,
  type ArrivalTracker,
  type PageView,
} from './navigation-focus';

let tracker: ArrivalTracker | null = null;

/** The one listener for Back and Forward, started on first use. */
function arrivalTracker(): ArrivalTracker {
  tracker ??= trackArrival(window);
  return tracker;
}

const pageView: PageView = {
  scrollToTop: () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  },
  focus: (target) => {
    // The lab's <main> is in its lazy chunk: on the first move into the lab it may not be there
    // yet, and then only the scroll is settled.
    const main = document.getElementById('main');
    if (main !== null) focusNewPage(main, target);
  },
};

/**
 * Settles focus and scroll when the shown path changes (navigation-focus.ts). Called once, from
 * the component above every layout, so a move between a product page and a lab page, which swaps
 * the layout, counts as well. A layout effect, so the jump to the top comes before the new page
 * is painted. A change of the query alone (a pick, a chip) is not a new path, so it moves nothing.
 * A link to the page already shown renders nothing new, so its history event settles it.
 */
export function usePageArrival(location: string): void {
  const shown = useRef(location);
  /** The address bar's path of the page on screen, which a link to that same page pushes again. */
  const shownPath = useRef(window.location.pathname);

  // Listen for Back and Forward from the first render on, so the first one is told apart.
  useEffect(() => {
    arrivalTracker();
    return settleSamePath(
      window,
      () => window.location.pathname === shownPath.current,
      (arrival) => {
        settleNewPage(arrival, pageView);
      },
    );
  }, []);

  useLayoutEffect(() => {
    if (shown.current === location) return;
    shown.current = location;
    shownPath.current = window.location.pathname;
    settleNewPage(arrivalTracker().current(), pageView);
  }, [location]);
}
