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
| `data/audits.json` | The data lead's seeded audits: the sample per batch, what each item was read against, findings and fixes (see "Review"). Not catalogue data. |
| `data/tools/` | Data scripts: the audit sampler (`audit_sample.py`). |
| `src/data/schema/` | Strict Zod schemas, one per file type. `files.ts` holds `DATA_PATHS`, the single source of truth for the layout. |
| `src/data/validate/` | The validator. `issues.ts` lists every rule ID (`RULES`). |
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
| gpu-card | `ocModeBoostClockMhz`, `powerConnectors.*.standard` on 8-pin and 6-pin plugs |
| psu | `connectors.pcie16pinStandard` when there is no 16-pin cable |
| cooler | `nsprRating` (except Noctua, which publishes it) |
| case | `gpuClearance.*.condition` and `coolerClearance.*.condition` (the unconditional limit), `includedFans.*.model`, `gpuMaxHeightMm` (no published height limit) |

### Fields worth knowing

- **Motherboard BIOS**: `biosSupport.families` has one row per CPU family on the socket, with the
  earliest BIOS that supports it; `biosSupport.cpus` has one row per catalogue CPU as the support list
  shows it (`all`, `since` a version, or `not-listed`), with the cell text verbatim.
- **Lane sharing**: `laneSharing` rules say "when slot X holds a device (any, NVMe or SATA), these slots
  are disabled or reduced to N lanes", with the manual page and the manual's words. Slot IDs are local
  to the board (`m2-1`, `pcie-1`, `sata-5`).
- **Case clearance**: `gpuClearance` and `coolerClearance` have one row per condition the maker
  publishes; `condition: null` is the default limit (for example the Fractal North: 355 mm, or 300 mm
  "with a 360 mm front radiator").
- **Case `layoutPositions`**: only for cases with a movable motherboard plate (the Fractal Terra's
  spine). Each position gives a cooler height limit and a GPU thickness limit, plus an optional tighter
  thickness limit for tall GPUs (`tallGpuLimit`). A build fits when one position fits both parts. When
  present it supersedes the single cooler and GPU-thickness limits.
- **GPU power**: `powerConnectors[].type` is `16-pin`, `8-pin` or `6-pin`. For 16-pin, `standard` is
  `12V-2x6` or `12VHPWR` only when the maker names it; otherwise `null` with a note.
- **Storage `cache`**: `dram`, `hmb` (DRAM-less, uses host memory), `dram-less` (host memory use not
  stated), or `null` with a note when the maker says nothing.
- **Case fan `noise`**: `{ value, unit }` with unit `dBA` or `sone`, as the maker publishes it. Never
  converted between units.
- **RAM `timings`**: `cl` is required; `trcd`, `trp` and `tras` are `null` when the maker lists CL only.

## Prices (Owner's rule 1)

One file per market, one batch per file:

```json
{
  "schemaVersion": 1, "market": "US", "currency": "USD",
  "batch": { "id": "2026-09-30-seed", "windowStart": "2026-09-30", "windowEnd": "2026-10-01" },
  "priceBasis": "Buy-box price in USD as shown on the live product page ...",
  "observations": [ ... ], "gaps": [ ... ]
}
```

- **Observation**: `partId`, `market`, `currency`, `amount` (exactly as displayed), `retailer`, `url`
  (the live product page), `inStock`, `isMarketplace` (a third-party seller, not the retailer itself),
  `seller`, `retrievedAt`, `capture`, `captureSha256`, optional `notes`.
- **Live pages only.** The page is fetched during the batch; `retrievedAt` is the UTC date of that
  fetch and must fall inside the batch window. No `sources`, no `archiveUrl`, no aggregators.
- **Never convert currencies.** SA is SAR, US is USD. A price missing in one market is not filled in
  from another.
- **Capture**: the saved page is `artifacts/prices/<SA|US>/<partId>--<retailer>--<retrievedAt>.<html|png>`
  (we save both; the record names the `.html`), and `captureSha256` is the SHA-256 of that file.
  `artifacts/` is git-ignored: captures are audit evidence kept in the worktree, never committed.
- **Gap**: every purchasable part without a price gets one gap record per market:
  `{ partId, market, reasonCode, reason, retailersTried, checkedAt }`. `reasonCode` is `not-listed`,
  `blocked` (a bot challenge, which we never work around), `no-price-shown` or `unavailable`. The UI
  shows "no price found as of `checkedAt`".
- **Coverage**: each purchasable part has at least one observation or exactly one gap per market, never
  both (rule `price-coverage`).
- **How we pick the listing**: the exact part (part number, colour, capacity, pack size), sold new. A
  different colour, revision or pack is rejected and becomes a gap with the reason. Regional variants
  of the same unit (a UK-plug PSU, an international CPU box) are accepted with a note.

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
- Fix every finding. A finding in the sample means a re-check of the whole batch for the same fault.
- Record the audit in `data/audits.json`: per batch, the sample, what it was read against, the findings
  with the commit that fixed each, and any follow-up outside the sample. `src/data/audits.test.ts`
  checks it.
