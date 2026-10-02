import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_FOCUS,
  focusNewPage,
  settleNewPage,
  trackArrival,
  type NavigationFocus,
  type PageView,
} from './navigation-focus';

/** A page view that records what was done to it, in order. */
function recordingView(): PageView & { done: string[] } {
  const done: string[] = [];
  return {
    done,
    scrollToTop: () => done.push('scroll to top'),
    focus: (target: NavigationFocus) => done.push(`focus ${target}`),
  };
}

describe('trackArrival', () => {
  it('treats the first page as a route change', () => {
    expect(trackArrival(new EventTarget()).current()).toBe('route-change');
  });

  it('marks Back and Forward, which fire popstate, as a history traversal', () => {
    const window = new EventTarget();
    const tracker = trackArrival(window);
    window.dispatchEvent(new Event('popstate'));
    expect(tracker.current()).toBe('history-traversal');
  });

  it('marks a new history entry, which wouter announces as pushState, as a route change', () => {
    const window = new EventTarget();
    const tracker = trackArrival(window);
    window.dispatchEvent(new Event('popstate'));
    window.dispatchEvent(new Event('pushState'));
    expect(tracker.current()).toBe('route-change');
  });

  it('keeps the last arrival through in-page changes, which only replace the entry', () => {
    // The build in ?b= is rewritten with replaceState, also right after Back.
    const window = new EventTarget();
    const tracker = trackArrival(window);
    window.dispatchEvent(new Event('popstate'));
    window.dispatchEvent(new Event('replaceState'));
    window.dispatchEvent(new Event('hashchange'));
    expect(tracker.current()).toBe('history-traversal');
  });

  it('stops listening once disconnected', () => {
    const window = new EventTarget();
    const tracker = trackArrival(window);
    tracker.disconnect();
    window.dispatchEvent(new Event('popstate'));
    expect(tracker.current()).toBe('route-change');
  });
});

describe('settleNewPage', () => {
  it.each<NavigationFocus>(['main', 'h1'])(
    'after a route change, jumps to the top first, then focuses %s',
    (target) => {
      const view = recordingView();
      settleNewPage('route-change', view, target);
      expect(view.done).toEqual(['scroll to top', `focus ${target}`]);
    },
  );

  it.each<NavigationFocus>(['main', 'h1'])(
    'after Back or Forward, leaves the restored scroll alone and focuses %s',
    (target) => {
      const view = recordingView();
      settleNewPage('history-traversal', view, target);
      expect(view.done).toEqual([`focus ${target}`]);
    },
  );

  it('focuses the shipped target when none is given', () => {
    const view = recordingView();
    settleNewPage('route-change', view);
    expect(view.done).toEqual(['scroll to top', `focus ${NAVIGATION_FOCUS}`]);
  });
});

/** A focusable element that records how it was focused. */
function focusable() {
  const calls: (FocusOptions | undefined)[] = [];
  return { calls, focus: (options?: FocusOptions) => calls.push(options) };
}

describe('focusNewPage', () => {
  it('focuses main without scrolling', () => {
    const h1 = focusable();
    const main = { ...focusable(), querySelector: () => h1 };
    focusNewPage(main, 'main');
    expect(main.calls).toEqual([{ preventScroll: true }]);
    expect(h1.calls).toEqual([]);
  });

  it('focuses the h1 inside main without scrolling', () => {
    const h1 = focusable();
    const asked: string[] = [];
    const main = {
      ...focusable(),
      querySelector: (selector: string) => {
        asked.push(selector);
        return h1;
      },
    };
    focusNewPage(main, 'h1');
    expect(asked).toEqual(['h1']);
    expect(h1.calls).toEqual([{ preventScroll: true }]);
    expect(main.calls).toEqual([]);
  });

  it('falls back to main when the page has no h1 yet', () => {
    const main = { ...focusable(), querySelector: () => null };
    focusNewPage(main, 'h1');
    expect(main.calls).toEqual([{ preventScroll: true }]);
  });
});
