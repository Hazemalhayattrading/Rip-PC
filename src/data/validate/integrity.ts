import { DATA_PATHS } from '../schema/files';
import type { Publisher } from '../schema/publisher';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import { allSpecRecords } from './specs';

/** Publisher registry: unique IDs, no domain claimed twice, markets exactly on retailers. */
export function checkRegistry(sink: IssueSink, publishers: readonly Publisher[]): Map<string, Publisher> {
  const file = DATA_PATHS.publishers;
  const byId = new Map<string, Publisher>();
  const domainOwner = new Map<string, string>();
  publishers.forEach((p, i) => {
    const at = `publishers.${String(i)}`;
    if (byId.has(p.id)) sink.error('id-unique', file, `publisher ID "${p.id}" is used twice`, p.id, at);
    byId.set(p.id, p);
    for (const d of p.domains) {
      const owner = domainOwner.get(d);
      if (owner !== undefined && owner !== p.id) sink.error('registry', file, `domain ${d} is claimed by "${owner}" and "${p.id}"`, p.id, `${at}.domains`);
      domainOwner.set(d, p.id);
    }
    if (p.kind === 'retailer' && p.markets === undefined) sink.error('registry', file, 'a retailer must list its markets', p.id, `${at}.markets`);
    if (p.kind !== 'retailer' && p.markets !== undefined) sink.error('registry', file, 'only retailers have markets', p.id, `${at}.markets`);
  });
  return byId;
}

/** IDs are globally unique across spec records, games and benchmark rows (share URLs depend on it). */
export function checkIds(sink: IssueSink, dataset: Dataset): void {
  const firstSeen = new Map<string, string>();
  const claim = (id: string, file: string): void => {
    const prev = firstSeen.get(id);
    if (prev !== undefined) sink.error('id-unique', file, `ID "${id}" is already used in ${prev}`, id);
    else firstSeen.set(id, file);
  };
  for (const { category, record } of allSpecRecords(dataset)) claim(record.id, DATA_PATHS.specs[category]);
  for (const g of dataset.games?.games ?? []) claim(g.id, DATA_PATHS.games);
  for (const b of dataset.gameBenchmarks ?? []) claim(b.id, DATA_PATHS.benchmarks.game);
  for (const b of dataset.creatorBenchmarks ?? []) claim(b.id, DATA_PATHS.benchmarks.creator);
}
