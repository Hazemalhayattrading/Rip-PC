# QA data fixes (QA-P0-008 to 012): in progress, 2026-10-01

Branch `feat/data-qa-fixes`, from claude/keen-lamport-0794zj @ 944081f. Assigned by the Director;
findings from qa-lead's seeded 10% audit (seed rig-lab-audit:phase-0:98d2be5a…). Blockers first.
One commit per finding; record each in `data/audits.json` (`reviews`), then verify and hand off to
`team-lead`, copying `qa-lead` with the commit IDs.

1. QA-P0-008 (Blocker): **done, 25e0549.** Both boards now cite the CPU / Memory Support tab
   (`helpdesk_qvl_cpu`); re-fetched 2026-10-01, CPU table present
   (`artifacts/specs/motherboard/*-qvl-cpu-2026-10-01.*`).
2. QA-P0-009 (Blocker): **done, 4f823ff.** New sourced `makerSizeClass` (Fractal "Regular"/"Small",
   DeepCool "mid-tower"); `size` is derived by `deriveCaseSize` (largest board), checked by the
   validator and exempt from source coverage. The three wrong notes are gone. build-lead told.
3. QA-P0-010 (Major): radiator thickness limits are published in the case manuals (North user guide
   p. 33); every case records null with a "not published" note. Check all 5 manuals. **Next.**
4. QA-P0-011 (Major): the 8 tpu-9850x3d rows on the 285K and 265K miss the stated CPU profile
   ("Intel stock power settings/Core 200S Boost enabled"). Not started.
5. QA-P0-012 (Major): the SA 5600 and 12400F imported offers lack the import-fee split note.
   Not started.

Process note from QA (Minor): Amazon.com fetched from this PC localises to SAR with delivery to Saudi
Arabia; a US batch from this PC needs a US delivery location. For the runner README.
