# Phase 1 worker briefs (QA)

Owner: qa-lead · 2026-10-02 · Test plan v4, §17. Read with `docs/reports/phase-1-plan.md` §4.

qa-lead spawns one fresh worker per item and pastes into its prompt: the common rules, its own
brief, the item it checks, the integration commit it reads, and the folder it writes to. The
worker types are in `.claude/agents/`: data-auditor for checks A to H, e2e-tester and perf-tester
for I.

---

## Common rules (every worker)

1. **You are independent.** You are not the author of what you check, and you share no context
   with it. Never open `src/engine/**`: you check the engine by its output, never by its code.
   Never open `tests/audit/holdout/**`, unless your brief is E.
2. **Expectations first.** In stage 1 you write what the sources say the result must be. You
   don't open any engine output in stage 1: not the dump, not the lab, not
   `artifacts/engine/**`. qa-lead commits your stage-1 file before stage 2 starts, and that commit
   proves the order.
3. **Sources.** The maker's page first, then the routes of test plan §7.4: WebFetch, a Wayback
   Machine snapshot, the official PDF manual or datasheet, another page of the same maker. For a
   benchmark, the publisher's page or an archive of it.
4. **Politeness.** One request at a time per host. Never get around bot protection: no stealth
   plugins, no captcha solving, no user-agent games. A source you can't reach is UNVERIFIABLE,
   with every route you tried.
5. **What you write.** Only under the folder qa-lead gives you,
   `artifacts/qa/phase-1/<check>/<item>/`: JSON data, captures in `captures/`, logs, and
   `manifest.sha256` (`sha256sum` format, one line per file you wrote). No `.md` files, no git
   commands, nothing outside that folder.
6. **Captures** of third-party pages stay in that folder and are cited by path and SHA-256. They
   never go into git.
7. **Every claim has evidence.** A value you read names its URL, its locator (section, table,
   chart, page) and its capture.
8. **Skills.** verification-before-completion for everyone; webapp-testing for a worker that
   drives a browser. Close your browser when you finish.
9. **When you finish,** send your full report to `qa-lead` with SendMessage, then end with the
   one-line reply "Report sent to qa-lead."

---

## A. One compatibility rule

**Item:** one rule id from test plan §9.2. Twenty runs in all, 4 at a time, as each rule hands
off.

**Read:** the rule's row in test plan §9.2 and its entry in `tests/audit/compat-rules.json`;
phase-1-plan §3's row; `data/compat-fixtures.json` (data-lead's real products for each outcome);
`data/parts/*.json`; and the makers' pages those parts cite.

**Stage 1, the expectations:**
1. For each outcome `data/compat-fixtures.json` lists for the rule, work out the expected result
   yourself from the makers' sources. The fixture table is data-lead's claim: re-read every value
   it rests on.
2. Add at least 3 combinations of your own from the catalogue, the hardest you can find: closest to
   the limit, under a conditional row, or across case layouts. For a numeric rule, include the real
   combination nearest each side of the limit.
3. For a rule with `unknownData: true`, add every real catalogue part whose value for the rule is
   not published (null with a note). Each one is expected to give `warn` with `cantVerify`.
4. Write `expected.json`:

   ```json
   {
     "ruleId": "gpu-length",
     "catalogueCommit": "<the integration commit you read>",
     "writtenAt": "<ISO time>",
     "cases": [
       {
         "id": "gpu-length-01",
         "origin": "fixture",
         "build": { "gpu-card": "<id>", "case": "<id>", "cooler": "<id>", "...": "the other BuildParts keys, null or []" },
         "expect": { "status": "block", "cantVerify": false },
         "reasonMustMention": ["320 mm", "300 mm"],
         "basis": [
           {
             "partId": "<id>",
             "field": "lengthMm",
             "value": 320,
             "unit": "mm",
             "source": { "url": "<maker page>", "locator": "<section>", "capture": "captures/<file>", "captureSha256": "<hex>" }
           }
         ],
         "why": "One sentence."
       }
     ]
   }
   ```

   `origin` is `fixture` or `own`. `reasonMustMention` holds the numbers with their units, and the
   part names, that a correct reason has to give.
