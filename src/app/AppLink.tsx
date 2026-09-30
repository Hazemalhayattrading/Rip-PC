import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'wouter';
import { hrefWithBuild } from '../state/url-sync';
import { useEncodedBuild } from './build-hooks';

export type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  /** A path from the route table, relative to the base, e.g. `/build/cpu`. */
  readonly to: string;
};

/**
 * An in-app link that carries the current build (`?b=…`), so the build survives navigation.
 * The router adds the base path, so `to="/results"` renders `href="/Rip-PC/results?b=…"`.
 */
export function AppLink({ to, ...anchorProps }: AppLinkProps) {
  const encoded = useEncodedBuild();
  return <Link href={hrefWithBuild(to, encoded)} {...anchorProps} />;
}
