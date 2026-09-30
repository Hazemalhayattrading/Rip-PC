import { useEffect } from 'react';
import { matchPath, metaOf } from './routes';

/** The path relative to the base, e.g. `/Rip-PC/build/cpu` becomes `/build/cpu`. */
function relativePath(pathname: string, base: string): string {
  return pathname.startsWith(base) ? `/${pathname.slice(base.length)}` : pathname;
}

export function App() {
  const match = matchPath(relativePath(window.location.pathname, import.meta.env.BASE_URL));
  const meta = metaOf(match);

  useEffect(() => {
    document.title = meta.title;
  }, [meta.title]);

  return (
    <main>
      <h1>{meta.heading}</h1>
    </main>
  );
}
