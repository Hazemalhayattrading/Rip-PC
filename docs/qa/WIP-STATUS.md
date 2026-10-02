# QA status: WP-Q4 (independent verification and the QA report)

Branch `feat/qa-phase1-verification`, worktree `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`.
Owner: qa-lead. Spec: `docs/reports/phase-1-plan.md` §2 (WP-Q4) and §4; test plan v4.2 §17 and
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

## In progress
- The second live run (all five browsers), for the closing record.
- Waiting: build-lead's revised `types.ts` (C1 to C6), which gates WP-E1; data-lead's 23 validator
  tests.

## Next steps, in order
1. When build-lead's revised types arrive: re-review C1 to C6 in the next turn, and reply OK or a
   numbered list of changes, copying team-lead.
2. The AA claims of WP-DS2 batch 1 (`427d241`): `docs/design/lab-spec.md`, `copy-guide.md` and the
   tokens. Re-run `contrast.mjs --check` and axe on the lab mock, at 390, 768 and 1440 px, dark and
   light.
3. Triage, with build-lead, the two Firefox WebGL warnings the live run shows on the build steps:
   "WebGL context was lost" (likely R3F's forceContextLoss on unmount) and "drawElementsInstanced:
   Drawing to a destination rect smaller than the viewport rect". Then allow-list them with reasons,
   or file them.
4. Watch the WebKit 390 px tap that failed twice in the first live run (0 of 9 in the reruns).
5. The Q4 tools, as E0 and E1 land: `mutation-check.mjs`, the sweep, the corpus runner, the
   per-rule compare script, the blind anchor key list; `strata.mjs` for WP-D1's new data files.
6. The §4 fan-out, as each WP hands off (the briefs file).
