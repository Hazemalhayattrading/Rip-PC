import { describe, expect, it } from 'vitest';
import { syncRobotsMeta, type RobotsDocument } from './robots-meta';

/** A head with real tag bookkeeping: what the browser's document would hold. */
function fakeDocument(initial: readonly { name: string; content: string }[] = []) {
  const tags: { name: string; content: string; removed: boolean }[] = initial.map((tag) => ({
    ...tag,
    removed: false,
  }));
  const live = () => tags.filter((tag) => !tag.removed);
  const detached = new Map<object, (typeof tags)[number]>();
  const elementOf = (tag: (typeof tags)[number]) => ({
    get name() {
      return tag.name;
    },
    set name(value: string) {
      tag.name = value;
    },
    get content() {
      return tag.content;
    },
    set content(value: string) {
      tag.content = value;
    },
    remove() {
      tag.removed = true;
    },
  });
  const doc: RobotsDocument = {
    querySelector: () => {
      const found = live().find((tag) => tag.name === 'robots');
      return found === undefined ? null : elementOf(found);
    },
    createElement: () => {
      // Detached until appended to the head.
      const tag = { name: '', content: '', removed: true };
      const element = elementOf(tag);
      detached.set(element, tag);
      return element;
    },
    head: {
      append: (element) => {
        const tag = detached.get(element);
        if (tag === undefined) throw new Error('appended an element this document did not create');
        tag.removed = false;
        tags.push(tag);
      },
    },
  };
  return { doc, robots: () => live().filter((tag) => tag.name === 'robots') };
}

describe('syncRobotsMeta', () => {
  it('adds the noindex tag when a page that is not indexable has none', () => {
    const { doc, robots } = fakeDocument();
    syncRobotsMeta(doc, false);
    expect(robots()).toEqual([{ name: 'robots', content: 'noindex', removed: false }]);
  });

  it('keeps the one tag the static HTML already has, without adding a second', () => {
    const { doc, robots } = fakeDocument([{ name: 'robots', content: 'noindex' }]);
    syncRobotsMeta(doc, false);
    syncRobotsMeta(doc, false);
    expect(robots()).toHaveLength(1);
    expect(robots()[0]?.content).toBe('noindex');
  });

  it('drops the tag when the visitor moves on to an indexable page', () => {
    const { doc, robots } = fakeDocument([{ name: 'robots', content: 'noindex' }]);
    syncRobotsMeta(doc, true);
    expect(robots()).toEqual([]);
  });

  it('leaves an indexable page without a tag as it is', () => {
    const { doc, robots } = fakeDocument();
    syncRobotsMeta(doc, true);
    expect(robots()).toEqual([]);
  });

  it('turns a robots tag that says something else into noindex', () => {
    const { doc, robots } = fakeDocument([{ name: 'robots', content: 'all' }]);
    syncRobotsMeta(doc, false);
    expect(robots()).toEqual([{ name: 'robots', content: 'noindex', removed: false }]);
  });
});
