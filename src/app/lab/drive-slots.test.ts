import { describe, expect, it } from 'vitest';
import { addSlot, drivesOf, removeSlot, setSlot, slotsFor } from './drive-slots';

describe('drive slots', () => {
  it('open with one empty slot, or one slot per drive in the build', () => {
    expect(slotsFor([], null)).toEqual([{ key: 0, partId: null }]);
    expect(slotsFor(['a', 'b', 'a'], null)).toEqual([
      { key: 0, partId: 'a' },
      { key: 1, partId: 'b' },
      { key: 2, partId: 'a' },
    ]);
  });

  it('keep the slots on screen while they still hold the build’s drives', () => {
    const slots = [
      { key: 0, partId: 'a' },
      { key: 3, partId: null },
    ];
    expect(slotsFor(['a'], slots)).toBe(slots);
    expect(slotsFor(['a', 'c'], slots)).toEqual([
      { key: 0, partId: 'a' },
      { key: 1, partId: 'c' },
    ]);
  });

  it('give the build the picked drives in slot order, skipping empty slots', () => {
    expect(
      drivesOf([
        { key: 0, partId: 'a' },
        { key: 4, partId: null },
        { key: 2, partId: 'b' },
      ]),
    ).toEqual(['a', 'b']);
  });

  it('pick, add and remove by key, so a slot keeps its place and its select', () => {
    const one = [{ key: 0, partId: null }];
    const picked = setSlot(one, 0, 'a');
    expect(picked).toEqual([{ key: 0, partId: 'a' }]);
    const added = addSlot(picked);
    expect(added).toEqual([
      { key: 0, partId: 'a' },
      { key: 1, partId: null },
    ]);
    expect(setSlot(added, 1, 'b')).toEqual([
      { key: 0, partId: 'a' },
      { key: 1, partId: 'b' },
    ]);
    expect(setSlot(added, 0, null)).toEqual([
      { key: 0, partId: null },
      { key: 1, partId: null },
    ]);
    expect(removeSlot(added, 1)).toEqual([{ key: 0, partId: 'a' }]);
  });

  it('give a new slot a key no other slot has, after a removal too', () => {
    const slots = addSlot(addSlot([{ key: 0, partId: 'a' }]));
    const keys = addSlot(removeSlot(slots, 1)).map((slot) => slot.key);
    expect(keys).toEqual([0, 2, 3]);
  });
});
