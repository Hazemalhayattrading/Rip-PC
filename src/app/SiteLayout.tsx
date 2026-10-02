import type { ReactNode } from 'react';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { AppLink } from './AppLink';
import { useBuild } from './build-hooks';
import { pathOf, type Route, type RouteMatch } from './routes';

interface SiteLink {
  readonly label: string;
  readonly route: Route;
}

const SITE_LINKS: readonly SiteLink[] = [
  { label: 'Home', route: { name: 'home' } },
  { label: 'Build', route: { name: 'build', step: 'use-case' } },
  { label: 'Results', route: { name: 'results' } },
  { label: 'Bottleneck analysis', route: { name: 'bottleneck' } },
  { label: 'Buy sheet', route: { name: 'buy' } },
  { label: 'Sources', route: { name: 'sources' } },
];

/** `page` for the exact page, `true` for the section it belongs to (any build step). */
function currentness(link: Route, match: RouteMatch): 'page' | 'true' | undefined {
  if (match.name === 'not-found' || link.name !== match.name) return undefined;
  return pathOf(link) === pathOf(match) ? 'page' : 'true';
}

export interface SiteLayoutProps {
  readonly match: RouteMatch;
  readonly children: ReactNode;
}

/**
 * The frame around every product page: skip link, site navigation, the theme toggle, one
 * `<main>` and a footer. Semantic HTML on the tokens' base styles only; Studio's frame arrives in
 * Phase 2. The Engine lab has a frame of its own, in its lazy chunk (src/app/lab/EngineLab.tsx).
 * After in-app navigation, `usePageArrival` in App.tsx settles focus and scroll.
 */
export function SiteLayout({ match, children }: SiteLayoutProps) {
  const decodeError = useBuild((state) => state.decodeError);
  return (
    <>
      <a href="#main">Skip to main content</a>
      <header>
        <nav aria-label="Site">
          <ul role="list">
            {SITE_LINKS.map((link) => (
              <li key={link.label}>
                <AppLink to={pathOf(link.route)} aria-current={currentness(link.route, match)}>
                  {link.label}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </header>
      <main id="main" tabIndex={-1}>
        {decodeError === null ? null : (
          <p role="status">
            The build in this link could not be read, so you are starting with an empty build.
          </p>
        )}
        {children}
      </main>
      <footer>
        <p>Rig Lab is in development: there are no parts, prices or estimates on this site yet.</p>
      </footer>
    </>
  );
}
