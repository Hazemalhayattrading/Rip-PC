# WP-D2 Benchmark coverage: in progress, 2026-10-03 (UTC)

Branch `feat/data-benchmarks`, fast-forwarded to claude/keen-lamport-0794zj @ b10d562 (batch 1 merged
as e5c1d2f). Spec: plan §2 WP-D2; briefs, "data-lead", step 6. Hand-offs go to `team-lead`.

1. Batch 1 (Black Myth: Wukong, Marvel Rivals): **merged** (e5c1d2f).
2. The preset-name map: **research running**.
   - One benchmark-researcher maps each publisher's preset label (12 publisher × game × label
     combinations in `data/benchmarks/game.json`) to the game's own English preset name, with
     sources. Staged in this worktree's `artifacts/benchmarks/presets-staged.json`.
   - Next, in order:
     1. Review the staged map against its captures.
     2. Write the schema test first (`src/data/schema/preset-names.ts`), the validator rules (every
        label used by a game row is mapped; every entry names a registry publisher and a real game;
        every mapping has sources), and `data/preset-names.json`.
     3. Audit 20%, run verify, hand off.
3. Batch 2: the next one or two of the 8 games with no anchors (Valorant, Fortnite, Apex Legends,
   Red Dead Redemption 2, GTA V Enhanced, EA SPORTS FC 27, Elden Ring, Minecraft).
