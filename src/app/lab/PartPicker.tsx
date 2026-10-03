/**
 * The lab's shared part picker (lab-spec §2): a "Build" panel of native selects, one field per
 * category in the codec's order, labelled with the route table's step labels. Every pick goes
 * through the build store, so it lands in the link through the build codec, and the results
 * change in the same frame: no loading state, no debounce. While the catalogue loads, every
 * select and button is disabled.
 *
 * The parts page uses it in one-part mode: a category select, then that category's field.
 * WP-E1 to WP-E5 put every category's field in the panel.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SpecRecord } from '../../data/schema';
import { displayName } from '../../engine/names';
import type { Catalogue } from '../../engine/types';
import { MAX_PART_ID_LENGTH, type RigBuild } from '../../state/build-codec';
import { buildStore } from '../../state/build-store';
import type { SinglePartCategory } from '../../state/categories';
import { canAddDrive } from '../../state/drives';
import { addSlot, drivesOf, removeSlot, setSlot, slotsFor, type DriveSlot } from './drive-slots';
import { PICKER_CATEGORIES, PICKER_LABELS, type PickerCategory } from './lab-links';

/** The panel, with its heading and hint, around the picker's fields. */
export function PickerPanel({ children }: { readonly children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-panel border border-line bg-surface p-5 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto"
    >
      <h2 id={headingId}>Build</h2>
      <p className="mt-1 type-small text-ink-3">
        The link holds these parts, so you can share this exact build.
      </p>
      <div className="mt-4 grid gap-4 md:max-lg:grid-cols-2">{children}</div>
    </section>
  );
}

/** The 18 px chevron, its colour on its wrapper so it follows forced colours (lab-spec §3). */
function Chevron() {
  return (
    <span
      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3 peer-disabled:opacity-40"
      aria-hidden="true"
    >
      <svg
        className="size-4.5"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 7l4 4 4-4" />
      </svg>
    </span>
  );
}

const SELECT =
  'peer min-h-11 w-full appearance-none text-ellipsis rounded-row border border-ink-3 bg-surface pr-10 pl-3 type-name text-ink disabled:opacity-40';
const OPTION = 'bg-surface text-ink';
const LABEL = 'mb-1.5 block type-small text-ink-2';

interface SelectFieldProps {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  /** The `<option>` elements. */
  readonly children: ReactNode;
  readonly selectRef?: (element: HTMLSelectElement | null) => void;
  /** Something beside the select, such as a remove button. */
  readonly after?: ReactNode;
}

/** A visible `<label for>`, then a native select with the chevron (lab-spec §2). */
function SelectField({
  label,
  value,
  disabled,
  onChange,
  children,
  selectRef,
  after,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <select
            id={id}
            ref={selectRef}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            className={SELECT}
          >
            {children}
          </select>
          <Chevron />
        </div>
        {after}
      </div>
    </div>
  );
}

/**
 * "None" first, then the parts by display name, sorted with `localeCompare('en')`. While the
 * catalogue loads, or for an id it doesn't have, the picked id stands in, so the select shows what
 * the link holds.
 */
function PartOptions({
  parts,
  picked,
}: {
  readonly parts: readonly SpecRecord[] | null;
  readonly picked: string;
}) {
  const sorted =
    parts === null ? [] : [...parts].map((part) => ({ id: part.id, name: displayName(part) }));
  sorted.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const missing = picked !== '' && !sorted.some((part) => part.id === picked);
  return (
    <>
      <option className={OPTION} value="">
        None
      </option>
      {missing ? (
        <option className={OPTION} value={picked} translate="no">
          {picked}
        </option>
      ) : null}
      {sorted.map((part) => (
        <option key={part.id} className={OPTION} value={part.id} translate="no">
          {part.name}
        </option>
      ))}
    </>
  );
}

export interface CategorySelectProps {
  readonly value: PickerCategory;
  readonly disabled: boolean;
  readonly onChange: (category: PickerCategory) => void;
}

/** One-part mode's first field: which category the page shows. */
export function CategorySelect({ value, disabled, onChange }: CategorySelectProps) {
  return (
    <SelectField
      label="Category"
      value={value}
      disabled={disabled}
      onChange={(next) => {
        const category = PICKER_CATEGORIES.find((option) => option === next);
        if (category !== undefined) onChange(category);
      }}
    >
      {PICKER_CATEGORIES.map((category) => (
        <option key={category} className={OPTION} value={category}>
          {PICKER_LABELS[category]}
        </option>
      ))}
    </SelectField>
  );
}

export interface CategoryFieldProps {
  readonly category: PickerCategory;
  /** `null` while the catalogue loads, or if it failed: the field is disabled. */
  readonly catalogue: Catalogue | null;
  readonly build: RigBuild;
  /** The GPU chip in the link, for the GPU chip field. */
  readonly chip: string | null;
  readonly onChip: (id: string | null) => void;
}

/** The field, or fields, of one category. */
export function CategoryField({ category, catalogue, build, chip, onChip }: CategoryFieldProps) {
  const disabled = catalogue === null;
  switch (category) {
    case 'gpu-chip':
      return (
        <SelectField
          label={PICKER_LABELS['gpu-chip']}
          value={chip ?? ''}
          disabled={disabled}
          onChange={(id) => {
            onChip(id === '' ? null : id);
          }}
        >
          <PartOptions parts={catalogue?.parts['gpu-chip'] ?? null} picked={chip ?? ''} />
        </SelectField>
      );
    case 'storage':
      return <DrivesField catalogue={catalogue} build={build} />;
    case 'case-fan':
      return <FansField catalogue={catalogue} build={build} />;
    case 'cpu':
    case 'motherboard':
    case 'ram':
    case 'gpu-card':
    case 'psu':
    case 'cooler':
    case 'case':
      return <SinglePartField category={category} catalogue={catalogue} build={build} />;
  }
}

