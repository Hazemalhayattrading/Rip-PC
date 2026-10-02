# Phase 1 — The engine: plan

Date: 2026-10-02 · Author: Director · **Status: approved by Hazem on 2026-10-02,** with his answers
in §6. Phase 1 started the same day; the team briefs are in `docs/reports/phase-1-briefs.md`.

Phase goal (BUILD_PROMPT §2):
- the compatibility engine (§5.1), the power estimator (§5.2), the performance model (§5.3) and
  the bottleneck analyser (§5.4);
- pure TypeScript in `src/engine/`, 100% unit-tested, with golden tests against published review
  numbers;
- QA's data-auditor spot-checks 10% of all numbers against their sources.

**In short**
- **11 work packages in 4 waves** (§5): 6 for build-lead's engine team, 2 for data, 2 for QA and
  1 for design.
- **You see the work in an Engine lab:** a few internal pages at `/lab`, where you pick real
  parts and read the engine's answer, with its reason and its sources (§1). The builder UI stays
  in Phase 2.
- **Independent checks fan out:** one fresh QA worker per compatibility rule and one per
  benchmark source. So every rule and every anchor is checked, not a sample (§4).
- **Hazem's decisions** are in §6: the BIOS warning, both extra rules, and at least 20 held-out
  results. He accepted the other defaults.

Built from:
- BUILD_PROMPT §2–§5 and §8;
- the Phase 0 report's §5 backlog;
- test plan §8 and §9;
- the catalogue at `53f52dd`. Every part named below is in `data/parts/*.json`.

---

## 1. How you'll see it working

Each engine part gets a lab page. You pick parts from the catalogue, and the page shows the
engine's result next to the sources it used.

| Page | What it shows | Arrives with |
|---|---|---|
| `/lab/` | What each page does, and how many parts, prices and anchors loaded | WP-E0 |
| `/lab/parts` | Every catalogue part and spec, each with its source and date | WP-E0 |
| `/lab/accuracy` | Every benchmark anchor with its source, and a coverage grid (games × GPUs, games × CPUs). WP-E3 adds the model's number and the error for each anchor | WP-E0, filled by WP-D2 |
| `/lab/compat` | One row per compatibility rule: ok, warn or block, with the reason, the rule id and the sources | WP-E1 |
| `/lab/power` | The power breakdown, the two totals and the recommended PSU range | WP-E2 |
| `/lab/games` | FPS as a range with a confidence level, which part limits it, and the anchors behind it | WP-E3 |
| `/lab/creator` | Estimates for Blender, Cinebench, video export, code compile and local AI | WP-E4 |
| `/lab/bottleneck` | The plain-English verdict, and 1–3 rebalanced builds at the same price | WP-E5 |

- **Links that open a ready-made case.** The picked parts live in the URL, so every hand-off gives
  you links such as "the RX 9070 XT in the North with a front 360".
- **Locally, any time.** The Director builds the site, runs `npm run preview` and sends you links
  like `http://localhost:4173/Rip-PC/lab/compat`. Screenshots come with them, sent as files for
  when you follow from another device.
- **On the live site,** at three milestone PRs (§5): `https://hazemalhayattrading.github.io/Rip-PC/lab/`.
- **The lab is marked "Engine lab: internal preview".** It isn't in the site nav, and it asks
  search engines not to index it.
  - It meets the same bars as every page: no console errors or warnings, axe AA in both themes at
    all three widths, and the JS budget.
  - The engine and the catalogue load only on lab pages.

## 2. Work packages

**Done, for every WP, means:**
1. The hand-off (CLAUDE.md format) carries its evidence: test output, lab links and screenshots,
   and source links.
2. The Director accepted it, after:
   - re-running `npm run verify`;
   - opening the lab links;
   - re-checking at least 2 rules or 5 numbers against their sources.
3. QA's checks for it passed (§4).
4. It is merged to the integration branch, with `npm run verify` and CI green, and with
   `src/engine/**` at 100% coverage.
5. `progress.md` records it.

Each WP below adds its own conditions.

### WP-E0 · Engine foundations and the Engine lab
Owner: build-lead (engine-engineer, frontend-engineer) · Needs: nothing · Wave 1

