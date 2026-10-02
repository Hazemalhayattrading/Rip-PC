import { Fragment } from 'react';

/** A field's dot path in monospace, which wraps only after a dot, never inside a name. */
export function DotPath({ path }: { readonly path: string }) {
  return (
    <code>
      {path.split('.').map((segment, index) => (
        <Fragment key={`${String(index)} ${segment}`}>
          {index === 0 ? null : (
            <>
              .<wbr />
            </>
          )}
          {segment}
        </Fragment>
      ))}
    </code>
  );
}
