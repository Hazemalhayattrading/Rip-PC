# WP-D1 Engine data: in progress, 2026-10-02 (UTC)

Branch `feat/data-engine-data`, from claude/keen-lamport-0794zj @ c621c15. Spec: plan §2 WP-D1 and
§3; briefs, "data-lead". Hand-offs go to `team-lead` by SendMessage, in the briefs' format.

1. Set-up: **done** (755def5, 86e4e95). The Director deleted `feat/data-intel-profile`.
2. Batch 1: **nearly done**, hand-off pending.
   - Done:
     - c588afb: structured case conditions, the North's drive-tray layouts, new fields (PSU cables and
       bracket, GPU adapter, single-fan RAM clearance, official memory speed), price `batches`.
     - 1218ff9 (worker, committed by the Director): Kingston FURY Beast 4x16GB, DeepCool PK650D,
       Ryzen 5 3400G (+ B550 BIOS rows), Noctua NH-L9i-17xx chromax.black, DeepCool AN600.
     - 4337e09: `data/compat-fixtures.json` (20 rules, 53 fixtures, 31 gaps) with its schema and the
       fixture-coverage and fixture-fact rules; QA's 23 required-field tests; `src/data/semantics.ts`
       (build-lead); the ASUS FlashBack FAQ on 6 boards (design-lead); B550 fixes.
     - 90fc5ff: laneSharing [] evidence and README. 718c170: the Node audit sampler.
   - In progress, two workers resumed by SendMessage (their agentIds):
     - hardware-researcher `a0d34221a3e536dc5`: quote fixes (a)-(e) from its stop report
       (`artifacts/reports/hardware-researcher-stop-report-2026-10-02.txt`), and one Intel Arc B580
       card (Director's ruling) in `data/parts/gpu-card.json`.
     - price-researcher `a237698be61128a7b`: US re-checks of `deepcool-pk650d` and
       `amd-ryzen-5-3400g` (US-ZIP search pages, approved), SA and US prices for
       `kingston-fury-beast-ddr5-6000-cl40-4x16gb`, `deepcool-an600` and the B580 card. Output:
       `artifacts/prices/d1-batch1-staged.json` (batch `2026-10-02-d1-fixtures`).
   - Next, in order:
     1. Review both workers' reports. Merge the staged prices into `data/prices/*.json` as batch
        `2026-10-02-d1-fixtures`, and reword the US priceBasis (the ZIP is set with --us-zip).
     2. Draw the 20% audit with `data/tools/audit-sample.mjs` over the batch's new and changed items,
        check each against its capture, and record it in `data/audits.json`.
     3. Commit the worker files (ram, psu, cpu, cooler, gpu-card, publishers, pw-price.cjs) after review.
     4. Run `npm run verify`, write the capture manifest, delete this file in the hand-off commit, and
        hand off batch 1 to `team-lead`, with the 3400G retail evidence (Amazon.sa, in stock, 2026-10-02).
3. Batch 2: the power constants registry.
4. Batch 3: radiator width, RAM clearance under a top radiator; PCIe slot positions; BIOS dates.
5. Batch 4: RAM rank and official speeds per configuration (item 7), the case size-class redesign,
   QA's 11 Minors and the reseller rule.
