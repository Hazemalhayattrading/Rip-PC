import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'wouter';
import { buildStore } from '../../state/build-store';
import { useBuild } from '../build-hooks';
import { partsPageHref, type PartTarget } from './lab-links';

/**
 * A link to the parts page with this part in view. For a build part, a plain click picks it into
 * the build first: the store leads and the link follows (src/state/url-sync.ts). A click that
 * opens a new tab leaves this page's build alone. A GPU chip rides in the link's `chip` parameter.
 */
export function PartLink({
  target,
  children,
}: {
  readonly target: PartTarget;
  readonly children: ReactNode;
}) {
  const build = useBuild((state) => state.selections);
  function pick(event: MouseEvent<HTMLAnchorElement>): void {
    if (target.category === 'gpu-chip') return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    buildStore.getState().select(target.category, target.id);
  }
  return (
    <Link href={partsPageHref(build, target)} onClick={pick} translate="no">
      {children}
    </Link>
  );
}
