# WP-D1 Engine data: in progress, 2026-10-03 (UTC)

Branch `feat/data-engine-data`, from claude/keen-lamport-0794zj. Spec: plan §2 WP-D1 and §3; briefs,
"data-lead". Hand-offs go to `team-lead` by SendMessage, in the briefs' format.

1. Set-up: **done** (755def5, 86e4e95).
2. Batch 1: **hand-off pending**.
   - Done:
     - c588afb, 1218ff9, 4337e09, 90fc5ff, 718c170: fields, parts, fixtures, sampler (see git log).
     - bec076e, 910ff10: the Arc B580 Limited Edition card, quote fixes, `recommendedPsuKind`.
     - 9f8a332: prices and gaps for the batch's parts (batch `2026-10-02-d1-fixtures`).
     - dc3ecc3: the integration branch (2fe7148) merged; semantics.ts keeps D1's field list.
     - The Kingston 4x16 kit swapped for the listed RGB kit, KF560C40BBAK4-64 (the Director's
       checklist): record, fixtures, US price (Amazon.com, QyTech, marketplace) and SA gap.
   - Next, in order:
     1. Draw the 20% audit with `data/tools/audit-sample.mjs` over the batch's new and changed
        items, check each against its capture, and record it in `data/audits.json`.
     2. Write the hand-off capture manifest (specs d1 + Kingston RGB + prices d1 + Kingston RGB).
     3. Run `npm run verify`, delete this file in the hand-off commit, and hand off batch 1 to
        `team-lead` against the Director's checklist (progress.md, "In progress").
3. Batch 2: the power constants registry.
4. Batch 3: radiator width, RAM clearance under a top radiator; PCIe slot positions; BIOS dates.
5. Batch 4: RAM rank and official speeds per configuration (item 7), the case size-class redesign,
   QA's 11 Minors and the reseller rule.
