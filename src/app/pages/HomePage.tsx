import { AppLink } from '../AppLink';
import { metaOf, pathOf } from '../routes';

export function HomePage() {
  const meta = metaOf({ name: 'home' });
  return (
    <>
      <h1 tabIndex={-1}>{meta.heading}</h1>
      <p>{meta.description}</p>
      <p>
        <AppLink to={pathOf({ name: 'build', step: 'use-case' })}>Start a build</AppLink>
      </p>
    </>
  );
}
