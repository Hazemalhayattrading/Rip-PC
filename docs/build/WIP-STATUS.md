# build-lead status: WP-E1, Compatibility rules

Branch `feat/build-engine-compat`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead-compat`,
cut from WP-E0's hand-off commit e952f7e (the Director's go of 2026-10-03: E1 may start before E0 is
accepted; E0 merges first). Spec: `docs/reports/phase-1-plan.md` §2 (WP-E1) and §3;
`docs/qa/test-plan.md` §9; `tests/audit/compat-rules.json`; `docs/design/copy-guide.md` §6 and §7;
`docs/design/lab-spec.md` §2 to §5 and §8. This file is deleted in each hand-off commit.

## Batches

- **1a (in progress, started 2026-10-03):** cpu-socket, ram-type, board-form-factor, usb-c-header
  and display-output, plus `/lab/compat` (the build-mode picker, the summary, the status chip and
  the result row).
  - an engine-engineer: the five rules, test first, in `src/engine/compat/**`;
  - a frontend-engineer: `/lab/compat` and the components, in `src/app/**`, `src/components/**`.
  - usb-c-header checks that a header exists, not its speed: the DeepCool CH560's front USB-C speed
    is null, and QA's record has unknownData false. The speed warning is the Director's call.
- **1b:** m2-lanes, with the drive-slot assignment that fills `CompatReport.driveSlots`.
- **Later batches:** the layout rules (gpu-length, gpu-thickness, cooler-height, radiator-fit,
  psu-length) with the layout search; ram-slots, ram-speed, ram-cooler-clearance, bios-version,
  psu-form-factor, cooler-socket, cpu-chipset and gpu-power-connector as WP-D1 batches merge;
  psu-wattage with WP-E2. StrykerJS (test plan §9.5) before the E1 hand-off.

## Next steps, on resume

1. If the workers stopped, read their reports (recover them from the transcripts in
   `C:\Users\ha\.claude\projects\C--Projects-Rip-PC\<session>\subagents\` if needed), review the
   files on disk, and commit what passes.
2. Run `npm run verify`, `npm run engine:dump` and compat-trace with `--allow-pending` for the
   rules not built yet, then hand off batch 1a.
