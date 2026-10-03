# WP-D1 Engine data, batch 2 (power constants registry): in progress, 2026-10-03 (UTC)

Branch `feat/data-power-registry`, cut from `feat/data-engine-data` @ 710b745 (batch 1, handed off and
in the Director's review). Batch 2 lives on its own branch so batch 1 can merge, or change, alone.
Spec: plan §2 WP-D1 item 6, for WP-E2 (plan §2). Hand-offs go to `team-lead` by SendMessage.

1. Batch 1: handed off on `feat/data-engine-data` @ 710b745. Fixes the review asks for go there.
2. Batch 2, the power constants registry: **research done (2026-10-03), data-lead review next**.
   - Two hardware-researcher workers, writing staged data to this worktree's `artifacts/power/`:
     - per-part figures from the makers: drives, case and cooler fans, AIO pumps, RAM modules
       (`artifacts/power/d1-batch2-parts-staged.json`);
     - standards and guidance: ATX 3.1 power excursions, GPU transients per class, AMD PPT, board
       power (`artifacts/power/d1-batch2-guidance-staged.json`).
   - Staged: parts 18 items + 10 gaps (agentId aa81942470e8593e4); guidance 32 items + 10 gaps
     (agentId a950bafaf0e90948e). AMD PPT is a gap (no AMD-owned statement found).
   - The schema proposal went to build-lead (WP-E2 consumes it); waiting for its answer.
   - Next, in order:
     1. Review both workers' staged files against their captures.
     2. Write `src/data/schema/power.ts` test first, the validator rules (each part id exists, each
        constant has a source, a derivation names its inputs), and `data/power.json`.
     3. Draw the 20% audit, run verify, merge the batch 1 branch once the Director merges it, and
        hand off batch 2.
3. Batch 3: radiator width, RAM clearance under a top radiator; PCIe slot positions; BIOS dates.
4. Batch 4: RAM rank and official speeds per configuration (item 7), the case size-class redesign,
   QA's 11 Minors and the reseller rule.
