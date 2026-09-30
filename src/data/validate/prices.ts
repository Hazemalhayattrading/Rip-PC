import { MARKETS, MARKET_CURRENCY, type Market } from '../schema/common';
import { DATA_PATHS, PRICED_CATEGORIES } from '../schema/files';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import type { Registry } from './sources';
import { hostMatches, hostOf, isArchiveUrl } from './urls';

/**
 * Price trackers, comparison sites and aggregators. Never a price source (Owner's rule 1), even if
 * someone registers one as a retailer.
 */
export const PRICE_AGGREGATOR_HOSTS = [
  'camelcamelcamel.com',
  'keepa.com',
  'pcpartpicker.com',
  'pricespy.co.uk',
  'pricerunner.com',
  'pricena.com',
  'yaoota.com',
  'idealo.com',
  'geizhals.eu',
  'google.com',
  'bing.com',
] as const;

function isAggregator(host: string): boolean {
  return PRICE_AGGREGATOR_HOSTS.some((d) => hostMatches(host, d));
}

function checkRetailer(
  sink: IssueSink,
  file: string,
  recordId: string,
  at: string,
  retailerId: string,
  market: Market,
  registry: Registry,
): void {
  const pub = registry.get(retailerId);
  if (pub === undefined) {
    sink.error('publisher-known', file, `retailer "${retailerId}" is not in data/publishers.json`, recordId, at);
  } else if (pub.kind !== 'retailer') {
    sink.error('price-retailer', file, `"${retailerId}" is registered as a ${pub.kind}, not a retailer`, recordId, at);
  } else if (!(pub.markets ?? []).includes(market)) {
    sink.error('price-retailer', file, `retailer "${retailerId}" does not sell in ${market}`, recordId, at);
  } else if (pub.domains.some(isAggregator)) {
    sink.error('price-archive', file, `"${retailerId}" is a tracker or aggregator, never a price source`, recordId, at);
  }
}

/** Owner's rule 1 and architecture call 4.6: live retailer observations, in-window, never converted. */
export function checkPrices(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const catalogueLoaded = PRICED_CATEGORIES.every((c) => dataset.specs[c] !== null);
  const pricedIds = new Set(PRICED_CATEGORIES.flatMap((c) => (dataset.specs[c] ?? []).map((r) => r.id)));

  for (const market of MARKETS) {
    const file = DATA_PATHS.prices[market];
    const pf = dataset.prices[market];
    if (pf === null) continue;
    const { windowStart, windowEnd } = pf.batch;

    if (pf.market !== market) sink.error('price-currency', file, `file holds market ${pf.market}, expected ${market}`, undefined, 'market');
    if (pf.currency !== MARKET_CURRENCY[market]) {
      sink.error('price-currency', file, `market ${market} is priced in ${MARKET_CURRENCY[market]}, not ${pf.currency}`, undefined, 'currency');
    }
    if (windowStart > windowEnd) sink.error('price-window', file, 'batch windowStart is after windowEnd', undefined, 'batch');

    const seen = new Set<string>();
    pf.observations.forEach((o, i) => {
      const at = `observations.${String(i)}`;
      const rid = o.partId;
      if (o.market !== market) sink.error('price-currency', file, `observation for market ${o.market} in the ${market} file`, rid, `${at}.market`);
      if (o.currency !== MARKET_CURRENCY[o.market]) {
        sink.error('price-currency', file, `${o.market} prices are in ${MARKET_CURRENCY[o.market]}, not ${o.currency}`, rid, `${at}.currency`);
      }
      if (catalogueLoaded && !pricedIds.has(o.partId)) sink.error('ref', file, `partId "${o.partId}" is not a purchasable catalogue part`, rid, `${at}.partId`);
      checkRetailer(sink, file, rid, `${at}.retailer`, o.retailer, market, registry);

      const host = hostOf(o.url);
      if (isArchiveUrl(o.url)) {
        sink.error('price-archive', file, `url ${o.url} is an archive or cache; prices come only from live retailer pages`, rid, `${at}.url`);
      } else if (host !== null && isAggregator(host)) {
        sink.error('price-archive', file, `url host ${host} is a tracker or aggregator, never a price source`, rid, `${at}.url`);
      } else {
        const pub = registry.get(o.retailer);
        if (pub !== undefined && (host === null || !pub.domains.some((d) => hostMatches(host, d)))) {
          sink.error('publisher-domain', file, `url host ${host ?? '(invalid)'} is not a domain of retailer "${pub.id}"`, rid, `${at}.url`);
        }
      }
      if (o.retrievedAt < windowStart || o.retrievedAt > windowEnd) {
        sink.error('price-window', file, `retrievedAt ${o.retrievedAt} is outside the batch window ${windowStart}..${windowEnd}`, rid, `${at}.retrievedAt`);
      }
      if (o.retrievedAt > today) sink.error('date-future', file, `retrievedAt ${o.retrievedAt} is after today (${today})`, rid, `${at}.retrievedAt`);
      const expected = `artifacts/prices/${market}/${o.partId}--${o.retailer}--${o.retrievedAt}.`;
      if (!o.capture.startsWith(expected)) {
        sink.error('price-capture', file, `capture must be named ${expected}<html|png>`, rid, `${at}.capture`);
      }
      const key = `${o.partId}|${o.retailer}`;
      if (seen.has(key)) sink.error('price-duplicate', file, `two observations for "${o.partId}" at "${o.retailer}"`, rid, at);
      seen.add(key);
    });

    const gapSeen = new Set<string>();
    pf.gaps.forEach((g, i) => {
      const at = `gaps.${String(i)}`;
      const rid = g.partId;
      if (g.market !== market) sink.error('price-currency', file, `gap for market ${g.market} in the ${market} file`, rid, `${at}.market`);
      if (g.reason.trim() === '') sink.error('price-gap-reason', file, 'a gap record must state its reason', rid, `${at}.reason`);
      if (catalogueLoaded && !pricedIds.has(g.partId)) sink.error('ref', file, `partId "${g.partId}" is not a purchasable catalogue part`, rid, `${at}.partId`);
      g.retailersTried.forEach((r, j) => {
        checkRetailer(sink, file, rid, `${at}.retailersTried.${String(j)}`, r, market, registry);
      });
      if (g.checkedAt < windowStart || g.checkedAt > windowEnd) {
        sink.error('price-window', file, `checkedAt ${g.checkedAt} is outside the batch window ${windowStart}..${windowEnd}`, rid, `${at}.checkedAt`);
      }
      if (g.checkedAt > today) sink.error('date-future', file, `checkedAt ${g.checkedAt} is after today (${today})`, rid, `${at}.checkedAt`);
      if (gapSeen.has(g.partId)) sink.error('price-duplicate', file, `two gap records for "${g.partId}"`, rid, at);
      gapSeen.add(g.partId);
    });

    if (!catalogueLoaded) continue;
    const priced = new Set(pf.observations.map((o) => o.partId));
    for (const id of pricedIds) {
      const hasPrice = priced.has(id);
      const hasGap = gapSeen.has(id);
      if (!hasPrice && !hasGap) sink.error('price-coverage', file, `no ${market} price and no gap record for "${id}"`, id);
      if (hasPrice && hasGap) sink.error('price-coverage', file, `"${id}" has both a ${market} price and a gap record`, id);
    }
  }
}
