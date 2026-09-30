import { AppLink } from '../AppLink';
import { metaOf, pathOf, suggestRoute } from '../routes';

export interface NotFoundPageProps {
  /** The path that did not match, relative to the base. */
  readonly path: string;
}

export function NotFoundPage({ path }: NotFoundPageProps) {
  const meta = metaOf({ name: 'not-found' });
  const suggestion = suggestRoute(path);
  return (
    <>
      <h1>{meta.heading}</h1>
      <p>{meta.description}</p>
      {suggestion === null ? null : (
        <p>
          Did you mean <AppLink to={pathOf(suggestion)}>{metaOf(suggestion).heading}</AppLink>?
        </p>
      )}
      <p>
        <AppLink to={pathOf({ name: 'home' })}>Go to the home page</AppLink>
      </p>
    </>
  );
}