5. Report `expected.json`'s SHA-256, and stop.

**Stage 2, the comparison** (qa-lead, after the commit): each build goes through the dump's query
mode at the integration commit. A case passes when:
- the status and `cantVerify` match;
- the reason contains every `reasonMustMention` string;
- each `basis` source URL is among the sources of the matching evidence item.

When they disagree, qa-lead sends you the engine's result for a second look. You answer with one
of two verdicts, with the source that settles it:
- "My expectation was wrong, because …": qa-lead records the correction;
- "The engine is wrong": a defect to build-lead, or to data-lead when the data is wrong.

**Passes when:** every case matches, every reason names the right parts, numbers and units, and
every source link you opened in stage 1 is the right page.

---

## B. Known incompatibilities and the sweep

**Read:** test plan §9.4; `data/parts/*.json` and the makers' manuals, CPU support lists and case
pages. Do not read `data/compat-fixtures.json`: the corpus must come from the sources, on its own.

**Stage 1:**
1. Build `tests/audit/compat-corpus.json` in the format of test plan §9.4, as a draft in your
   folder: real catalogue combinations that can't work under any case layout. Write at least one
   entry for each of the 17 rules that can block, and two where the catalogue allows.
2. Each entry gets one sentence of why, with numbers and units, and the sources with their
   captures.
3. Report the draft's SHA-256, and stop.

**Stage 2:** qa-lead commits the corpus, runs it through the query mode, and runs the sweep script
(invariants S1 to S15, `tests/audit/compat-sweep.mjs`, WP-Q4) on the dump. You review each failure
against its sources and give a verdict: a defect, or a mistake in the corpus with its source.

**Passes when:** no entry gives `ok` or "not run" for an expected rule, and every invariant holds.

---

## C. One anchor source: the data

**Item:** one source review from test plan §17's list, or one review that a WP-D2 batch adds. A
review of more than about 50 rows is split.

**Read:** the blind key list qa-lead gives you, made by `tests/audit/anchor-keys.mjs`. For each row
of the review it holds the id, the game or workload, the test system, every test condition, the
notes and the sources (url, archive, locator), but no values. A note that printed a value is
withheld, and the row's `withheldNotes` names the field it was on. Read also the source pages, live
or archived (test plan §7.4), on the hosts qa-lead names, one request at a time.

**Stage 1:**
1. For each row, read the value from the source: avg fps and 1% low, or the score with its unit.
   Note how you read it: a printed number (a table cell, a bar label, a data attribute), or read
   off a chart without labels (test plan §7.3: ±1% or ±1 unit, whichever is larger).
2. Re-read every test condition from the source, and treat the key list's conditions as claims:
   - resolution, the preset as published, ray tracing, and the upscaler with its mode and version;
   - frame generation;
   - the test CPU, GPU and RAM, the driver, and the game version;
   - the review's `publishedAt`.
3. Write `transcribed.json` (below), one entry per row, each with its locator and capture. Report
   its SHA-256, and stop.

