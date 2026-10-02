# Rig Lab data

Owner: `data-lead`. This folder holds the schemas and the validator. The data itself lives in `data/`.
Every number on the site comes from these files. The rule behind all of it: **no number without a
source** (`url`, `publisher`, `retrievedAt`), and a missing value stays missing.

## Layout

| Path | What it holds |
|---|---|
| `data/publishers.json` | Every publisher a source or price may cite: its `kind` and `domains` (and `markets`, for retailers). |
| `data/parts/<category>.json` | One file per spec category: `cpu`, `motherboard`, `ram`, `gpu-chip`, `gpu-card`, `storage`, `psu`, `cooler`, `case`, `case-fan`. |
| `data/prices/us.json`, `data/prices/sa.json` | One price batch per market: observations and gap records. |
| `data/benchmarks/game.json` | Game FPS anchors from published reviews. |
| `data/benchmarks/creator.json` | Creator-app anchors (Cinebench 2024, Blender). |
| `data/games.json` | The games list, with dated player counts. |
| `data/compat-fixtures.json` | Real catalogue builds for every compatibility rule's tests: per rule and outcome, a fixture or a gap (see "Compatibility fixtures"). |
| `data/audits.json` | The data lead's seeded audits: the sample per batch, what each item was read against, findings and fixes (see "Review"). Not catalogue data. |
| `data/tools/` | Data scripts: the audit sampler (`audit_sample.py`), the price runners (`prices_run.py` for Amazon US and SA, `prices_newegg.py`), their Playwright capture helpers (`pw-price.cjs`, `pw-fetch.cjs`) and `capture-name.mjs`. |
| `src/data/schema/` | Strict Zod schemas, one per file type. `files.ts` holds `DATA_PATHS`, the single source of truth for the layout. |
| `src/data/validate/` | The validator. `issues.ts` lists every rule ID (`RULES`). |
| `src/data/semantics.ts` | What the data means, without Zod, for the engine: `nullMeansNone` and `nullIsNone` (a null that means "none", not "not published"). The validator uses the same functions. |
| `src/data/dataset.test.ts` | Runs the validator over everything in `data/`. Any error fails CI. |
| `src/data/seed.test.ts` | Seed minimums, plus the real parts behind each required compatibility case. |
| `src/data/audits.test.ts` | Checks `data/audits.json`: sample sizes, and that every sampled item and finding points at real data. |

Category IDs are the ones in `SPEC_CATEGORIES`. GPUs are two categories: `gpu-chip` (the GPU as the
chip maker specifies it; not sold, never priced) and `gpu-card` (a card you can buy, pointing at its
chip with `chipId`).

## Running it

- `npx vitest run src/data`: schemas, rules and seed checks (fast).
- `npm run verify`: the full gate (typecheck, lint, unit with coverage, build, e2e smoke).

A failure prints `[error] <rule> @ <file> > <record id> > <path>: <message>`.

## Records

Every spec record has `id` (kebab-case, unique across the whole dataset), `category`,
`manufacturer` (a `manufacturer`-kind publisher ID), `brand`, `name`, `sources` and optional `notes`.
The schemas are strict: an unknown key is an error.

### Sources

A real one, from the TUF GAMING B650-PLUS WIFI:

```json
{
  "url": "https://dlcdnets.asus.com/pub/ASUS/mb/Socket%20AM5/TUF%20GAMING%20B650-PLUS%20WIFI/E21902_TUF_GAMING_B650-PLUS_WIFI_UM_V3_WEB.pdf",
  "publisher": "asus",
  "retrievedAt": "2026-09-30",
  "docType": "manual",
  "fields": ["laneSharing"],
  "title": "User's Manual E21902 (V3)",
  "locator": "p. vii, Storage"
}
```

- `url` must be on one of the publisher's `domains` (subdomains count).
- `retrievedAt` is the UTC date we read the page. Nothing may be dated after today.
- `fields` lists the dot paths this source backs (`*` matches any array index). Leave it out and the
  source backs the whole record. Every non-null value must be backed by a source whose publisher kind
  may back that record type (rule `coverage`).
