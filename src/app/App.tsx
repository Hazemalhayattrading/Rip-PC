import { Suspense, lazy, useEffect } from 'react';
import { Router, useLocation, useSearch } from 'wouter';
import { ErrorBoundary } from './ErrorBoundary';
import { BuildStepPage } from './pages/BuildStepPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { syncRobotsMeta } from './robots-meta';
import { matchPath, metaOf, type LabPage, type RouteMatch } from './routes';
import { SiteLayout } from './SiteLayout';

// The only door into src/app/lab. Vite makes this dynamic import its own chunk, so the lab, the
// engine helpers and the catalogue loader never reach the product pages' initial JS (plan §1).
const EngineLab = lazy(() => import('./lab/EngineLab'));

/** A thrown value as words, for an error message. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Wouter takes the base without its trailing slash: `/Rip-PC`. */
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface AppProps {
  /** Called after every navigation, so the URL can be brought back in line with the build. */
  readonly onNavigate: () => void;
}

export function App({ onNavigate }: AppProps) {
  return (
    <Router base={ROUTER_BASE}>
      <Pages onNavigate={onNavigate} />
    </Router>
  );
}

function Pages({ onNavigate }: AppProps) {
  const [location] = useLocation();
  const search = useSearch();
  const match = matchPath(location);
  const { title, indexable } = metaOf(match);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // The static HTML of a lab page carries the noindex tag; in-app navigation must keep it right.
  useEffect(() => {
    syncRobotsMeta<HTMLMetaElement>(document, indexable);
  }, [indexable]);

  useEffect(() => {
    onNavigate();
  }, [location, search, onNavigate]);

  return (
    <SiteLayout match={match} location={location}>
      <Page match={match} location={location} />
    </SiteLayout>
  );
}

function Page({ match, location }: { readonly match: RouteMatch; readonly location: string }) {
  switch (match.name) {
    case 'home':
      return <HomePage />;
    case 'build':
      return <BuildStepPage step={match.step} />;
    case 'results':
    case 'bottleneck':
    case 'buy':
    case 'sources':
      return <SummaryPage route={match} />;
    case 'lab':
      return <LabFrame page={match.page} />;
    case 'not-found':
      return <NotFoundPage path={location} />;
  }
}

/**
 * A lab page's frame. The heading is static route meta, so it renders at once; everything else
 * is in the lazy lab chunk. While the chunk loads, the box below the heading holds a screen's
 * height, so the footer never jumps into view and back (no layout shift).
 */
function LabFrame({ page }: { readonly page: LabPage }) {
  return (
    <div className="px-inset pb-12">
      <h1>{metaOf({ name: 'lab', page }).heading}</h1>
      <ErrorBoundary
        fallback={(error) => (
          <p role="alert" className="mt-6 max-w-prose">
            The Engine lab could not load ({errorMessage(error)}). Reload the page to try again.
          </p>
        )}
      >
        <Suspense
          fallback={
            <div className="min-h-screen">
              <p className="mt-6 text-ink-2">Loading the Engine lab…</p>
            </div>
          }
        >
          <EngineLab page={page} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