**`transcribed.json`:**
```json
{
  "schemaVersion": 1,
  "review": "<the key list's review>",
  "keyListSha256": "<the key list's SHA-256, from your prompt>",
  "routes": [
    { "url": "…", "route": "live", "result": "ok", "capture": "captures/page-4.html" }
  ],
  "shared": {
    "testSystem.ram": {
      "claim": "<the key list's value, copied>",
      "verdict": "MATCH",
      "source": "<the source's own words>",
      "locator": "…",
      "capture": "captures/…"
    }
  },
  "rows": [
    {
      "id": "<row id>",
      "values": {
        "avgFps": { "value": 145.6, "printedAs": "145,6", "how": "printed", "locator": "…", "capture": "…" },
        "onePercentLowFps": { "value": null, "printedAs": null, "how": "not published", "locator": "…", "capture": "…" }
      },
      "conditions": {
        "resolution": { "verdict": "MATCH", "source": "2.560 × 1.440", "locator": "…", "capture": "…" },
        "gameVersion": { "verdict": "NOT STATED", "source": null, "locator": "pages read: …", "capture": "…" }
      },
      "unverifiable": null
    }
  ]
}
```
- **`values`:** `avgFps` and `onePercentLowFps` for a game row, `score` for a creator row. `how` is
  `printed`, `chart` or `not published`. `printedAs` is the number exactly as the source prints it.
- **`conditions`:** one entry per claim of the row, by its path in the key list:
  - a game row: `gameId`, `limiter`, `resolution`, `preset`, `rayTracing`, `upscaling.method`,
    `upscaling.mode`, `upscaling.version`, `frameGeneration`, `scene`, `gameVersion`, every
    `testSystem` field, and `publishedAt`;
  - a creator row: `app`, `appVersion`, `test`, `device`, `backend`, `subject`, `unit`,
    `aggregate`, every `testSystem` field, and `publishedAt`;
  - never the catalogue ids (`catalogueId`, `chipId`, `cardId`, `cpuId` in `subject`): qa-lead
    checks those against the catalogue. Read `subject`'s id as the chip or CPU it names.
- **`verdict`**, against the key list's claim:
  - `MATCH`: the source says the same;
  - `MISMATCH`: the source says something else, quoted in `source`;
  - `NOT STATED`: the source doesn't say; `locator` names the pages you read;
  - `UNVERIFIABLE`: no route reached the source, and `routes` lists every one you tried.
  - A claim of `null` is `NOT STATED` when the source doesn't say, or `MISMATCH` with the
    source's words when it does.
- **`shared`:** a verdict that holds for every row with the same claim, such as the test bench,
  written once. It applies to each row whose claim equals its `claim` and that has no entry of its
  own for that field.
- **`unverifiable`:** for a row you couldn't reach at all, the reason instead of verdicts.

**Stage 2** (qa-lead): `tests/audit/anchor-compare.mjs` compares `transcribed.json` with the data
rows, field by field, by test plan §7.3's rules.

**Passes when:** every row's value and every condition match. A mismatch is a Blocker for
data-lead (test plan §7.3).

---

## D. Each anchor: the model

No worker. golden-count runs in CI on every PR (test plan §8.1). qa-lead adds the
conflicting-pairs check when the first `conflictsWith` row lands.

---

## E. Held-out results: the picker and the checker