function SinglePartField({
  category,
  catalogue,
  build,
}: {
  readonly category: SinglePartCategory;
  readonly catalogue: Catalogue | null;
  readonly build: RigBuild;
}) {
  const picked = build[category] ?? '';
  return (
    <SelectField
      label={PICKER_LABELS[category]}
      value={picked}
      disabled={catalogue === null}
      onChange={(id) => {
        const store = buildStore.getState();
        if (id === '') store.clear(category);
        else store.select(category, id);
      }}
    >
      <PartOptions parts={catalogue?.parts[category] ?? null} picked={picked} />
    </SelectField>
  );
}

/** A drive id as long as a link takes, standing in for an empty slot's future pick. */
const LONGEST_ID = 'a'.repeat(MAX_PART_ID_LENGTH);

/**
 * "Drive 1", then one more select for each "Add a drive", each with "Remove drive n". Focus moves
 * to the new select when one is added, and to "Add a drive" when one is removed (lab-spec §2).
 * The button shows while one more drive still fits the link, counting the empty slots too.
 */
function DrivesField({
  catalogue,
  build,
}: {
  readonly catalogue: Catalogue | null;
  readonly build: RigBuild;
}) {
  const drives = build.storage ?? [];
  // The slots on screen; a change of the build from elsewhere (a link's unknown drive left out)
  // shows at once, because the slots are always read against the build's drives.
  const [slots, setSlots] = useState<readonly DriveSlot[]>(() => slotsFor(drives, null));
  const shown = slotsFor(drives, slots);

  const selects = useRef(new Map<number, HTMLSelectElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<number | 'add' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'add') addButton.current?.focus();
    else if (target !== null) selects.current.get(target)?.focus();
  });

  const disabled = catalogue === null;
  const empty = shown.filter((slot) => slot.partId === null).length;
  const canAdd = canAddDrive({
    ...build,
    storage: [...drives, ...Array.from({ length: empty }, () => LONGEST_ID)],
  });

  function update(next: readonly DriveSlot[]): void {
    setSlots(next);
    buildStore.getState().setDrives(drivesOf(next));
  }

  return (
    <div className="grid gap-4">
      {shown.map((slot, index) => {
        const number = String(index + 1);
        return (
          <SelectField
            key={slot.key}
            label={`Drive ${number}`}
            value={slot.partId ?? ''}
            disabled={disabled}
            selectRef={(element) => {
              if (element === null) selects.current.delete(slot.key);
              else selects.current.set(slot.key, element);
            }}
            onChange={(id) => {
              update(setSlot(shown, slot.key, id === '' ? null : id));
            }}
            after={
              index === 0 ? null : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    focusNext.current = 'add';
                    update(removeSlot(shown, slot.key));
                  }}
                  className="grid size-11 shrink-0 place-items-center rounded-pill text-ink-2 disabled:opacity-40"
                >
                  <svg
                    className="size-4.5"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 5l8 8M13 5l-8 8" />
                  </svg>
                  <span className="sr-only">Remove drive {number}</span>
                </button>
              )
            }
          >
            <PartOptions parts={catalogue?.parts.storage ?? null} picked={slot.partId ?? ''} />
          </SelectField>
        );
      })}
      {canAdd ? (
        <div>
          <button
            ref={addButton}
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = addSlot(shown);
              focusNext.current = next.at(-1)?.key ?? null;
              setSlots(next);
            }}
            className="inline-flex min-h-11 items-center type-control text-ink disabled:opacity-40"
          >
            Add a drive
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Retail packs on offer in the "Packs" select (lab-spec §2). */
const PACKS = [1, 2, 3, 4];

/** One fan model, then a "Packs" select beside it once a model is picked (lab-spec §2). */
function FansField({
  catalogue,
  build,
}: {
  readonly catalogue: Catalogue | null;
  readonly build: RigBuild;
}) {
  const fans = build['case-fan'];
  const disabled = catalogue === null;
  const packs =
    fans === undefined ? [] : [...new Set([...PACKS, fans.packs])].sort((a, b) => a - b);
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <SelectField
          label={PICKER_LABELS['case-fan']}
          value={fans?.partId ?? ''}
          disabled={disabled}
          onChange={(id) => {
            const store = buildStore.getState();
            if (id === '') store.clear('case-fan');
            else store.setFans(id, fans?.packs ?? 1);
          }}
        >
          <PartOptions parts={catalogue?.parts['case-fan'] ?? null} picked={fans?.partId ?? ''} />
        </SelectField>
      </div>
      {fans === undefined ? null : (
        <div className="w-24 shrink-0">
          <SelectField
            label="Packs"
            value={String(fans.packs)}
            disabled={disabled}
            onChange={(value) => {
              buildStore.getState().setFans(fans.partId, Number(value));
            }}
          >
            {packs.map((count) => (
              <option key={count} className={OPTION} value={String(count)}>
                {count}
              </option>
            ))}
          </SelectField>
        </div>
      )}
    </div>
  );
}