**Deliverable**
- **The engine's layout and result types,** fixed before any rule is written, so that QA and the
  lab can build against them. There is one type each for a rule result, a power estimate, an FPS
  estimate, a creator estimate and a bottleneck report. The `Estimate` type (low, high,
  confidence) already exists.
- **Catalogue loading.**
  - The parts, prices and anchors reach the browser as one content-hashed JSON file, validated
    at build time by the same Zod schemas.
  - The engine takes the catalogue as an argument, so it stays pure.
  - Neither the catalogue data nor the data schemas reach the product pages, and nor does
    classic `zod`. The build codec's `zod/mini`, accepted in WP-B0, stays (Director, 2026-10-02).
- **An engine dump script.** It writes every rule's result, for every catalogue combination, to
  JSON. QA's sweep and its per-rule workers use it.
  - **A query mode** (QA's request, accepted on 2026-10-02): given a file of builds and queries,
    it writes the engine's results for exactly those.
  - QA's corpus, per-rule workers, held-out run and bottleneck checks use it, so QA never reads
    the engine's code.
  - E0 fixes the input format and covers compatibility. Each later WP adds its own entry point.
- **An ESLint rule** that stops `src/**` from importing `tests/**`. QA asked for it in test plan §8.
- **The lab shell:** `/lab/`, `/lab/parts` and `/lab/accuracy` (the anchors and the coverage
  grid), with one shared part picker. The index is `/lab/` (`lab/index.html`), because GitHub
  Pages redirects `/lab` there once `lab/` is a folder.

**In the browser**
- Open `/lab/parts` and pick any part. Each spec shows its value, its unit and its source:
  publisher, date and link. An unpublished value says "not published", with the reason.
- `/lab/accuracy` lists all 143 anchors, and it shows which games and chips have none.

**Done means**
- Every catalogue field and every anchor is reachable in the lab, with its source.
- The product pages' initial JS stays within 2 KB of today's 77.92 KB gzip.
- qa-lead and design-lead have reviewed the result types before WP-E1 starts.
- The ESLint rule fails a planted `tests/**` import, and the dump script runs in CI.

### WP-D1 · Engine data
Owner: data-lead (hardware-researcher) · Needs: nothing. WP-E1's second batch and WP-E2 wait for
it · Wave 1

**Deliverable**
1. **Real products for every rule's tests.** For each rule in §3, data-lead lists the real
   catalogue products that give ok, warn, block and "can't verify". The list goes in
   `data/compat-fixtures.json`, and each outcome has the source that proves it. Where no such
   product exists, data-lead adds a real, sourced one. The Director's first pass found these
   gaps:
   - `ram-slots`: every kit has 2 modules. A 4-module kit is needed, for the 2-slot ROG Strix
     B650E-I.
   - `gpu-power-connector`: all 5 PSUs have a native 12V-2x6 and three 8-pin cables. A PSU
     without a native 12V-2x6 is needed, and a real case of too few cables.
   - `cpu-chipset`: every catalogue CPU is on the support list of every board with its socket.
   - `cooler-socket` (added by Hazem, §6): all 5 coolers list all 4 sockets.
   - If no real product exists after 2 tries (rule 11), data-lead records the gap, and the
     Director decides.
2. **Structured conditions.** Today the conditional clearances are free text. Each becomes
   something the engine can evaluate, for example:
   - the North's GPU limit with a front 360;
   - its PSU limit by the number of drive trays;
   - the Terra's GPU limit with a 120 mm radiator.
3. **The North's drive-tray model.**
   - A 255 mm PSU fits only with the tray at position A, which limits the front radiator to
     280 mm.
   - A radiator width field.
   - The North's RAM clearance under a top radiator.
4. **PCIe slot positions** on every board: which expansion slot each PCIe slot occupies. The
   `gpu-thickness` rule needs them.
5. **BIOS dates.** A sourced board launch date or first-BIOS date for the "All" listings, so that
   `bios-version` can warn instead of passing silently.
6. **A power constants registry,** with every constant sourced. It covers:
   - the board, RAM per module, NVMe and SATA drives, fans and the AIO pump. Fan power worked out
     as rated current × 12 V counts as a documented derivation.
   - transient headroom per GPU class, from ATX 3.1 and the GPU makers' guidance;
   - AMD's PPT;
   - the structured Intel power profile, parked on `feat/data-intel-profile` (`d4e87e3`, a
     cherry-pick of 2fa3e32).
7. **The CUDIMM question.** Data-lead checks whether the G.Skill Trident Z5 CK kit needs a
   module-kind field (CUDIMM or UDIMM) for the RAM rules.
8. **The case size-class redesign:**
   - a zod-free `deriveCaseSize`, with `exteriorVolumeLiters`;
   - frozen class ids;
   - boundary tests at 20 L and 70 L.
9. **QA's 11 data Minors** (QA-P0-020 to 026, and 028 to 031), and the reseller rule in the
   validator.

**In the browser**
- `/lab/parts` shows the new fields with their sources. Examples: the Prime B760M-A WiFi D4's
  BIOS dates and slot positions, and the North's drive-tray layouts. The products added for the
  rule tests appear too.
- In `/lab/compat`, the §3 examples marked "needs D1" start to work.

**Done means**
- Every rule has a real product for each outcome, or a recorded gap that the Director has ruled
  on.
- Every new field has validator rules, with negative tests.
- QA has re-tested and closed the 11 Minors.
- QA has re-verified every power constant (§4).

### WP-D2 · Benchmark coverage
Owner: data-lead (two benchmark-researchers) · Needs: nothing. It delivers in batches · Waves 1–3

**Deliverable**
- **Games.** Anchors for the 10 games that have none: Valorant, Fortnite, Apex Legends, Black
  Myth: Wukong, Red Dead Redemption 2, GTA V Enhanced, EA SPORTS FC 27, Marvel Rivals, Elden Ring
  and Minecraft. And more chips for the 5 games that have some. The targets:
  - per game, GPU-bound anchors for at least 5 catalogue GPU chips, across the entry, mid and high
    tiers. 1440p is the base, plus 1080p for the esports titles and 4K for the AAA titles.
  - per game, CPU-bound anchors for at least 5 catalogue CPUs;
  - every catalogue GPU chip in at least 3 games, the RTX 5060 included (no game anchors today);
  - every catalogue CPU in at least 3 games (7 of the 16 have none today).
- **Creator workloads:**
  - Cinebench 2024 single and multi for all 16 CPUs (9 today);
  - Blender Open Data for all 11 GPU chips (9 today);
  - video export (PugetBench-style) and code compile (a named project);
  - local AI, as tokens per second for a named model and size, with its VRAM need.
- **Scaling data:** the effect of RAM speed and capacity, and VRAM use per game and setting, from
  published tests.
- **Preset names.** Each publisher's label is mapped to the game's own English preset name, with
  a source. ComputerBase's labels, for example, are German.
- **Gaps.** A game or workload with no reputable source after 2 tries gets a written record, and
  the lab shows "no estimate yet". Nothing is invented.

**In the browser**
- `/lab/accuracy` grows with each batch. The coverage grid shows a count in each game × chip and
  game × CPU cell, and every empty cell gives its reason.

**Done means**
- The targets are met, or each miss has a written record.
- Every row passes the validator: a registry publisher, full test conditions, `publishedAt`, and
  the archive rules.
- QA has re-read every row against its source (§4).

### WP-E1 · Compatibility rules
Owner: build-lead (engine-engineer) · Needs: WP-E0; WP-D1 for the rules marked in §3; WP-E2 for
`psu-wattage` · Wave 2

**Deliverable**
- **`COMPAT_RULES`:** the 18 rule ids from test plan §9.2, plus the two Hazem added (§6): 20
  rules. Each rule is a pure function that returns:
  - ok, warn or block;
  - a one-sentence reason, with the numbers and their units;
  - the rule id;
  - the sources of the specs it used.
- **Missing data** gives warn ("can't verify: … not published"), never ok.
- **The BIOS warning** for a board without BIOS FlashBack (Hazem, §6) tells the buyer exactly
  what to do, and names the BIOS version needed. For example: "The Core i5-14600K needs BIOS 1205
  or later on the Prime B760M-A WiFi D4, and this board can't update without a supported CPU. Ask
  the retailer for a board already updated to BIOS 1205 or later." design-lead sets the final
  wording (WP-DS2). Where the board has BIOS FlashBack, the warning gives the update steps.
- **Each case layout is checked as a whole.** The engine looks for one layout that meets every
  constraint at once: the drive trays, the Terra's spine position, where the radiator goes. It
  says which layout it assumed, or why none works.
- **Two batches:** first the rules that run on today's data, then the rules that need WP-D1.

**In the browser**
- `/lab/compat` has one row per rule: the status, the reason, the rule id and the source links.
  The §3 examples open from links in the hand-off.

**Done means**
- Each rule has positive and negative tests, plus boundary tests for numeric rules, named as in
  test plan §9.3.
- **Unknown-data tests** (Director's ruling on QA's finding, 2026-10-02):
  - Every rule that reads a field which can be unpublished has one. Such a field is null with a
    note, or a list that can be empty.
  - For a rule whose fields the schema or the validator require, the validator's negative tests
    must prove that a null there is rejected. QA's rule list names those tests.
  - The list is checked again whenever a rule starts to read a new field.
- QA's `compat-trace` check exits 0.
- The known-incompatibility corpus gives no ok, and the catalogue-wide sweep holds.
- Mutation tests (StrykerJS) run on the rules. Every surviving mutant is killed by a new test, or
  explained in writing.
- Every rule has passed its own QA worker (§4).

### WP-E2 · Power estimate
Owner: build-lead (engine-engineer) · Needs: WP-E0, and WP-D1's power registry · Wave 2

**Deliverable**
- **Two loads,** gaming and worst case. Each adds up the CPU (PPT or maximum turbo power), the GPU
  (TBP), the board, RAM, drives, fans and pump.
- **Transient headroom** per GPU class.
- **A recommended PSU range** (such as "750–850 W"), never a single number. It feeds
  `psu-wattage`.

**In the browser**
- `/lab/power` shows a breakdown table, each line with its source, the two totals, the headroom
  and the range. Swap the GPU, and the range moves.

**Done means**
- Every constant traces to the registry.
- For every catalogue GPU card, the range includes the card maker's recommended PSU, or the
  hand-off explains the difference. For example, NVIDIA recommends 1000 W for the RTX 5090
  Founders Edition.

### WP-E3 · Game performance model
Owner: build-lead (a second engine-engineer, in its own folder) · Needs: WP-E0. It starts on the
116 game anchors, and takes in WP-D2's batches as they land · Wave 3

**Deliverable**
- **The estimate.** The final FPS is the lower of two estimates:
  - a GPU-limited estimate per game, resolution and preset;
  - a CPU-limited estimate, from the CPU-bound tests.

  It is then adjusted for RAM speed and capacity. When a setting needs more VRAM than the card
  has, the result carries a VRAM flag.
- **Upscaling** is shown separately. Frame generation never mixes into native numbers.
- **The output:** a range, a confidence level, and the anchors behind it. The proposed confidence
  levels, finalised in WP-E3 and calibrated on the held-out results:
  - **high:** there is an anchor for this chip, game and setting;
  - **medium:** interpolated between anchored chips;
  - **low:** extrapolated, or combined across publishers.

**In the browser**
- On `/lab/games`, pick a CPU, GPU, RAM, game, resolution, preset and upscaling mode. You see, for
  example, "142–158 fps, estimated, confidence high". You also see which part limits it, both
  estimates, and the anchors used, each linked.
- Try a combination that ComputerBase measured, then switch to the RTX 5060, which has no game
  anchor today. The range widens, and the confidence drops.
- `/lab/accuracy` gains the model's number and the error for every anchor.

**Done means**
- **The golden test** is generated from the anchor files, with one case per row (143 today).
  - Every case passes within ±5%, in the anchor's own source context: its publisher and its test
    conditions.
  - The model may calibrate per source, for example with a scene factor per publisher and game.
    The calibration comes from the anchors, and the result's explanation names it.
- **Where reputable sources disagree** by more than 10% on the same configuration
  (`conflictsWith`): the estimate shown without a source context has a range that contains every
  published value of the pair, at medium confidence or lower (Director's ruling, 2026-10-02).
- **The held-out results:**
  - at least 20 (Hazem, §6), chosen blind by QA after the engine is frozen;
  - each within 10%;
  - at high confidence, at least half of the published numbers fall inside the range (test
    plan §8).
- The frame-generation and VRAM tests pass.
- The error report is in `docs/reports/phase-1.md`.

### WP-E4 · Creator workloads
Owner: build-lead (engine-engineer) · Needs: WP-E0, and WP-D2's creator data · Wave 3

**Deliverable**
- Estimates for:
  - Blender: from the Open Data score to the render time of a named scene;
  - Cinebench 2024 (BUILD_PROMPT's "R24"), single and multi;
  - video export and code compile;
  - local AI, in tokens per second, gated by VRAM.
- The same rules as for games: ranges, confidence and sources. Where there's no source, there's no
  estimate.

**In the browser**
- On `/lab/creator`, pick a CPU and a GPU. Each workload shows its range, or "no estimate yet: no
  published source".
- An 8 GB card, such as the RTX 4060, with a model that needs more memory says "doesn't fit in
  8 GB".

**Done means**
- Every creator anchor passes the golden test within ±5%.
- At least 4 held-out creator results are within 10%.

### WP-E5 · Bottleneck analyser
Owner: build-lead (engine-engineer) · Needs: WP-E1, WP-E3, WP-E4 · Wave 4

**Deliverable**
- **The verdict:** for each workload, the part that limits it, and by how much. For example: "At
  1440p High in Cyberpunk 2077 your GPU is the limit. A faster CPU would add about 2%, a GPU one
  tier up about 28%."
- **"One tier up"** means the next-faster catalogue part with a price in the chosen market.
- **1–3 rebalanced builds** at the same total price, in SAR or USD. Each one:
  - is within 5% of the build's total;
  - passes every rule with ok or warn;
  - shows its gain and its "price as of" date.

**In the browser**
- On `/lab/bottleneck`, pick a build, a workload and a market. You read the verdict and the
  rebalanced builds, each with its price and its compatibility.

**Done means**
- Every percentage in a sentence comes from the model, and a test pins it.
- Every rebalanced build passes the rules and the price limit.
- QA's bottleneck worker has passed it (§4).

### WP-Q3 · Test plan v4 and verification tools
Owner: qa-lead · Needs: WP-E0's result types · Wave 1

**Deliverable**
- **Test plan v4.** It sets:
  - the final rule ids, agreed with build-lead;
  - the held-out protocol: at least 20 results (Hazem, §6), 4 for each coverage class in test
    plan §8, with `models.heldOutCount` raised to match;
  - the format of the known-incompatibility corpus;
  - the mutation-test check;
  - the Phase 1 audit seed;
  - the brief for every §4 worker.
- **Tools:** `tests/audit/compat-trace.mjs`, and the check that the number of golden cases equals
  the number of anchor rows.

**In the browser**
- Nothing new. You read v4 on GitHub.

**Done means**
- The Director has accepted v4.
- Each tool fails on a planted defect.

### WP-Q4 · Independent verification and the QA report
Owner: qa-lead (data-auditors, e2e-tester, perf-tester) · Needs: each WP's hand-off · Waves 2–4

**Deliverable**
- The §4 checks, run for each WP as it lands.
- e2e tests for the lab pages.
- `docs/qa/report-phase-1.md`. As in Phase 0, the Director commits qa-lead's text unchanged.

**In the browser**
- QA's e2e tests drive the lab pages.
- The verdict for each rule and each source is in the report, which you read on GitHub.

**Done means**
- QA's verdict is CLOSED: 0 Blockers, 0 open Majors.

### WP-DS2 · Design backlog and engine copy
Owner: design-lead (ui-designer, motion-designer) · Needs: nothing · Wave 1

**Deliverable**
- **Specs** for the 49 items in `docs/design/backlog.md`, plus QA-P0-018 and 019.
- **Item 38 closes,** now that KTX2 is installed.
- **A short lab spec:** the result row, the status chip (never colour alone) and the estimate
  readout (item 44).
- **A copy guide** for reasons and verdicts: one sentence, numbers with units, plain English.
- **A wording review:** design-lead reviews every reason and verdict that the lab shows.

**In the browser**
- The lab's rows, chips, estimates and dates follow these specs.
- The other items are specs for Phases 2 and 3. You read them on GitHub.

**Done means**
- Every engine string has been reviewed, and each is either approved or rewritten.
- QA has checked the specs' AA claims.

## 3. Compatibility rules

These are the 18 ids from test plan §9.2, plus the two Hazem added (§6). "Try it" uses real
catalogue parts.

| # | Rule id | Checks | Try it in the lab | Data |
|---|---|---|---|---|
| 1 | `cpu-socket` | The CPU socket matches the board | Ryzen 7 9800X3D on the ASUS TUF Gaming Z890-Plus WiFi: block, "Needs AM5 — your board is LGA1851" | ready |
| 2 | `cpu-chipset` | The board's CPU support list includes the CPU | No real negative case in the catalogue yet | needs D1 |
| 3 | `bios-version` | Whether the CPU needs a newer BIOS, and whether the board has BIOS FlashBack | Ryzen 7 9850X3D on the TUF Gaming X870-Plus WiFi (BIOS 1066 or later; has FlashBack): warn, with the update steps. Core i5-14600K on the Prime B760M-A WiFi D4 (1205 or later; no FlashBack): warn, naming BIOS 1205 and telling the buyer to ask the retailer for a board already updated to it (§6) | ready; the dates need D1 |
| 4 | `ram-type` | DDR4 or DDR5 matches the board | G.Skill Trident Z Neo DDR4-3600 on the TUF Gaming B650-Plus WiFi: block | ready |
| 5 | `ram-slots` | The modules fit the DIMM slots | Needs a 4-module kit | needs D1 |
| 6 | `ram-speed` | The kit's speed against the board's and the CPU's official speeds | G.Skill Trident Z5 CK DDR5-8200 with the Core Ultra 9 285K on the TUF Gaming Z890-Plus WiFi: warn, naming the official speed and explaining XMP | ready |
| 7 | `gpu-length` | Card length against the case, per layout | Sapphire Pulse RX 9070 XT (320 mm) in the Fractal North: ok (355 mm limit). Add the ARCTIC Liquid Freezer III Pro 360 at the front: block (300 mm limit) | ready |
| 8 | `gpu-thickness` | Card thickness against slot spacing and the case's slots | Fractal Terra with the Sapphire Pulse RX 9060 XT and the DeepCool AN400: the result names the spine positions where both fit | the Terra's data is ready; the board slots need D1 |
| 9 | `cooler-height` | Air-cooler height against the case, per layout | DeepCool AK620 (160 mm) in the Fractal Terra: block | ready |
| 10 | `ram-cooler-clearance` | RAM height under an air cooler | TeamGroup T-Force Delta RGB (46.1 mm) under the AK620 (43 mm): block, or warn if the fan can move up. DeepCool AN400 (clearance not published): warn, "can't verify" | ready |
| 11 | `radiator-fit` | Radiator size and position against the case | ARCTIC Liquid Freezer III Pro 360 in the Fractal Pop Mini Air (240 mm at most): block | ready; the North needs D1 |
| 12 | `psu-form-factor` | The PSU form factor against the case | DeepCool PN850M (ATX) in the Fractal Terra (SFX and SFX-L only): block | ready |
| 13 | `psu-length` | PSU length against the case, per layout | NZXT C1200 Gold (160 mm) in the Pop Mini Air (150 mm): block. In the North it fits with one drive tray, but not with two | ready; the North needs D1 |
| 14 | `psu-wattage` | Wattage against the estimated load, with transient headroom | RTX 5090 Founders Edition with the DeepCool PN650M: block, showing the recommended range | needs E2 |
| 15 | `gpu-power-connector` | A native 12V-2x6 where needed, and enough 8-pin cables | Every catalogue PSU passes today | needs D1 |
| 16 | `m2-lanes` | M.2 count, and lane-sharing side effects | Three NVMe drives on the ROG Strix B650E-I (2 slots): block. A drive in a shared slot on the TUF Gaming B550-Plus WiFi II: warn, quoting the manual | ready |
| 17 | `board-form-factor` | The board's form factor against the case | TUF Gaming B650-Plus WiFi (ATX) in the Pop Mini Air: block | ready |
| 18 | `usb-c-header` | A front USB-C port needs a header on the board | Fractal North with the TUF Gaming B550-Plus WiFi II (no header): warn | ready |
| 19 | `cooler-socket` (added, §6) | The cooler's mounting kit fits the CPU socket | Needs a cooler that doesn't fit every socket | needs D1 |
| 20 | `display-output` (added, §6) | A build with no graphics card needs a CPU with integrated graphics | Core i5-12400F with no graphics card: block | ready |

## 4. Independent verification: where it fans out

**Rules for every check**
- **Fresh workers.** Each item gets a new worker with no shared context. It is never the author
  of the work.
- **Expectations first.** The worker writes its expected results from the maker or review
  sources. Only then does it compare them with the engine's output, taken from the dump script or
  the lab. It never reads the engine's code.
- **Evidence** is JSON under `artifacts/qa/phase-1/`, with a checksum manifest, as in Phase 0.
- **Defects.** A mismatch goes to the owning lead as a defect. The worker that found it re-tests
  the fix.

| What | Fan-out | Workers | When | Passes when |
|---|---|---|---|---|
| **Every compatibility rule** | 1 worker per rule | 20 | As each rule hands off, 4 at a time | Each real combination it tried matches its expected result. The reason names the right parts, numbers and units, and the source links open the right page. The boundary and unknown-data cases behave as specified |
| Known incompatibilities, and the sweep | 1 worker | 1 | After WP-E1 | No ok for any real combination known not to work (from manuals, support lists and case pages). The catalogue-wide sweep holds |
| **Every benchmark anchor: the data** | 1 worker per source review. A source with more than about 50 rows is split | 5 for today's 143 rows, plus 1 for each review WP-D2 adds | After each WP-D2 batch the Director accepts | Every row's value and conditions match the source: resolution, preset, ray tracing, upscaling, frame generation, test CPU and GPU, driver and date |
| **Every benchmark anchor: the model** | The golden test, generated with 1 case per row | None: it runs in CI | Every PR | Every case is within ±5% in its own source context, and QA checks that the number of cases equals the number of rows. For each conflicting pair, the range shown contains both values |
| Held-out results | 1–2 workers pick them; another checks the picks | 2–3 | After WP-E3 and WP-E4 are frozen | At least 20 results, 4 per coverage class, chosen blind and absent from the data, each within 10% |
| Power constants | 1 worker | 1 | After WP-E2 | Every constant matches its source, and the PSU range is checked against every card maker's recommendation |
| Bottleneck verdicts | 1 worker | 1 | After WP-E5 | For 20 builds that QA picks, each sentence matches the model's numbers, and each rebalanced build passes the rules and the price limit |
| 10% of all numbers (BUILD_PROMPT §2) | A seeded sample, by category | 2–3 | Wave 4 | As in test plan §7. The anchors are already checked at 100% |

**Today's 143 anchors, by source** (one worker each):
1. ComputerBase, "Gaming-Grafikkarten 2026 im Test" (2026-05-06), page 4: 48 GPU-bound rows;
2. the same article, page 5: 32 rows;
3. TechPowerUp, the Ryzen 7 9850X3D review (2026-01-28), page 18: 36 CPU-bound rows (9 CPUs × 4
   games at 1080p);
4. TechPowerUp, the Ryzen 7 9800X3D review (2024-11-06), page 9: 18 Cinebench 2024 rows;
5. Blender Open Data, Blender 5.2.0, with OptiX, HIP and oneAPI: 9 rows.

**Cost.**
- About 45–55 worker runs over the phase, at most 4 at a time.
- Each batch ends in a checkpoint (rule 12), so a stop loses at most one batch.
- By default, qa-lead spawns the workers. A scripted Workflow could run the same fan-out instead,
  but only if you ask for one ("use a workflow").

## 5. Order and milestones

| Wave | Starts when | Work |
|---|---|---|
| 1 | You approve this plan | E0, D1, D2's first batch, Q3, DS2 |
| 2 | E0 is accepted | E1: the rules on today's data first, then the D1 rules. E2, once D1's power registry lands. QA's per-rule checks follow each hand-off |
| 3 | E0 and D2's first batch are accepted | E3 and E4. QA's per-source anchor checks run on each D2 batch |
| 4 | E1, E3 and E4 are accepted | E5; the engine freeze, then the held-out set; the 10% spot-check; QA's report; the phase report |

**Milestone PRs to `main`** (agreed with Hazem on 2026-10-02):
- **M1,** after E1 and E2: compatibility and power go live on the site.
- **M2,** after E3 and E4: games and creator workloads.
- **M3,** at the phase exit.

Hazem merges each with "Create a merge commit", so that the commit IDs the reports cite stay
valid.

**The team.** The Director turns this plan into `docs/reports/phase-1-briefs.md` and re-spawns
the four leads, reusing their worktrees. The Phase 0 working rules stay:
- workers report by message;
- QA's report text goes through the Director;
- a rule 12 checkpoint follows every accepted task.

## 6. Decisions (Hazem, 2026-10-02)

1. **BIOS without FlashBack: warn, not block.** Some CPUs need a newer BIOS than older boards
   shipped with. In today's catalogue, the Prime B760M-A WiFi D4 has no BIOS FlashBack, and the
   14th-gen Core CPUs need BIOS 1205 or later on it.
   - The message must tell the buyer exactly what to do: ask the retailer for a board that's
     already updated. It must also name the BIOS version that's needed.
   - The Director's reasons for warn, which Hazem accepted: boards made after that BIOS came out
     usually ship with it, and we can't know which board a shop sends. A block would hide builds
     that work for most buyers.
2. **Both extra rules are added,** beyond BUILD_PROMPT §5.1:
   - `cooler-socket`: the cooler's mounting kit must fit the CPU socket.
   - `display-output`: a build without a graphics card needs a CPU with integrated graphics. The
     Core i5-12400F, Ryzen 5 5600 and Ryzen 7 5700X3D have none.
3. **At least 20 held-out results,** raised from the proposed 10: 4 per coverage class of test
   plan §8.
4. **The other defaults stand:**
   - the lab is on the live site, marked internal (§1);
   - three milestone PRs (§5);
   - rebalanced builds are within 5% of the build's price.

## 7. Not in Phase 1

- **The builder UI and its step pages** are Phase 2. The lab is the only UI.
- **Growing the catalogue to the v1 size** (BUILD_PROMPT §4, rule 6) is Phase 2 work, alongside
  the builder. Phase 1 adds only the products that the rule tests need.
- **Prices:**
  - more SA retailers, and Newegg's seller selector: Phase 4, with the Buy Sheet;
  - the re-price batch: before launch.
  The rebalanced builds use today's prices and show their dates.
- **3D** is Phase 3. Hazem decides on paid 3D assets before then. KTX2 is installed.
- **Deferred QA items:** QA-P0-006 (LCP under applied throttling) at Phase 2 entry, and QA-P0-016
  and 017 (build-lead) in Phase 2.

## 8. Risks

1. **Publishers test different scenes.** ComputerBase's GPU anchors and TechPowerUp's CPU-bound
   anchors share no scene, so the minimum of their raw numbers could undercut a measured result.
   WP-E3 scales the CPU limits against each source's own reference CPU, and the golden test
   catches any anchor this breaks.
2. **Some sources are thin.** EA SPORTS FC 27 is new, and Minecraft with shaders is rarely tested.
   Where no reputable test exists, the game shows "no estimate yet".
3. **±5% is easy at the anchors themselves,** because the model reads them directly. The real
   proof of accuracy is the held-out set, which is why it has at least 20 results.
4. **Blender times.** Open Data publishes samples per minute. A render time also needs the scene's
   sample count, from a published source. Without one, the lab shows samples per minute.
5. **Usage limits.** The fan-out is the costliest part of the phase. It runs in batches, with a
   checkpoint after each (§4).

## 9. Phase 1 exit

- Every WP is done (§2).
- QA's verdict is CLOSED: 0 Blockers and 0 open Majors.
- **BUILD_PROMPT §2:**
  - the engine is pure TypeScript, with 100% unit coverage;
  - every anchor is within ±5%;
  - the held-out error is reported;
  - the 10% spot-check has passed.
- **BUILD_PROMPT §8:**
  - every compatibility rule has passing positive and negative tests;
  - there are no console errors or warnings;
  - axe AA passes;
  - every page, the lab included, is within the JS budget.
- **Wrap-up:** `docs/reports/phase-1.md` with the Director's sign-off, and the M3 PR for Hazem.
