import { useEffect, useRef, type ReactNode } from 'react';
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
  /** The current path, used to move focus to the new page after in-app navigation. */
  readonly location: string;
  readonly children: ReactNode;
}

/**
 * The frame around every page: skip link, site navigation, one `<main>` and a footer.
 * Semantic HTML only; the visual design arrives with the chosen direction.
 */
export function SiteLayout({ match, location, children }: SiteLayoutProps) {
  const decodeError = useBuild((state) => state.decodeError);
  const main = useRef<HTMLElement>(null);
  const shownLocation = useRef(location);

  // After in-app navigation, move focus to the new page so keyboard and screen reader users
  // start at its content, as they would after a full page load.
  useEffect(() => {
    if (shownLocation.current === location) return;
    shownLocation.current = location;
    main.current?.focus();
  }, [location]);

  return (
    <>
      <a href="#main">Skip to main content</a>
      <header>
        <nav aria-label="Site">
          <ul>
            {SITE_LINKS.map((link) => (
              <li key={link.label}>
                <AppLink to={pathOf(link.route)} aria-current={currentness(link.route, match)}>
                  {link.label}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
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
