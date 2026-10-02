import { metaOf, type Route } from '../routes';

export interface SummaryPageProps {
  readonly route: Extract<Route, { name: 'results' | 'bottleneck' | 'buy' | 'sources' }>;
}

/** Results, bottleneck analysis, buy sheet and sources: empty until Phase 4. */
export function SummaryPage({ route }: SummaryPageProps) {
  const meta = metaOf(route);
  return (
    <>
      <h1 tabIndex={-1}>{meta.heading}</h1>
      <p>{meta.description}</p>
      <p>Placeholder: this page arrives in Phase 4.</p>
    </>
  );
}
