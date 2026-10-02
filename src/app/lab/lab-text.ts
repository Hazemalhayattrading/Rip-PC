/**
 * How the Engine lab writes catalogue values: part names, spec values, money and the labels of
 * fixed lists. Pure functions, no React. Types only from the data schemas: app code never
 * imports Zod (plan WP-E0).
 *
 * Numbers follow the Rig Lab rules in docs/design/tokens.md §2.4: English digit grouping, the
 * currency code before the amount with a no-break space ("SAR 1,899"). A value is never rounded:
 * the lab shows what the catalogue holds.
 */
import type {
  Currency,
  DocType,
  Market,
  Resolution,
  SpecCategory,
  Upscaling,
} from '../../data/schema';
import type { SpecValue } from '../../engine/types';

const NBSP = ' ';

/** Every published decimal, grouped the English way. */
const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 });

/** Amounts as a shop shows them: no cents, or at least two decimals. */
const MONEY_WITH_CENTS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 20,
});

export const CATEGORY_LABELS: Readonly<Record<SpecCategory, string>> = {
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'Memory (RAM)',
  'gpu-chip': 'GPU chip',
  'gpu-card': 'Graphics card',
  storage: 'Storage',
  psu: 'Power supply (PSU)',
  cooler: 'CPU cooler',
  case: 'Case',
  'case-fan': 'Case fans',
};

export const MARKET_NAMES: Readonly<Record<Market, string>> = {
  SA: 'Saudi Arabia',
  US: 'United States',
};

const DOC_TYPE_LABELS: Readonly<Record<DocType, string>> = {
  'spec-page': 'Spec page',
  'product-page': 'Product page',
  manual: 'Manual',
  datasheet: 'Datasheet',
  'cpu-support-list': 'CPU support list',
  'bios-release-notes': 'BIOS release notes',
  'support-article': 'Support article',
  'press-release': 'Press release',
  review: 'Review',
  'benchmark-database': 'Benchmark database',
  'tracker-page': 'Tracker page',
  'store-page': 'Store page',
  'news-article': 'News article',
  'api-response': 'API response',
};

/**
 * A part as the lab names it: the brand, then the name, both as the catalogue writes them,
 * without repeating a brand the name already starts with ("AMD Ryzen 7 9800X3D", not
 * "AMD AMD Ryzen 7 9800X3D").
 */
export function partLabel(part: { readonly brand: string; readonly name: string }): string {
  return part.name === part.brand || part.name.startsWith(`${part.brand} `)
    ? part.name
    : `${part.brand} ${part.name}`;
}

function formatItem(value: string | number): string {
  return typeof value === 'number' ? NUMBER.format(value) : value;
}

/** A published spec value as text. `null` has no text: the status column says what it means. */
export function formatSpecValue(value: Exclude<SpecValue, null>): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' || typeof value === 'string') return formatItem(value);
  return value.length === 0 ? 'Empty list' : value.map(formatItem).join(', ');
}

/** An amount exactly as the retailer showed it, in its own currency: "SAR 1,899", "USD 82.50". */
export function formatAmount(amount: number, currency: Currency): string {
  const text = Number.isInteger(amount) ? NUMBER.format(amount) : MONEY_WITH_CENTS.format(amount);
  return `${currency}${NBSP}${text}`;
}

/**
 * What to tell the viewer when the catalogue fails to load. The loader's own errors are already
 * whole sentences about the catalogue; anything else (a network error) gets that sentence made.
 */
export function catalogueFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('The catalogue')) return message;
  return `The catalogue could not be loaded: ${message.replace(/\.$/, '')}.`;
}

export function docTypeLabel(docType: DocType): string {
  return DOC_TYPE_LABELS[docType];
}

/** "2560 × 1440". */
export function resolutionLabel(resolution: Resolution): string {
  return resolution.replace('x', ' × ');
}

export function rayTracingLabel(mode: 'off' | 'on' | 'path-tracing'): string {
  switch (mode) {
    case 'off':
      return 'Off';
    case 'on':
      return 'On';
    case 'path-tracing':
      return 'Path tracing';
  }
}

/** "Native", or the upscaler with its mode and version as published: "DLSS Quality (DLSS 4)". */
export function upscalingLabel(upscaling: Upscaling): string {
  if (upscaling.method === 'native') return 'Native';
  const name = upscaling.mode === null ? upscaling.method : `${upscaling.method} ${upscaling.mode}`;
  return upscaling.version === null ? name : `${name} (${upscaling.version})`;
}
