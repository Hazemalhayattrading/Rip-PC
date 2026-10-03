import type { ReactNode, UIEvent } from 'react';

export interface TableRegionProps {
  /** The table's name: the region's label and the table's caption. */
  readonly label: string;
  /** Classes for the `<table>`, such as a minimum width. */
  readonly className?: string;
  /** `<thead>` and `<tbody>`. */
  readonly children: ReactNode;
}

/** Marks the region while it is scrolled sideways, so the first column draws its edge. */
function markScrolled(event: UIEvent<HTMLDivElement>): void {
  const region = event.currentTarget;
  if (region.scrollLeft > 0) region.dataset.scrolled = '';
  else delete region.dataset.scrolled;
}

/**
 * A wide lab table (lab-spec §8). It scrolls sideways inside its own region, so the page never
 * does. The region is focusable and named, so keyboard users can reach and scroll it (axe
 * scrollable-region-focusable), with `p-1` inside so focus rings survive. The header row sticks
 * to the top and the first column to the left, on the panel colour; the first column draws its
 * edge once the table is scrolled.
 */
export function TableRegion({ label, className = '', children }: TableRegionProps) {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must take focus to be scrolled by keyboard (lab-spec §8).
      tabIndex={0}
      onScroll={markScrolled}
      // relative: the visually hidden text in the cells is absolutely positioned, and without a
      // positioned ancestor here it would escape the region and widen the page.
      className="group relative overflow-x-auto p-1"
    >
      <table className={`border-separate border-spacing-0 text-left type-small ${className}`}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

/** The header row: sticky, on the panel colour. */
export const THEAD = 'sticky top-0 bg-surface';
const HEADER = 'border-b border-line px-3 py-2 align-bottom font-normal text-ink-2';
/** A column header. */
export const TH = `${HEADER} text-left`;
/** A column header over numbers: right-aligned. */
export const TH_NUMBER = `${HEADER} text-right whitespace-nowrap`;
/** The first column, header and body: sticky on the left, its edge drawn once scrolled. */
export const FIRST = 'sticky left-0 bg-surface border-line group-data-scrolled:border-r';
/** A row header in the first column. */
export const TH_ROW = `${FIRST} border-b px-3 py-2 text-left align-top font-normal text-ink`;
/** A cell. */
export const TD = 'border-b border-line px-3 py-2 align-top text-ink';
/** A cell that holds a number only: right-aligned and tabular. */
export const TD_NUMBER = `${TD} text-right tabular-nums`;
