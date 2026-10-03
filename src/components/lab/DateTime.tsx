import { formatDate } from './format';

/**
 * A date as the lab writes it, "30 Sep 2026", in `<time datetime>` (lab-spec §7). A published
 * quarter has no machine-readable form, so it stays plain text.
 */
export function DateTime({ value }: { readonly value: string }) {
  const { text, dateTime } = formatDate(value);
  return dateTime === null ? text : <time dateTime={dateTime}>{text}</time>;
}
