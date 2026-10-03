import { AppLink } from '../AppLink';
import { LAB_PAGES, pathOf, type LabPage } from '../routes';
import { LAB_PAGE_LABELS } from './lab-pages';
import { LabThemeToggle } from './LabThemeToggle';

/**
 * The lab's header (docs/design/lab-spec.md §1). Not sticky, so it never covers focused content.
 * Row 1: the wordmark, a link home; the dashed "internal preview" marker, which is not a control;
 * the theme toggle at the end. Row 2: the lab nav, which lists only pages that exist and marks the
 * current one in words and with an underline, never by colour alone. Its links carry the build,
 * as every in-app link does. Standalone links are 24 px tall, and 44 px on touch screens
 * (components.md §4).
 */
export function LabHeader({ current }: { readonly current: LabPage }) {
  return (
    <header className="px-inset pt-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <AppLink
          to={pathOf({ name: 'home' })}
          className="inline-flex min-h-6 items-center type-wordmark text-ink no-underline pointer-coarse:min-h-11"
        >
          Rig Lab
        </AppLink>
        <span className="rounded-pill border border-dashed border-line bg-surface px-2.5 py-0.5 type-caption text-ink-2">
          Engine lab: internal preview
        </span>
        <LabThemeToggle />
      </div>
      <nav aria-label="Engine lab" className="mt-3">
        <ul role="list" className="flex flex-wrap gap-x-5 gap-y-1">
          {LAB_PAGES.map((page) => (
            <li key={page}>
              <AppLink
                to={pathOf({ name: 'lab', page })}
                aria-current={page === current ? 'page' : undefined}
                className="inline-flex min-h-6 items-center type-control text-ink-2 no-underline pointer-coarse:min-h-11 aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-ink aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[6px]"
              >
                {LAB_PAGE_LABELS[page]}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
