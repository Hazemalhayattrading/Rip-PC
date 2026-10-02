import { useId } from 'react';
import type { SpecRecordByCategory } from '../../data/schema';
import type { Catalogue } from '../../engine/types';
import type { RigBuild } from '../../state/build-codec';
import { buildStore } from '../../state/build-store';
import { PART_CATEGORIES, type PartCategory } from '../../state/categories';
import { CATEGORY_LABELS, partLabel } from './lab-text';

/** A native select on the tokens: control border in ink-3, the panel surface behind it. */
export const SELECT =
  'mt-1 block w-full min-h-6 rounded-control border border-ink-3 bg-surface px-3 py-2 type-body';

export interface PartPickerProps {
  readonly catalogue: Catalogue;
  /** The build's picks, from the build store. */
  readonly build: RigBuild;
}

/**
 * The lab's shared part picker: one native select per build category, with the catalogue's
 * parts. A pick goes through the build store, so it lands in the URL through the build codec and
 * every lab link opens the same build. The compat, power, games, creator and bottleneck pages
 * reuse it.
 */
export function PartPicker({ catalogue, build }: PartPickerProps) {
  return (
    <fieldset className="mt-8">
      <legend className="type-heading">Parts in this build</legend>
      <p className="mt-1 max-w-prose text-ink-2">
        Each pick goes into this page’s link, so the link opens the same build.
      </p>
      <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        {PART_CATEGORIES.map((category) => (
          <CategoryPicker
            key={category}
            category={category}
            parts={catalogue.parts[category]}
            picked={build[category] ?? null}
          />
        ))}
      </div>
    </fieldset>
  );
}

function pick(category: PartCategory, id: string): void {
  const store = buildStore.getState();
  if (id === '') store.clear(category);
  else store.select(category, id);
}

interface CategoryPickerProps {
  readonly category: PartCategory;
  readonly parts: readonly SpecRecordByCategory[PartCategory][];
  readonly picked: string | null;
}

function CategoryPicker({ category, parts, picked }: CategoryPickerProps) {
  const id = useId();
  const unknown = picked !== null && !parts.some((part) => part.id === picked) ? picked : null;
  return (
    <div>
      <label htmlFor={id} className="block type-label">
        {CATEGORY_LABELS[category]}
      </label>
      <select
        id={id}
        value={picked ?? ''}
        onChange={(event) => {
          pick(category, event.target.value);
        }}
        aria-describedby={unknown === null ? undefined : `${id}-unknown`}
        className={SELECT}
      >
        <option value="">Not picked</option>
        {unknown === null ? null : (
          <option value={unknown} disabled>
            Unknown part: {unknown}
          </option>
        )}
        {parts.map((part) => (
          <option key={part.id} value={part.id}>
            {partLabel(part)}
          </option>
        ))}
      </select>
      {unknown === null ? null : (
        <p id={`${id}-unknown`} className="mt-1 type-small">
          Unknown part in this link: {unknown}
        </p>
      )}
    </div>
  );
}

export interface ChipPickerProps {
  readonly chips: readonly SpecRecordByCategory['gpu-chip'][];
  /** The chip from the link's `chip` parameter, or `null`. */
  readonly picked: string | null;
  readonly onPick: (id: string) => void;
}

/**
 * Any GPU chip, picked on its own: some chips have no card in the catalogue, and a build picks
 * cards. The pick is a lab-only `chip` parameter in the link, next to the build.
 */
export function ChipPicker({ chips, picked, onPick }: ChipPickerProps) {
  const id = useId();
  const unknown = picked !== null && !chips.some((chip) => chip.id === picked) ? picked : null;
  return (
    <div className="mt-6 max-w-md">
      <label htmlFor={id} className="block type-label">
        GPU chip, without a card
      </label>
      <select
        id={id}
        value={picked ?? ''}
        onChange={(event) => {
          onPick(event.target.value);
        }}
        aria-describedby={unknown === null ? `${id}-hint` : `${id}-hint ${id}-unknown`}
        className={SELECT}
      >
        <option value="">Not picked</option>
        {unknown === null ? null : (
          <option value={unknown} disabled>
            Unknown part: {unknown}
          </option>
        )}
        {chips.map((chip) => (
          <option key={chip.id} value={chip.id}>
            {partLabel(chip)}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="mt-1 type-small text-ink-2">
        For a chip that no card in the catalogue is built on. A picked card shows its own chip.
      </p>
      {unknown === null ? null : (
        <p id={`${id}-unknown`} className="mt-1 type-small">
          Unknown part in this link: {unknown}
        </p>
      )}
    </div>
  );
}
