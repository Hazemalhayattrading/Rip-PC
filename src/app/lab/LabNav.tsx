import { AppLink } from '../AppLink';
import { LAB_PAGES, pathOf, type LabPage } from '../routes';
import { LAB_PAGE_LABELS } from './lab-pages';

/**
 * The lab's own navigation. It is not in the site navigation (plan §1). Links carry the build,
 * as every in-app link does, so a pick on one lab page is still there on the next.
 */
export function LabNav({ current }: { readonly current: LabPage }) {
  return (
    <nav aria-label="Engine lab" className="mt-4">
      <ul role="list" className="flex flex-wrap gap-x-6 gap-y-1">
        {LAB_PAGES.map((page) => (
          <li key={page}>
            <AppLink
              to={pathOf({ name: 'lab', page })}
              aria-current={page === current ? 'page' : undefined}
              className="inline-flex min-h-6 items-center aria-[current=page]:font-semibold aria-[current=page]:no-underline"
            >
              {LAB_PAGE_LABELS[page]}
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