- `locator` says where on the page the value is. Quote labels and titles exactly as the page shows
  them (`bar "Ryzen 7 9850X3D / Stock"`, `Chart "Battlefield 6, 2.560 × 1.440, DLSS/FSR Native"`), so a
  search of the page finds them.
- Which kinds count: `manufacturer` for specs; `reviewer` and `benchmark-database` for benchmarks;
  `tracker`, `platform`, `game-publisher` and `news` for the games list. `retailer` backs prices only.
  A spec record needs at least one source from its own manufacturer.
- On motherboards, `biosSupport.cpus` must come from a `cpu-support-list`, `biosSupport.families` from
  a `cpu-support-list` or `bios-release-notes`, and `laneSharing` from the `manual` (rule `doc-type`).

### Archived pages (Wayback Machine)

Some maker and review sites answer our fetcher with a bot challenge. We never work around a challenge.
Instead we may read a Wayback Machine copy, for specs and published reviews only:

- `url` stays the original page. It is never an archive link (rule `url-is-archive`).
- `archiveUrl` is the full snapshot link with a 14-digit timestamp, for example
  `https://web.archive.org/web/20260108005538/https://www.samsung.com/...`. It must point at the same
  `url`, and the snapshot may not be dated after `retrievedAt` (rule `archive-form`).
- A benchmark row read from an archive also needs `publishedAt`, and its snapshot may not be dated
  before `publishedAt` (rule `benchmark-snapshot-date`).
- **Prices never use archives**, caches, search snippets, trackers or aggregators.

### Null values

`null` means "the maker does not publish it", and it needs a note that says so:

```json
"notes": [{ "field": "cache", "text": "Sandisk does not say on the product page whether the SN8100 has a DRAM cache." }]
```

For some fields the schema documents `null` as "none", so no note is needed (rule `null-note`):

| Category | Fields where `null` means none |
|---|---|
| cpu | `hybrid`, `igpu`, `boxCooler`, `memory.speeds.*.config` |
| motherboard | `wifi`, `bluetooth`, `lan`, `biosSupport.families.*.minBiosVersion` (first BIOS already supports it), `biosSupport.cpus.*.minBiosVersion` unless the listing is `since`, `biosFlashback.name` when unsupported |
| ram | `profiles.xmp` |
| gpu-card | `ocModeBoostClockMhz`, `powerConnectors.*.standard` on 8-pin and 6-pin plugs, `powerAdapter` on a card without a 16-pin plug |
| psu | `connectors.pcie16pinStandard` when there is no 16-pin cable, `atxBracketIncluded` on an ATX unit |
| cooler | `nsprRating` (except Noctua, which publishes it), `singleFanRamClearanceMm` (none published, or one fan) |
| case | `gpuClearance.*.condition`, `coolerClearance.*.condition` and `psu.clearance.*.condition` (the unconditional limit), `includedFans.*.model`, `gpuMaxHeightMm` (no published height limit) |

### Fields worth knowing

- **Motherboard BIOS**: `biosSupport.families` has one row per CPU family on the socket, with the
  earliest BIOS that supports it; `biosSupport.cpus` has one row per catalogue CPU as the support list
  shows it (`all`, `since` a version, or `not-listed`), with the cell text verbatim.
- **Lane sharing**: `laneSharing` rules say "when slot X holds a device (any, NVMe or SATA), these slots
  are disabled or reduced to N lanes", with the manual page and the manual's words. Slot IDs are local
  to the board (`m2-1`, `pcie-1`, `sata-5`).
- **Case clearance**: `gpuClearance`, `coolerClearance` and `psu.clearance` have one row per condition
  the maker publishes. `condition: null` is the default limit, which always applies; a conditional row
  tightens it when its condition holds, so a layout's limit is the lowest row that applies. GPU and
  cooler limits have exactly one default row. A PSU limit may have none, when the maker only gives
  per-configuration limits (the North: 255 mm with one tray, 155 mm with two).
