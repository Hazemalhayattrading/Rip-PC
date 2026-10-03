/**
 * The drive selects of the lab's picker (lab-spec §2): "Drive 1", then one more for each "Add a
 * drive". A slot can be empty until a part is picked in it, but a link can't hold an empty drive,
 * so the build gets the picked drives only, in slot order. Slots have stable keys, so a select
 * keeps its place and its focus when a slot before it changes. Pure.
 */

export interface DriveSlot {
  readonly key: number;
  /** The drive picked in this slot, or `null` while it is empty. */
  readonly partId: string | null;
}

/** The build's drives, in slot order: the empty slots left out. */
export function drivesOf(slots: readonly DriveSlot[]): string[] {
  return slots.flatMap((slot) => (slot.partId === null ? [] : [slot.partId]));
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * The slots to show for the build's drives: the slots on screen while they still hold exactly
 * those drives (an empty slot the visitor added stays), else one slot per drive, or one empty
 * slot when the build has none.
 */
export function slotsFor(
  drives: readonly string[],
  current: readonly DriveSlot[] | null,
): readonly DriveSlot[] {
  if (current !== null && sameList(drivesOf(current), drives)) return current;
  return drives.length === 0
    ? [{ key: 0, partId: null }]
    : drives.map((partId, key) => ({ key, partId }));
}

/** The slots with a part picked in one of them, or that slot emptied (`null`). */
export function setSlot(
  slots: readonly DriveSlot[],
  key: number,
  partId: string | null,
): DriveSlot[] {
  return slots.map((slot) => (slot.key === key ? { key, partId } : slot));
}

/** The slots with an empty one added at the end. */
export function addSlot(slots: readonly DriveSlot[]): DriveSlot[] {
  const key = slots.reduce((max, slot) => Math.max(max, slot.key), -1) + 1;
  return [...slots, { key, partId: null }];
}

/** The slots without one. */
export function removeSlot(slots: readonly DriveSlot[], key: number): DriveSlot[] {
  return slots.filter((slot) => slot.key !== key);
}
