/**
 * How the lab writes catalogue values (copy guide §3 and §12): numbers, money and dates, made
 * with `Intl`, never by hand. Values are never rounded or converted: the lab shows what the
 * catalogue holds, so an auditor sees the data itself (lab-spec §8). Pure, so Phase 2 reuses it.
 */
import type { Currency } from '../../data/schema';
import type { SpecValue } from '../../engine/types';

/** Every published decimal, grouped the English way: "5,200", "3.125". */
const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 });

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

/**
 * Money as observed, never converted: the ISO code, a no-break space and the amount. No cents
 * for a whole amount, two otherwise, and never fewer than were published ("USD 19.995").
 */
export function formatMoney(amount: number, currency: Currency): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 20,
  }).format(amount);
}

/** A date as the lab writes it, and its `<time datetime>` form (`null`: no machine form). */
export interface DateText {
  readonly text: string;
  readonly dateTime: string | null;
}

const DAY = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function part(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)?.value ?? '';
}

/**
 * "30 Sep 2026": day, short month and year from `Intl` en-US parts, in UTC, so a date-only value
 * never moves a day in another time zone (copy guide §12). A published month ("2025-02"),
 * quarter ("2024-Q4") or year keeps exactly that precision: a date is never widened or
 * narrowed. Anything else passes through.
 */
export function formatDate(value: string): DateText {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day !== null) {
    const parts = DAY.formatToParts(new Date(`${value}T00:00:00Z`));
    return {
      text: `${part(parts, 'day')} ${part(parts, 'month')} ${part(parts, 'year')}`,
      dateTime: value,
    };
  }
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month !== null) {
    const name = MONTH.format(new Date(`${value}-01T00:00:00Z`));
    return { text: `${name} ${month[1] ?? ''}`, dateTime: value };
  }
  const quarter = /^(\d{4})-(Q[1-4])$/.exec(value);
  if (quarter !== null) return { text: `${quarter[2] ?? ''} ${quarter[1] ?? ''}`, dateTime: null };
  if (/^\d{4}$/.test(value)) return { text: value, dateTime: value };
  return { text: value, dateTime: null };
}

/**
 * A published spec value as text, without its unit: numbers grouped, strings exactly as stored,
 * yes or no, and a list joined by commas. An empty list is "None", the part's own answer.
 */
export function valueText(value: Exclude<SpecValue, null>): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value;
  if (value.length === 0) return 'None';
  return value.map((item) => (typeof item === 'number' ? formatNumber(item) : item)).join(', ');
}
