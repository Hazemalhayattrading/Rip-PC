import { useId } from 'react';

/**
 * On every lab page: a named region that says, in words, that this is an internal preview
 * (plan §1). Its heading carries the message, so it never relies on colour.
 */
export function LabBanner() {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="mt-4 max-w-prose rounded-row border border-line bg-surface p-4"
    >
      <h2 id={headingId}>Engine lab: internal preview</h2>
      <p className="mt-1 text-ink-2">
        These pages show the catalogue and the engine for review. They are not part of the builder,
        and they ask search engines not to index them.
      </p>
    </section>
  );
}
