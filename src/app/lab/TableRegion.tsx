import { useId, type ReactNode } from 'react';

export interface LabTableProps {
  /** The table's name: its `<caption>`, and the label shown above it. */
  readonly caption: string;
  /**
   * The id of a heading already on the page that shows the same name. The table then shows no
   * label of its own, and its region is named by that heading.
   */
  readonly labelledBy?: string;
  /** Classes for the `<table>`, such as a minimum width (`min-w-2xl`). */
  readonly className?: string;
  /** `<thead>`, `<tbody>` and `<tfoot>`. */
  readonly children: ReactNode;
}

/**
 * Every lab table. On a narrow screen the table scrolls sideways inside its own region, so the
 * page itself never scrolls sideways. The region is focusable and named, so keyboard users can
 * reach it and scroll it with the arrow keys (WCAG 2.1.1, axe scrollable-region-focusable).
 *
 * The name shows above the region, not in the caption: a caption is as wide as its table, so on a
 * phone it would scroll out of view with it. The `<caption>` stays, visually hidden, so the
 * table keeps its own name for screen readers. The visible label is hidden from them, because the
 * region and the caption already say it.
 */
export function LabTable({ caption, labelledBy, className = '', children }: LabTableProps) {
  const ownLabelId = useId();
  const labelId = labelledBy ?? ownLabelId;
  return (
    <div className="mt-6">
      {labelledBy === undefined ? (
        <p id={ownLabelId} aria-hidden="true" className="type-label">
          {caption}
        </p>
      ) : null}
      <div
        role="region"
        aria-labelledby={labelId}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must take focus to be scrolled by keyboard (see above).
        tabIndex={0}
        className="mt-2 max-w-full overflow-x-auto"
      >
        <table className={`border-collapse text-left align-top type-small ${className}`}>
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}

/** Cell classes shared by the lab's tables, so they all read alike. */
export const TH = 'border-b border-line px-3 py-2 align-bottom font-semibold';
export const TH_ROW = 'border-b border-line px-3 py-2 align-top font-normal';
export const TD = 'border-b border-line px-3 py-2 align-top';
export const TD_NUMBER = 'border-b border-line px-3 py-2 text-right align-top';
