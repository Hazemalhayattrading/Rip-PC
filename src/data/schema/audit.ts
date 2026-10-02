import * as z from 'zod';
import { Id, IsoDate, PosInt } from './common';
import { SPEC_CATEGORIES } from './files';

/** The batches an audit samples from: one per spec category, price list, benchmark file and the games. */
export const AuditBatchName = z.union([
  z.templateLiteral(['spec:', z.enum(SPEC_CATEGORIES)]),
  z.templateLiteral([z.enum(['price-observations', 'price-gaps']), ':', z.enum(['sa', 'us'])]),
  z.enum(['benchmark:game', 'benchmark:creator', 'games']),
]);
export type AuditBatchName = z.infer<typeof AuditBatchName>;

/** One problem the audit found, the sampled items that had it, and the commit that fixed it. */
export const AuditFinding = z.strictObject({
  /** Sampled items, exactly as in the batch's `ids`. */
  items: z.array(z.string().min(1)).min(1),
  /** The field at fault. `null` when the finding is about the whole record. */
  field: z.string().min(1).nullable(),
  /** What the audit found, and against which capture. */
  found: z.string().min(1),
  fix: z.string().min(1),
  fixedIn: z.string().regex(/^[0-9a-f]{7,40}$/, { error: 'must be a commit SHA' }),
});
export type AuditFinding = z.infer<typeof AuditFinding>;

export const AuditBatch = z.strictObject({
  batch: AuditBatchName,
  /** Items in the batch when the sample was drawn. */
  population: PosInt,
  /** ceil(20% of `population`). */
  size: PosInt,
  /** Record IDs; `partId|retailer` for price observations; `partId` for price gaps. */
  ids: z.array(z.string().min(1)).min(1),
  auditedAt: IsoDate,
  /** What every sampled item was read against. */
  method: z.string().min(1),
  /** An empty list means every sampled item matched its source. */
  findings: z.array(AuditFinding),
  /** What the findings led to outside the sample, e.g. a re-check of every gap. `null` for nothing. */
  followUp: z.string().min(1).nullable(),
});
export type AuditBatch = z.infer<typeof AuditBatch>;

/** A problem a review found outside the seeded sample, and the commit that fixed it. */
export const ReviewFinding = z.strictObject({
  /** The records it concerns, by ID. */
  items: z.array(Id).min(1),
  /** The field at fault. `null` when the finding is about the whole record. */
  field: z.string().min(1).nullable(),
  /** What the review found, and against which capture. */
  found: z.string().min(1),
  fix: z.string().min(1),
  fixedIn: z.string().regex(/^[0-9a-f]{7,40}$/, { error: 'must be a commit SHA' }),
});
export type ReviewFinding = z.infer<typeof ReviewFinding>;

/** A check of the batch beyond the seeded sample, such as the Director's review or a sweep it led to. */
export const Review = z.strictObject({
  /** Who reviewed, e.g. "Director". */
  by: z.string().min(1),
  at: IsoDate,
  /** What was checked, and against what. */
  scope: z.string().min(1),
  /** An empty list means everything checked matched its source. */
  findings: z.array(ReviewFinding),
});
export type Review = z.infer<typeof Review>;

/** The data lead's seeded random audit of one data batch (README, "Review"). */
export const Audit = z.strictObject({
  /** The data batch audited, e.g. `2026-09-30-seed`. */
  id: Id,
  seed: z.int(),
  /** How the sample was drawn, precisely enough to draw it again. */
  rule: z.string().min(1),
  drawnAt: IsoDate,
  /** The per-item audit logs, under the git-ignored `artifacts/`. */
  evidence: z.array(z.string().min(1)).min(1),
  batches: z.array(AuditBatch).min(1),
  /** Reviews of the batch beyond the sample, in the order they happened. */
  reviews: z.array(Review),
});
export type Audit = z.infer<typeof Audit>;

export const AuditFile = z.strictObject({
  schemaVersion: z.literal(1),
  audits: z.array(Audit).min(1),
});
export type AuditFile = z.infer<typeof AuditFile>;
