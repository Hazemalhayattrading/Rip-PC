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

## In progress
- Waiting: the dump's query mode and `rules.json` (WP-E0); WP-D1 batch 1's merge (the validator
  tests); the SHA of build-lead's QA-P1-001 and QA-P1-002 fixes, which come together.

## Next steps, in order
1. When the dump's query mode lands (WP-E0): the golden-query step (`tests/audit/golden-queries.mjs`:
   one query per anchor row, the preset through WP-D2's map), the corpus runner and the sweep (S1
   to S15, S15 by sweep kind), and the per-rule compare script for check A.
2. Re-test QA-P1-001, QA-P1-002 and QA-P1-003 when their owners report fixes.
   - QA-P1-001: when build-lead's fix lands, the navigation spec goes back to hard assertions (the
     Director, 2026-10-03): set `FOCUS_RULES.enforced` to true and empty `KNOWN_OFF_SCREEN`, run it
     at all three widths, then run the live config after the deploy.
   - QA-P1-003: the fix is verified on `feat/design-ds2` @ `fe6b187` (a 44 x 44 hit area on a
     coarse pointer, 36 px with a mouse; `artifacts/qa/phase-1/ds2-aa/retest-p1-003/`). Close it
     after WP-DS2 batch 2 merges, with one re-run on the integration branch.
3. QA-P1-002: when build-lead's fix lands, check that the two gated `index.html` smoke tests ran
   (not skipped) at 390 and 1440 px, then re-run the live config after the deploy, and check by
   hand that `/lab` answers 301 to `/lab/` there (GitHub Pages' directory redirect, which
   `vite preview` need not copy).
4. The other Q4 tools, as E0 and E1 land: `mutation-check.mjs` (the first Stryker report), the
   blind anchor key list; `strata.mjs` for WP-D1's new data files.
5. The §4 fan-out, as each WP hands off (the briefs file).