- **Structured conditions** (`LayoutCondition` in `schema/case.ts`), with the maker's words kept in
  `asPublished`:
  - `{ kind: 'radiator', position, sizesMm }`: a radiator of one of these sizes at this position (the
    North: 300 mm "with a 360 mm front radiator"; the Terra: 200 mm "if installing a 120 mm radiator").
    A row covers exactly the sizes it lists: when a case has rows for a radiator at a position, a
    radiator of another size there has no published limit, so the rule can't verify;
  - `{ kind: 'drive-trays', count }`: this many drive trays fitted.
  The validator checks that each condition is possible in that case.
- **Case `driveTrayLayouts`**: only for a case whose maker publishes limits per drive-tray layout (the
  North's user guide p. 26): the trays' positions, and the PSU length and largest front radiator each
  layout leaves room for. A build fits when one layout fits all its parts.
- **Case size**: `size` is derived, not sourced, so it needs no source. It goes by the largest
  supported board: ATX or E-ATX is `mid-tower` (`full-tower` only when the maker's own class says
  full tower), Micro-ATX is `mini-tower`, and Mini-ITX only is `small-form-factor` (`deriveCaseSize`
  in `schema/case.ts`, checked by the validator). `makerSizeClass` keeps the maker's own words,
  sourced like any value (Fractal "Regular" or "Small", DeepCool "mid-tower"); they don't map one to
  one onto `size`.
- **Variants and configurations**: makers often share one value across a product family and qualify
  it in a note ("145 mm with Fan Bracket (Mesh version only) / 170 mm without"). Record the value for
  this record's exact SKU, with any configuration as a condition, and quote the maker's note.
- **Case `layoutPositions`**: only for cases with a movable motherboard plate (the Fractal Terra's
  spine). Each position gives a cooler height limit and a GPU thickness limit, plus an optional tighter
  thickness limit for tall GPUs (`tallGpuLimit`) and the thickest radiator plus fan that fits
  (`radiatorFanMaxThicknessMm`). A build fits when one position fits all its parts. When present it
  supersedes the single cooler and GPU-thickness limits.
- **Case `radiatorSupport`**: one entry per position and size group, with `maxThicknessMm` as the
  maker's manual or page states it: the radiator alone, unless the maker says radiator plus fan, as the
  Terra does in `layoutPositions`. When the limit differs by size at one position (the North's front:
  55 mm for 120/240/360, 35 mm for 140/280), use one entry per group. Read the manual's radiator page,
  not only the product page. Radiator width limits have no field yet; quote them in a note.
- **GPU power**: `powerConnectors[].type` is `16-pin`, `8-pin` or `6-pin`. For 16-pin, `standard` is
  `12V-2x6` or `12VHPWR` only when the maker names it; otherwise `null` with a note. A 16-pin card's
  `powerAdapter` is the adapter in the box: `pcie8pinInputs`, and `separateCables` when the maker wants
  one PSU cable per plug (NVIDIA's Quick Start Guides: "independent dedicated cables").
- **PSU cables**: `connectors.pcie8pin` counts PCIe 8-pin (6+2) connectors, and `pcie8pinCables` the
  cables that carry them (a daisy-chained cable carries two). An SFX unit says whether an SFX-to-ATX
  bracket is in the box (`atxBracketIncluded`).
- **Board memory**: `memory.officialMaxSpeedMtps` is the highest speed the spec page lists without
  "(OC)", or `null` with a note when it lists overclocked speeds only.
- **Lane sharing `[]`**: the manual documents no sharing: no page has a shared-bandwidth statement, and
  the maker states sharing that way on its boards that have it. The note says what was searched.
- **Air cooler `singleFanRamClearanceMm`**: a dual-fan cooler's RAM clearance with one fan, when the
  maker publishes it (the AK620: "59mm in single fan configurations").
- **Storage `cache`**: `dram`, `hmb` (DRAM-less, uses host memory), `dram-less` (host memory use not
  stated), or `null` with a note when the maker says nothing.
- **Case fan `noise`**: `{ value, unit }` with unit `dBA` or `sone`, as the maker publishes it. Never
  converted between units.
- **RAM `timings`**: `cl` is required; `trcd`, `trp` and `tras` are `null` when the maker lists CL only.

## Prices (Owner's rule 1)

One file per market, with its batches:

```json
{
  "schemaVersion": 1, "market": "US", "currency": "USD",
  "batches": [{ "id": "2026-09-30-seed", "label": "Seed catalogue (WP-D0)", "windowStart": "2026-09-30", "windowEnd": "2026-10-01" }],
  "priceBasis": "Buy-box price in USD as shown on the live product page ...",
  "observations": [ ... ], "gaps": [ ... ]
}
```

Every observation and gap names its `batch`, and its date falls inside that batch's window. Parts
added later get a batch of their own, so no price is ever dated outside its window.

- **Observation**: `partId`, `batch`, `market`, `currency`, `amount` (exactly as displayed), `retailer`, `url`
  (the live product page), `inStock`, `isMarketplace` (a third-party seller, not the retailer itself),
  `seller`, `retrievedAt`, `capture`, `captureSha256`, optional `notes`.
- **Live pages only.** The page is fetched during the batch; `retrievedAt` is the UTC date of that
  fetch and must fall inside the batch window. No `sources`, no `archiveUrl`, no aggregators.
- **Never convert currencies.** SA is SAR, US is USD. A price missing in one market is not filled in
  from another.
- **Capture**: the saved page is `artifacts/prices/<SA|US>/<partId>--<retailer>--<retrievedAt>.<html|png>`
  (we save both; the record names the `.html`), and `captureSha256` is the SHA-256 of that file.
  A later attempt on the same day gets its own name, `...--<retrievedAt>--2`, `--3` and so on, so no
  capture is ever overwritten, including the ones rejected in review. Never rename or move a capture a
  record cites. `artifacts/` is git-ignored: captures are audit evidence kept in the worktree, never
  committed.
- **Runners**: `python3 data/tools/prices_run.py <US|SA> [partId ...]` (Amazon) and
  `python3 data/tools/prices_newegg.py partId ...` (Newegg US) search, pick the exact listing and
  capture it with headless Chromium, one request at a time. Every capture name comes from
  `data/tools/capture-name.mjs`. They need Python 3, Node, `npm ci` and
  `npx playwright install chromium`. They append what they did to `artifacts/prices/results-*.jsonl`,
  and every pick is reviewed against its capture before it becomes a record.
- **Delivery location**: Amazon prices follow the delivery location. From Hazem's PC in Saudi Arabia,
  amazon.com shows SAR prices with delivery to Saudi Arabia (QA, 2026-10-01). Before a US batch, set a
  US delivery location the normal way on the page (its own delivery-location control), never by
  evasion: `node data/tools/pw-price.cjs <amazon.com url> <outBase> amazon --us-zip=75201` opens
  amazon.com, answers Amazon's own "Visiting from KSA?" prompt with "Stay on Amazon.com", sets the ZIP
  with "Deliver to", then loads the page (a product or a search page). Then check that every US capture
  shows USD with US delivery.
- **Gap**: every purchasable part without a price gets one gap record per market:
  `{ partId, market, reasonCode, reason, retailersTried, checkedAt }`. `reasonCode` is `not-listed`,
  `blocked` (a bot challenge, which we never work around), `no-price-shown` or `unavailable`. The UI
  shows "no price found as of `checkedAt`".
- **Coverage**: each purchasable part has at least one observation or exactly one gap per market, never
  both (rule `price-coverage`).
- **How we pick the listing**: the exact part (part number, colour, capacity, pack size), sold new. A
  different colour, revision or pack is rejected and becomes a gap with the reason. Regional variants
  of the same unit (a UK-plug PSU, an international CPU box) are accepted with a note.
- **Reseller brands**: a listing filed under a brand other than the maker's (a reseller's own label,
  such as "Mavark" on an Intel CPU) counts only if it names the maker's part number as the maker
  publishes it. For a CPU that is the boxed ordering code on the maker's site (`BX80768285K`). Without
  it, the listing is rejected, and the part gets a gap if no other listing qualifies. Say in a note
  which brand the listing is filed under and where the part number comes from. The maker's own brands
  count as the maker (WD_BLACK and WD Blue are Sandisk's, T-FORCE is TeamGroup's).

## Compatibility fixtures

`data/compat-fixtures.json` holds real catalogue builds for every compatibility rule's tests (WP-D1):
for each of the 20 rules (`COMPAT_RULE_IDS`) and each outcome (`ok`, `warn`, `block`, `cant-verify`),
a fixture or a gap, never both.

- A **fixture** names its build (`parts` by category; `"gpu-card": null` is a build with no graphics
  card), the outcome, a one-sentence `reason` with numbers and units, and the `facts` it rests on:
  `{ part, path, value }`. The validator checks that each fact's part is in the build, that the value is
  the catalogue's (so a fixture can't drift from the data), and that a maker source backs it (a null
  needs the record's note). Fixture IDs start with the rule ID.
- A **gap** says why an outcome has no fixture: `not-applicable` (the rule can't give it),
  `no-real-product` (none found after 2 tries) or `pending` (a later batch). The Director rules on each.
- A part a rule needs is added the usual way, then its fixture. Never an invented product.

## Benchmarks

**Game rows** (`data/benchmarks/game.json`) are anchors for the performance model, not predictions:

- `limiter`: `gpu` (GPU-bound conditions, usually 1440p or 4K) or `cpu` (CPU-bound, usually 1080p with
  a top GPU).
- Full test conditions are required: `testSystem` (CPU, GPU and exact card, RAM, board, OS, driver),
  `gameVersion`, `scene`, `resolution`, `preset`, `rayTracing`, `upscaling` (`native` or the method,
  mode and version) and `frameGeneration`, which is always `off`. Frame-generation results never enter
  the file.
- `avgFps`, `onePercentLowFps` (or `null` with a note), and `publishedAt`, the review's own date.
- **Conflicts**: two rows from different publishers that measure the same thing (same limiter,
  subject, game, resolution, preset, ray tracing and upscaling) and differ by more than 10% must list
  each other in `conflictsWith`. Both rows are kept.

**Creator rows** (`data/benchmarks/creator.json`): `app` (`cinebench-2024` or `blender`), `appVersion`,
`test`, `device`, `backend`, `subject` (a catalogue CPU or chip), `score` and `unit`. A row is either
one review's test system or a database `aggregate` (a median with its sample size), never both.

## Games list

`data/games.json` holds 15 titles as of `listDate`, the `method` used to pick them, and the titles
considered and dropped. Each game has `playerCounts` with a `metric`, `value`, `asOf` date, `period`
and `scope` (Steam only, PC, or all platforms). `franchiseSlot` marks the current Call of Duty and EA
SPORTS FC titles; each slot appears exactly once.

## Adding a part

1. Find the part on the maker's own site: the spec page, manual, support list or datasheet. It must be
   real and currently or recently sold. Save what you read under `artifacts/specs/<category>/`.
2. Add the publisher to `data/publishers.json` if it is new (kind `manufacturer`, its domains).
3. Add the record to `data/parts/<category>.json`. Give every value a source (use `fields`), and every
   `null` a note unless the table above says it means none. Copy numbers exactly; do not round.
4. For a motherboard, add a BIOS row for every catalogue CPU on its socket. For a CPU, add a row for it
   to every board on its socket.
5. Price it in both markets from live retailer product pages, with captures, or add a gap record per
   market.
6. Run `npx vitest run src/data` and fix every error. Then `npm run verify`.

## Review

Every batch gets a seeded random audit of 20% of its records against the saved captures before it goes
to the Director. A batch is rejected for a number with no source, a spec that disagrees with the maker,
a benchmark without its test conditions, or a price outside its batch window without a flag.

- Draw the sample with `data/tools/audit_sample.py`: ceil(20%) of every batch, from one seeded
  generator. Save it under `artifacts/audit/`.
- Read every sampled item against its capture and keep a log of each check under `artifacts/audit/`.
- When a page gives conditional values (variant or configuration), record this SKU's value and the
  condition.
- Fix every finding. A finding in the sample means a re-check of the whole batch for the same fault.
- Record the audit in `data/audits.json`: per batch, the sample, what it was read against, the findings
  with the commit that fixed each, and any follow-up outside the sample. A later check of the batch
  (the Director's review, or a sweep it leads to) goes in `reviews`: who, when, the scope, and its
  findings with their fix commits. `src/data/audits.test.ts` checks it.
