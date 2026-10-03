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

## In progress
- **Check C, the anchor data (all 190 rows, 7 reviews).** The waves keep each host to one worker
  at a time; `web.archive.org` goes to one worker per wave:
  - wave 1: `cb-2026-seite-4` (48 rows, computerbase.de), `tpu-9850x3d-p18` (36, techpowerup.com,
    tpucdn.com, the archive), `blender-5.2.0` (9, opendata.blender.org), `toms-gpu-hierarchy-2026`
    (39, tomshardware.com and its image CDN, live only);
  - wave 2: `cb-2026-seite-5` (32), `tpu-9800x3d-p9` (18, the archive), `techspot-270k-plus` (8,
    live only).
  - Each worker writes `transcribed.json` to `artifacts/qa/phase-1/check-c/<item>/`. qa-lead
    commits it to `docs/qa/evidence/phase-1/check-c/<item>/` before stage 2.
- Waiting: the dump's query mode and `rules.json` (WP-E0); WP-D1 batch 1's merge (the validator
  tests); the SHA of build-lead's QA-P1-001 and QA-P1-002 fixes, which come together.
- Open defects: QA-P1-001 (Major, build-lead), QA-P1-002 (Minor, build-lead).

## Next steps, in order
1. Check C, wave 1 then wave 2, as above. Read each worker's `transcribed.json` as its `Agent`
   call returns, commit it, then stage 2.
2. Stage 2: `tests/audit/anchor-compare.mjs` (§7.3's outcomes per field; the shared block; chart
   tolerance; the catalogue ids against the catalogue), with planted-defect tests.
3. Remove the second worktree: `git worktree remove .claude/worktrees/qa-lead-golden` (its
   branch is merged, as `a2f95b3`).
4. When the dump's query mode lands (WP-E0): the golden-query step (`tests/audit/golden-queries.mjs`:
   one query per anchor row, the preset through WP-D2's map), the corpus runner and the sweep (S1
   to S15, S15 by sweep kind), and the per-rule compare script for check A.
5. Re-test QA-P1-001 and QA-P1-002 when build-lead reports the fixes.
   - QA-P1-001: when build-lead's fix lands, the navigation spec goes back to hard assertions (the
     Director, 2026-10-03): set `FOCUS_RULES.enforced` to true and empty `KNOWN_OFF_SCREEN`, run it
     at all three widths, then run the live config after the deploy.
   - QA-P1-002: check that the two gated `index.html` smoke tests ran (not skipped) at 390 and
     1440 px, then re-run the live config after the deploy, and check by hand that `/lab` answers
     301 to `/lab/` there (GitHub Pages' directory redirect, which `vite preview` need not copy).
6. The other Q4 tools, as E0 and E1 land: `mutation-check.mjs` (the first Stryker report);
   `strata.mjs` for WP-D1's new data files.
7. The rest of the §4 fan-out, as each WP hands off (the briefs file).
