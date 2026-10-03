# QA status: WP-Q4 (independent verification and the QA report)

Branch `feat/qa-phase1-verification`, worktree `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`.
Owner: qa-lead. Spec: `docs/reports/phase-1-plan.md` §2 (WP-Q4) and §4; test plan v4.5 §17 and
`docs/qa/phase-1-worker-briefs.md`.

## Done
1. 2026-10-02: WP-Q3 accepted and merged as `9d56356`; this branch was cut from the integration tip
   after it.
2. 2026-10-02/03: Hazem's live-site navigation report, **closed as not an app bug**.
   - His automated desktop Chrome clicked about 270 ms after the response, before the app had
     rendered any links (the static HTML's `#root` is empty). A click once the link exists
     navigates at once, headless and headed (`artifacts/screenshots/phase-1/WP-Q4/nav-check/early-click/`).
   - Chrome 151, Edge 154 and Chromium 1194, by mouse and tap: 12 of 12 navigate. Throttled to
     Slow 3G, the new h1 shows within 44 ms. One deployment only (27dbc6e), so no stale copy.
   - New: `tests/e2e/navigation.spec.ts` (`@smoke @nav`, in verify at 390, 768 and 1440 px) and
     `tests/e2e/live/playwright.config.ts` (the live site, five browsers). A planted dead link fails
     the spec.
   - Filed: QA-P1-001 (Major, build-lead: the new heading off screen after an in-app navigation at
     1440 px), QA-P1-002 (Minor, build-lead: `/index.html` shows the 404 view; fix in E0 with
     `/lab/index.html`), and the focus-scroll note to design-lead for DS2 batch 2.
   - The declared-404 allow-list entry takes the HTTP/2 form ("404 ()") of GitHub Pages.
   - verify on `f20b156`: 696 unit, 184 e2e, exit 0.
3. Test plan v4.2: §5, §12.1, §13.2 and the change log; v4.1 records the Director's approvals of the
   v4 proposals and the "no estimate" eligibility rule (§8.2, rule 4).
4. 2026-10-03: the second live run, five browsers × three widths: 81 of 90 pass. All 9 failures are
   Firefox build steps, on two WebGL warnings only (sent to build-lead for triage). The 404 tests
   pass with the HTTP/2 allow-list form. WebKit at 390 px passed every time (the earlier miss did not
   recur in 18 more tests).
5. 2026-10-03: WP-DS2 batch 1's AA claims checked: they hold. 28 contrast pairs recomputed
   independently; the mock axe-clean (with wcag22aa) in 7 cells, 320 px included; targets, chips,
   focus ring and forced colours as claimed. One Minor to design-lead: QA-P1-003, §9 says buttons are
   44 px but the round theme toggle is 36 px (passes 2.5.8's 24 px). Evidence:
   `artifacts/qa/phase-1/ds2-aa/`, with `manifest.sha256`.

6. 2026-10-03: design-lead's focus and scroll rules (route change: scrollY 0 at once, focus on the
   h1, header and site nav on screen; Back restores the scroll, focus on the h1; the theme toggle
   neither scrolls nor moves focus) are measured in `tests/e2e/navigation.spec.ts` (`dc21124`).
   Rule 3 is enforced; rules 1 and 2 are recorded as QA-P1-001 annotations until build-lead's fix.
7. 2026-10-03: the re-review of the engine contract at `83aa5ab` (`types.ts`, `rules.ts`,
   `invariants.ts`): **OK, WP-E1 can start.** C1 to C6 are resolved. Five follow-ups went to
   build-lead, none blocking: (1) `fpsEstimateProblems()` in E3 (frameGeneration NoEstimate in
   Phase 1, disagreement means confidence below high); (2) ram-cooler-clearance's "the fan can move
   up" against cooler-height; (3) query mode: systemOf's result per build, and the invariants'
   problems with exit 1; (4) no `golden-estimates.json`, since QA builds its own golden queries;
   (5) optional, cooler-socket on the board's socket. The query-mode format is agreed.
   compat-trace compares `RuleSpec.unknownData` too, and v4.3 follows the contract (`81d18e5`).
8. data-lead's 23 validator tests are ready on `feat/data-engine-data` @ `4337e09`, landing with
   WP-D1 batch 1. The laneSharing `[]` reason follows data-lead's manual search.
9. 2026-10-03 (`4008625`): Firefox's two WebGL notices allow-listed as build-lead triaged them
   (the deliberate context loss on unmount; three.js r186's 1 px viewport rounding), with
   self-tests. The `index.html` smoke tests for QA-P1-002 are in, and run once the fix and the lab
   index land. design-lead's four 3D checks are in test plan v4.4 §6.7. verify: 699 unit, 192 e2e
   (4 skipped), exit 0.
10. 2026-10-03: the unknown-data re-check against build-lead's `RuleSpec` at `480a30e` (test plan
    v4.5, pending the Director's approval). cooler-height now reads the memory kit, and
    `ram.heightMm` and `cooler.ramClearanceMm` are both nullable, so it moves to the unknown-data
    group: 11 rules with unknown-data tests, 9 with validator proofs, 20 distinct validator titles
    (data-lead's four cooler-height tests still run, but compat-trace no longer requires them).
    cooler-socket gains `motherboard.socket`'s proof. build-lead's `RuleSpec` for cooler-height
    must say `unknownData: true` in the same merge window, because `rules.test.ts` pins this
    file. The lab-index smoke test now finds its route by `htmlFileOf(route) === 'lab/index.html'`
    (build-lead's catch: the lab's path is `/lab/`).
11. 2026-10-03 (after the second stop): **the golden-count pin is gone.** The test counted 143 rows,
    and WP-D2 batch 1 makes 190 (163 game, 27 creator; 47 rows added, none changed or removed).
    The test now derives the expected list from the anchor files. The fix is on its own branch,
    `feat/qa-golden-count` @ `8fafdf5`, cut from `2fe7148`, in the second worktree
    `.claude/worktrees/qa-lead-golden`. Handed off to the Director.
    - verify there: 727 unit, 166 e2e, exit 0. With D2 batch 1 trial-merged on top (not
      committed, then aborted): 735 unit, 166 e2e, exit 0. The old pin fails on that tree (190, not
      143). Four planted `anchorRows` defects each fail the new test.
    - Evidence: `artifacts/qa/phase-1/golden-count-pin/`, with `manifest.sha256`.
12. 2026-10-03: **QA-P1-003 closed** on the integration tip `2fe7148`. It's the same probe as at
    `fe6b187`, in 8 cells, and `retest.json` is byte-identical. lab-spec §9's target line agrees.
    Evidence: `artifacts/qa/phase-1/ds2-aa/retest-p1-003-2fe7148/`.
13. 2026-10-03: **QA-P0-018 and QA-P0-019 closed** against the merged `tokens.md` (rules 2 and 6).
    All 7 stated ratios, recomputed from `tokens.css`, match. New Minor **QA-P1-004** to
    design-lead: rule 6 claims "15.89:1 or more on every measured surface", but the ring in the key
    light is 13.39:1 in dark (§2.2's own table agrees). Evidence:
    `artifacts/qa/phase-1/ds2-p0-018-019/`.
14. 2026-10-03: the integration tip `2fe7148` merged into this branch (`fe8e255`).
15. 2026-10-03: the Director merged the golden-count fix and WP-D2 batch 1 (`a2f95b3`), and
    WP-DS2 batch 3 (`47fcc0a`). The integration tip `df6cd00` merged here (`8fdfd26`).
16. 2026-10-03: **QA-P1-004 closed** at `df6cd00`. Rule 6 now gives 15.89:1 on the panels and
    13.39:1 on every measured surface, and both match the recomputed minima
    (`artifacts/qa/phase-1/ds2-p0-018-019/retest-p1-004-df6cd00.log`).
17. 2026-10-03: **the blind key list for check C**, `tests/audit/anchor-keys.mjs`, with 31 tests.
    - It groups the rows into source reviews by their first source's page (the query dropped).
      That gives the plan's 5 reviews for the 143 rows, plus D2 batch 1's 2: 7 reviews, 190 rows.
    - A list carries the claims only. A field the tool doesn't know stops it (exit 2). A value of
      the review printed in a title, locator or note stops it (exit 1). The check reads every
      number in the text in both decimal conventions and compares numerically, so a finer print
      that rounds up (Blender's 16066.367… for 16066.37) is caught. `--drop-leaking-notes`
      withholds a leaking note and records its field.
    - On the real data it withholds 11 notes for Tom's (one prints four values) and 9 for Blender
      (each prints its unrounded median). Two independent oracles find no value in any of the 7
      lists. Seven planted tool defects each fail the tests.
    - Brief C now gives the `transcribed.json` format, the verdicts and the `shared` block.
    - verify: 770 unit, 192 e2e (4 skipped), exit 0
      (`artifacts/qa/phase-1/verify-q4-8fdfd26-anchor-keys.log`).
    - Key lists: `artifacts/qa/phase-1/check-c/<item>/key-list.json`, with `key-lists.sha256` and
      `manifest.sha256`. Tool evidence: `artifacts/qa/phase-1/anchor-keys/`.

18. 2026-10-03: **the synthetic-null ruling** (the Director, 2026-10-03) is in test plan v4.6 §9.1
    and §9.3, `compat-rules.json` (exactly gpu-length, cooler-height, psu-form-factor, psu-length)
    and compat-trace (`7e9e110`): 12 new tests, 7 planted defects caught. Handed off. My commit
    removing the status file for a merge-ready hand-off was denied by the permission system, so the
    Director decides. build-lead has the title format.
19. 2026-10-03: **check C, all 190 anchor rows in 7 reviews, PASS.** Stage 1 is sealed at `e3fc909`
    and `4fe4f6e`. Stage 2 runs `tests/audit/anchor-compare.mjs`: 34 tests, and 9 planted defects
    each fail them.
    - MATCH counts: CB page 4 1011; CB page 5 642; TPU 9850X3D 648; TPU 9800X3D 234; Blender 99;
      Tom's 663; TechSpot 144. No MISMATCH, NOT COVERED or MAPPING is left.
    - 114 fields pass by the three documented conventions of test plan v4.6 §7.3 (absence, read
      date, validator unit). Each needs the row's own note or the validator's rule.
    - Blender: 12 fields (6 rows) moved in the live database after 2026-09-30. The data equals that
      day's capture (its SHA-256 is in `docs/reports/evidence/files.sha256`), so they're resolved
      with that evidence: `docs/qa/evidence/phase-1/check-c-resolutions/blender-5.2.0.json`.
    - TechSpot's live page is behind a Cloudflare challenge, so its worker read data-lead's Wayback
      copy. QA fetched the same snapshot once: 120 of 122 sentences are identical, and the other 2
      are page chrome (`artifacts/qa/phase-1/check-c/techspot-270k-plus/qa-lead-authenticity/`).
    - New Major **QA-P1-005** (data-lead, build-lead copied): TPU's Battlefield 6 1080p rows span
      6.0% over 9 CPUs, with three tied at 207.9, while the other TPU games span 22 to 68%. They
      look GPU- or engine-limited, yet they're labelled limiter "cpu".
    - Stage-2 results: `artifacts/qa/phase-1/check-c/<item>/stage2.json`, manifest
      `docs/qa/evidence/phase-1/check-c-stage2.sha256`. verify: 816 unit, 192 e2e (4 skipped), exit 0.
20. 2026-10-03: the Director merged the branch to `7e9e110` as `ae9dc3e` (v4.5, v4.6, the
    synthetic-null exception, anchor-keys, brief C), recorded at `7017ee9`, which is merged here
    (`64953e9`). The status file stays on the integration branch until Hazem decides; I don't retry
    its removal. Boundary tests keep v4's one-field override (the Director).
21. 2026-10-03: **drift, as the Director asked** (judge against what was recorded; drift is its own
    column; a freshness flag past the 5% golden tolerance):
    - anchor-compare gains `drift` resolutions. Each carries the value recorded at `retrievedAt`,
      which must equal the data, or the tool calls it a recording error. The output shows recorded,
      live and the % change, and flags freshness past `models.goldenTolerancePct` without calling it
      a defect. 38 tests; 12 planted defects each fail them.
    - Blender: every query matches its row (blender_version=5.2.0, compute_type of the row's backend,
      group_by=device_name). 12 drift fields over 6 rows, from -0.08% to +0.10%, so no freshness
      flag. The 3 other rows match live exactly.
    - Tom's: the cited Wayback snapshot (20260929141411) has dateModified 2026-06-24T21:35:42+00:00,
      the version the worker read live, and references all 4 keyed charts. No drift
      (`check-c/toms-gpu-hierarchy-2026/qa-lead-archive-version/`).
    - CB pages were last modified on 2026-07-17, before `retrievedAt`. Both TPU reviews were read
      from their cited snapshots, and TechSpot's copy was checked against QA's own fetch. No drift
      is possible there.
    - Test plan v4.6 §7.3 states the rule.

## In progress
- Waiting:
  - the Director on check C (`f47a1bb` and the drift follow-up) and on §7.3's stage-2 rules;
  - Hazem on the status file;
  - the dump's query mode and `rules.json` (WP-E0);
  - WP-D1 batch 1's merge (the validator tests);
  - the SHA of build-lead's QA-P1-001 and QA-P1-002 fixes, which come together.
- Open defects: QA-P1-001 (Major, build-lead), QA-P1-002 (Minor, build-lead), QA-P1-005 (Major,
  data-lead).
- Check C workers, to resume one with SendMessage: CB page 4 `a824b88e9f4bc936d`, TPU 9850X3D
  `af45ac9eecd4f6f54`, Blender `a0c4229284e5d9dfa`, Tom's `ab11f05c7be6cfbcc`, CB page 5
  `a5b25994c6c8ab99e`, TPU 9800X3D `ab86e5c3f86c6c67a`, TechSpot `a862aafb5dff7dc0b`. All seven
  reports are in.

## Next steps, in order
1. Re-test QA-P1-005 when data-lead answers.
2. Check C runs again on each WP-D2 batch the Director accepts: `node tests/audit/anchor-keys.mjs
   --list`, a key list for each new review, a fresh worker, the seal, then `anchor-compare.mjs`.
3. When the dump's query mode lands (WP-E0):
   - the golden-query step, `tests/audit/golden-queries.mjs`: one query per anchor row, with the
     preset through WP-D2's map. Native and null upscaling map to `.native`, every upscaler mode to
     `.withUpscaler`, and any other form is refused;
   - the corpus runner and the sweep (S1 to S15, S15 by sweep kind);
   - the per-rule compare script for check A.
4. Re-test QA-P1-001 and QA-P1-002 when build-lead reports the fixes.
   - QA-P1-001: when build-lead's fix lands, the navigation spec goes back to hard assertions (the
     Director, 2026-10-03). Set `FOCUS_RULES.enforced` to true and empty `KNOWN_OFF_SCREEN`, run it
     at all three widths, then run the live config after the deploy.
   - QA-P1-002: check that the two gated `index.html` smoke tests ran (not skipped) at 390 and
     1440 px. Then re-run the live config after the deploy, and check by hand that `/lab` answers
     301 to `/lab/` there (GitHub Pages' directory redirect, which `vite preview` need not copy).
5. The other Q4 tools, as E0 and E1 land: `mutation-check.mjs` (the first Stryker report), and
   `strata.mjs` for WP-D1's new data files.
6. The rest of the §4 fan-out, as each WP hands off (the briefs file).
