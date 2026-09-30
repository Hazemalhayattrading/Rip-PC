import { DATA_PATHS } from '../schema/files';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import { checkSourcedRecord, type Registry } from './sources';

const GAME_EXEMPT = ['id', 'listStatus', 'replaces', 'inclusionReason', 'franchiseSlot', 'sources', 'notes'] as const;
const FRANCHISE_SLOTS = ['call-of-duty', 'ea-sports-fc'] as const;
/** A player count older than this (days before the list date) is flagged as stale. */
export const PLAYER_COUNT_MAX_AGE_DAYS = 180;

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

export function checkGames(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const gf = dataset.games;
  if (gf === null) return;
  const file = DATA_PATHS.games;
  if (gf.listDate > today) sink.error('date-future', file, `listDate ${gf.listDate} is after today (${today})`, undefined, 'listDate');

  for (const slot of FRANCHISE_SLOTS) {
    const n = gf.games.filter((g) => g.franchiseSlot === slot).length;
    if (n !== 1) sink.error('game-list', file, `franchise slot ${slot} must name exactly one current title (found ${String(n)})`);
  }

  for (const game of gf.games) {
    checkSourcedRecord(
      sink,
      file,
      game,
      { type: 'game', exempt: GAME_EXEMPT, nullMeansNone: ['steamAppId', 'playerCounts.*.period'] },
      registry,
      today,
    );
    if ((game.listStatus === 'replacement') !== (game.replaces !== null)) {
      sink.error('game-list', file, 'a replacement names the title it replaces; a confirmed title does not', game.id, 'replaces');
    }
    game.playerCounts.forEach((pc, i) => {
      const at = `playerCounts.${String(i)}.asOf`;
      if (pc.asOf > today) sink.error('date-future', file, `asOf ${pc.asOf} is after today (${today})`, game.id, at);
      else if (daysBetween(pc.asOf, gf.listDate) > PLAYER_COUNT_MAX_AGE_DAYS) {
        sink.warn('game-list', file, `player count from ${pc.asOf} is over ${String(PLAYER_COUNT_MAX_AGE_DAYS)} days older than the list`, game.id, at);
      }
    });
  }
}
