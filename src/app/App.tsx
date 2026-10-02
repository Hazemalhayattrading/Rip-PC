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
import { usePageArrival } from './use-page-arrival';

// The only door into src/app/lab: the whole Engine lab, its frame included, is this lazy chunk,
// so no lab UI, engine helper or catalogue loader reaches the product pages' initial JS (plan §1).
const EngineLab = lazy(() => import('./lab/EngineLab'));

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

  usePageArrival(location);

  useEffect(() => {
    onNavigate();
  }, [location, search, onNavigate]);

  return match.name === 'lab' ? (
    <LabRoute page={match.page} />
  ) : (
    <SiteLayout match={match}>
      <Page match={match} location={location} />
    </SiteLayout>
  );
}

function Page({
  match,
  location,
}: {
  readonly match: Exclude<RouteMatch, { name: 'lab' }>;
  readonly location: string;
}) {
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
    case 'not-found':
      return <NotFoundPage path={location} />;
  }
}

/**
 * A lab page. While the lab chunk loads, nothing is drawn, so nothing can move when the whole
 * frame appears at once (CLS 0). If the chunk fails to download, a bare page says so.
 */
function LabRoute({ page }: { readonly page: LabPage }) {
  return (
    <ErrorBoundary
      fallback={() => (
        <main id="main" tabIndex={-1}>
          <h1 tabIndex={-1}>{metaOf({ name: 'lab', page }).heading}</h1>
          <p role="alert">The Engine lab didn’t load. Reload the page to try again.</p>
        </main>
      )}
    >
      <Suspense fallback={null}>
        <EngineLab page={page} />
      </Suspense>
    </ErrorBoundary>
  );
}
