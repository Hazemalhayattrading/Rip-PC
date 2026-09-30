import * as z from 'zod';
import { Id, IsoDate, Notes, PosInt, PublishedDate, Sources } from './common';

export const PlayerCountMetric = z.enum([
  /** Steam concurrent players at the moment the page was read. */
  'steam-concurrent-now',
  'steam-24h-peak',
  /** Average concurrent players over a period (Steam Charts "Last 30 Days" or a month). */
  'steam-period-average',
  'steam-period-peak',
  'steam-all-time-peak',
  /** Publisher- or tracker-reported figures across platforms. */
  'monthly-active-users',
  'daily-active-users',
  'peak-concurrent',
  'concurrent-now',
]);
export type PlayerCountMetric = z.infer<typeof PlayerCountMetric>;

export const PlayerCount = z.strictObject({
  metric: PlayerCountMetric,
  value: PosInt,
  /** The date the figure describes (the last day, for a period). */
  asOf: IsoDate,
  /** The period as the source labels it, e.g. "Last 30 Days". `null` for a point-in-time figure. */
  period: z.string().min(1).nullable(),
  scope: z.enum(['steam', 'pc', 'all-platforms']),
});
export type PlayerCount = z.infer<typeof PlayerCount>;

export const Game = z.strictObject({
  id: Id,
  title: z.string().min(1),
  /** Rolling franchises where the list names the current title. `null` for a fixed title. */
  franchiseSlot: z.enum(['call-of-duty', 'ea-sports-fc']).nullable(),
  /** `null` means the game is not sold on Steam. */
  steamAppId: PosInt.nullable(),
  releaseDate: PublishedDate,
  listStatus: z.enum(['confirmed', 'replacement']),
  /** For a replacement, the title it replaced. `null` otherwise. */
  replaces: z.string().min(1).nullable(),
  /** Why it is on the list (player count, benchmark value). Editorial, not a sourced value. */
  inclusionReason: z.string().min(1),
  playerCounts: z.array(PlayerCount).min(1),
  sources: Sources,
  notes: Notes,
});
export type Game = z.infer<typeof Game>;

export const GamesFile = z.strictObject({
  schemaVersion: z.literal(1),
  /** The date the list was confirmed. */
  listDate: IsoDate,
  method: z.string().min(1),
  games: z.array(Game).min(1),
  /** Titles considered and not listed, or replaced, with the decision. */
  considered: z.array(z.strictObject({ title: z.string().min(1), decision: z.string().min(1) })),
});
export type GamesFile = z.infer<typeof GamesFile>;
