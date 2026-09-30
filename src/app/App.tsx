import { useEffect } from 'react';
import { Router, useLocation, useSearch } from 'wouter';
import { BuildStepPage } from './pages/BuildStepPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { matchPath, metaOf, type RouteMatch } from './routes';
import { SiteLayout } from './SiteLayout';

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
  const { title } = metaOf(match);

  useEffect(() => {
    document.title = title;
  }, [title]);

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
    case 'not-found':
      return <NotFoundPage path={location} />;
  }
}