**Picker.**
- **Read:** the frozen commit SHA from qa-lead; at that commit, `data/benchmarks/*.json` (to know
  what is anchored), `data/publishers.json`, `data/games.json` and `data/parts/*.json` (the
  catalogue's chips and CPUs); and the reviews you find.
- **Never** open the lab, the dump, `artifacts/engine/**` or any other model output.
- **Steps:**
  1. Find published results that meet test plan §8.2: the five classes, at least 4 each and 20 in
     all, plus 2 spares per class; the mix rules; the eligibility rules.
  2. For each, capture the page and transcribe the value and every condition.
  3. Write `phase-1.json` in the format of test plan §8.2 into your folder, and report its SHA-256.

**Checker** (a second fresh worker, after qa-lead commits the picks).
- **Read:** the committed `tests/audit/holdout/phase-1.json`, the same data files at the frozen
  commit, and each pick's source.
- **Never** open model output.
- **Steps:**
  1. Re-check every eligibility rule for every pick: the publisher, the URL grep, the conditions,
     coverage, how the value was read.
  2. Re-read each value from its source.
  3. Check the class and mix rules.
  4. Write `check.json`, with one verdict per pick (eligible, or not and why), and report.

**Passes when** at least 20 picks, 4 per class, are eligible. qa-lead then runs the model once
(test plan §8.2).

---

## F. Power constants

**Item:** the power constants registry from WP-D1 batch 2, and every catalogue graphics card.

**Read:** the registry and its sources; `data/parts/gpu-card.json`; the card makers' pages.

**Stage 1:**
1. Re-read each constant's value from its source.
2. Recompute every derivation, for example a fan's watts as its rated current × 12 V.
3. For each catalogue card, note the maker's recommended PSU from the maker's page.
4. Write `expected.json`, report its SHA-256, and stop.

**Stage 2** (qa-lead): the power estimate for each card in a reference build goes through the query
mode.
- Every line's basis must trace to a registry constant or a part spec.
- The recommended range must contain the card maker's recommendation, or the WP-E2 hand-off must
  explain the difference. For example, NVIDIA recommends 1000 W for the RTX 5090 Founders Edition.

**Passes when** every constant and derivation matches, and every card meets the range rule.

---

## G. Bottleneck verdicts

**Item:** 20 builds that qa-lead picks with a seed: CPU-limited and GPU-limited cases, both
markets, and low, mid and high budgets, each with its workload.

**Stage 1**, before reading any report:
1. From the catalogue and the price files at the integration commit, work out each build's total
   in its market, never converting a currency.
2. List the catalogue parts that have a price in that market, as candidates for "one tier up".
3. Write `expected.json`, report its SHA-256, and stop.

**Stage 2** (qa-lead runs the reports through the query mode; you check them):
- Every number in the verdict sentence equals the matching gain in the report, rounded as written.
- "One tier up" is the next-faster catalogue part with a price in the market. Check it with the
  model's own estimates for each candidate, through the query mode.
- Each rebalanced build:
  - its total, recomputed from its price references, is within 5% of the build's total;
  - it gives no `block` through the query mode;
  - every price shows its "price as of" date.

**Passes when** all 20 builds pass.

---

## H. 10% of all numbers

**Item:** a group of strata from the Phase 1 sample (test plan §7.2: `rig-lab-audit:phase-1:<sha>`,
drawn by `tests/audit/sample.mjs` after `strata.mjs`).

**Steps:**
1. Compare every field of each sampled record with its source, by test plan §7.3. The outcomes are
   MATCH, MISMATCH, NOT COVERED, NULL OK, NULL BUT PUBLISHED and UNVERIFIABLE.
2. A price is compared with its capture at `retrievedAt`, never with today's page (test plan §7.5).
   A different live price is drift, not an error.
3. Write `fields.json`, one entry per field, and report.

**Passes when** no field is MISMATCH or NOT COVERED, and every NULL BUT PUBLISHED and UNVERIFIABLE
is a recorded Major.

---

## I. The lab pages

**e2e-tester** (WP-Q4): Playwright tests for the lab routes, using the shared fixture (test plan
§13.2). They check:
- each route answers 200 with its title and one `h1`;
- the page says "Engine lab: internal preview", has `<meta name="robots" content="noindex">`, and
  isn't linked from the site nav;
- the part picker's choice survives a reload through the URL;
- the plan §3 links open with each rule's row showing its status chip, which never relies on colour
  alone, its reason, its rule id and its source links;
- `/lab/accuracy` lists every row of the anchor files at the commit under test, counted from the
  data (143 at `c621c15`; each WP-D2 batch adds more), and the coverage grid;
- every estimate shows a range, the word "estimated" and a confidence word, and no
  frame-generation figure appears in a native row;
- no console errors or warnings.

axe already covers every route in the route table, in both themes at all three widths.

**perf-tester** (WP-Q4):
- `npm run perf:bundle`: the product pages' initial JS stays within 2 KB of 77.92 KB gzip, with no
  catalogue data and no Zod in it;
- the lab's initial JS is under 250 KB;
- a network log on every product route shows no catalogue fetch.
