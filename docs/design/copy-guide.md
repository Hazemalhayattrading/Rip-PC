# Copy guide: reasons, verdicts and estimates (WP-DS2)

Owner: design-lead · Date: 2026-10-02 · Updated 2026-10-03 (the card maker's power supply
figure: sections 2, 7.14 and 9; how names are tested and reviewed: section 4) · Status: ready for
build-lead (WP-E0, WP-E1) · Spec:
[phase-1-plan.md](../reports/phase-1-plan.md) §2 WP-DS2 and §6

This guide sets the wording of every string the engine produces: compatibility reasons, the power
estimate, performance estimates and bottleneck verdicts. The Engine lab shows them first
([lab-spec.md](lab-spec.md)). The Phase 2 builder and the Phase 4 Buy Sheet show the same
strings, so the engine writes each one once.

**Examples are real.** They use catalogue parts and values at the integration tip `c621c15`. Where
a rule needs WP-D1 or WP-E2 data that is not in the catalogue yet, the example says so, and its
numbers in square brackets are placeholders, not data. Section 9's maker's-figure examples use
WP-D1 batch 1's values (`feat/data-engine-data`, from `910ff10`), which are not merged yet.

---

## 1. What an engine message holds

The UI needs these parts of every compatibility result. build-lead's result types
(`src/engine/types.ts`, `15f9b5c` on `feat/build-engine-foundations`) decide the shape; the field
column names them. Design-lead's review of the types (brief step 3) asks for the two marked
"proposed".

| Part | Field | What it is | When |
|---|---|---|---|
| Status | `status`, `cantVerify` | ok, warn or block, and whether a warn means "can't verify" (missing data) | Always |
| Reason | `reason` | One sentence: what is true, with its numbers and units | Always, ok included |
| Action | `action` (proposed; `advice` today) | One sentence: what the buyer should do | Only for warn, block and can't verify, and only when there is something to do beyond picking another part (section 2, rule 9) |
| Steps | `steps` (proposed; inside `advice` today) | A maker's procedure, condensed: its title, its ordered items, and its own sources | Only for a procedure: today, BIOS FlashBack (section 8) |
| Layout | `layoutId`, and that layout's `description` | Which case layout the check assumed: radiator position, drive trays, the Terra's spine | Only for rules that check a case layout (plan WP-E1) |
| Evidence | `evidence` | Every spec value the rule used: which part, which spec, the value and unit, its note and its sources | Always. Never written into the sentence |
| Parts | `parts` | The parts the result is about. The UI finds their display names (section 4) in the sentence and marks them `translate="no"` (backlog item 20) | Always |

A rule that didn't run is a `RuleNotRun`: "Not checked" when a part it needs isn't picked, "Doesn't
apply" when the build has nothing for it to check (section 6).

## 2. Ten rules

1. **One sentence per field.** Aim for 30 words or fewer, counting each part name as one word.
   Join a fact and its consequence with "so", and a conflict with "but". Never two sentences in a
   reason.
2. **Fact, then comparison.** Name the part and its number, then what it is checked against:
   "The {card} is 320 mm long, but the {case} takes cards up to 300 mm with a 360 mm front
   radiator." Use "and" when the check passes, "but" when it doesn't.
3. **Both numbers, with units,** whenever a rule compares numbers. Never "too long" or "not
   enough" on its own.
4. **Part names exactly as the catalogue writes them** (section 4). Never a made-up short name.
5. **Plain English** that a first-time buyer understands (section 5). A technical term the buyer
   must know, such as XMP, is explained once in the same sentence.
6. **No sources in the sentence.** Never "according to ASUS". Sources are in the evidence, beside
   the sentence, and so is a manual's own wording (`m2-lanes` quotes it there). Two exceptions
   name the maker: "{maker} doesn't publish …" (rule 7), and the card maker's power supply figure
   (section 9), which is the maker's own requirement, recommendation or minimum.
7. **Never guess.** Missing data is "Can't verify", with the reason
   "{maker} doesn't publish {what} for the {part}." The engine never fills a gap with a typical
   value.
8. **Present tense, active voice, neutral tone.** No "unfortunately", "simply", "just", "please",
   "we", exclamation marks or emoji. Don't blame the buyer's choice.
9. **Actions are rare and concrete.** Add one when the buyer can do something other than pick a
   different part (ask the retailer, turn on XMP, use another M.2 slot), or when the right part is
   hard to find (a power supply of at least 850 W). Start with a verb.
10. **Never point by colour, shape or position** ("the red icon", "below"). Sentence case, and a
    full stop at the end of every sentence.

## 3. Numbers and units

The rules of [direction.md §1.1](direction.md#11-numbers-are-the-product) and
[tokens.md §2.4](tokens.md#24-type), made exact for the engine's formatter:

| Rule | Write | Never |
|---|---|---|
| A no-break space (U+00A0) between a number and its unit | 320 mm, 650 W, 5.2 GHz, 16 GB, 20 Gbps | 320mm, 320 millimetres |
| Thousands separators from `Intl.NumberFormat('en-US')` | 6,400 MT/s, 1,000 W, SAR 9,412 | 6400 MT/s, 6.400 |
| **Identifiers are not numbers:** BIOS versions, model numbers, years, rule ids | BIOS 1205, BIOS 0245, RTX 5090, DDR5-6000 | BIOS 1,205, BIOS 245 |
| Ranges: an en dash (U+2013), no spaces, the unit once, never broken across lines | 96–108 fps, 750–850 W | 96 - 108 fps, 96 fps–108 fps |
| Decimals as the source publishes them; no padding zeros | 46.1 mm, 2.5 slots, 3.125 slots | 46.10 mm |
| Computed values keep the precision of their inputs | whole mm, whole W, whole fps | 612.37 W |
| Percentages: whole numbers, no space, "about" for model-derived values | about 28% | ~28 %, 28.4% |
| Under 1% | less than 1% | 0%, about 0% |
| In a sentence, counts of things from one to nine are words; 10 and up are digits | two 8-pin cables, four modules, three M.2 drives, 12 fans | 2 8-pin cables |
| In labels, tables and summary lines, counts are digits | 16 of 20 pass, 2 warnings, Fans (3) | sixteen of twenty pass |
| Resolutions by name | 1080p, 1440p, 4K | 2560x1440 |
| Money: the ISO code first, as observed, never converted. `Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code' })`, with 0 fraction digits for a whole amount and 2 otherwise (its default is always 2: "SAR 9,412.00"). It puts a no-break space after the code | SAR 1,899, USD 479.90 | 1,899 SAR, $479.90, SAR 9,412.00 |
| Durations: one unit per range. Under 2 min in seconds, then minutes, then hours, one decimal | 85–96 s, 3.2–3.7 min | 3:10–3:40 |

- **Measurements are always digits**, even when small: 5 Gbps, 2.5 slots. Counts in words are for
  counted things inside a sentence only.
- **Units:** mm, W, GHz, MHz, MT/s, GB, TB, Gbps, fps, tokens/s, points, s, min, h, %. Spell them
  this way; never in capitals ("MM") or with a full stop.
- **Lists in a sentence:** "A and B", "A, B and C", with no serial comma. Build them with
  `new Intl.ListFormat('en-GB', { type: 'conjunction' })`: the en-US format adds the serial comma.
- **At a numeric limit,** the reason says what happens exactly there (test plan §9.1): "The {card}
  is 355 mm long, exactly the 355 mm the {case} takes, so it fits with no room to spare." Whether
  that passes or warns is the rule's call; the wording says it either way.
- **A clearance's condition is built from its fields,** never copied from the maker's words.
  data-lead structures each condition (`LayoutCondition` in `src/data/schema/case.ts`) and keeps
  the maker's own words in `asPublished`, verbatim, for audit. The engine writes the phrase; it
  goes after the limit, with a space: "takes cards up to 300 mm with a 360 mm front radiator".

  | `kind` | Phrase | Examples |
  |---|---|---|
  | `radiator` | "with a {sizes} mm {position} radiator". Several sizes join with "or", and the unit appears once. Positions are the words front, top, rear, side and bottom | "with a 360 mm front radiator" (the North); "with a 120 mm side radiator" (the Terra); "with a 280 or 360 mm front radiator" |
  | `drive-trays` | "with {count} HDD tray(s)": the count in words up to nine, "tray" for one, "trays" for more | "with one HDD tray", "with two HDD trays" (the North) |

  - Every radiator size (120 to 420 mm) takes "a": "a 120 mm", never "an".
  - A new `kind` needs its phrase here before a rule may show it. Until then, the rule shows the
    limit with no condition phrase, and the evidence carries `asPublished`.
- **The evidence shows both:** the value cell holds the limit and the phrase ("300 mm with a 360 mm
  front radiator"), and under it, in quotes, the maker's own words: “up to 300 mm with a 360 mm
  front radiator” (lab-spec.md §5).

## 4. Part names

**The display name is the catalogue's `brand` and `name`:** the brand, a space and the name,
unless the name already starts with the brand (ignoring case). The maker's own capitals and
punctuation stay exactly as the catalogue has them.

| Category | Catalogue `brand` and `name` | Display name |
|---|---|---|
| CPU | AMD, "AMD Ryzen 7 9800X3D" | AMD Ryzen 7 9800X3D |
| CPU | Intel, "Intel Core i5 processor 14600K" | Intel Core i5 processor 14600K |
| Motherboard | ASUS, "TUF GAMING Z890-PLUS WIFI" | ASUS TUF GAMING Z890-PLUS WIFI |
| Graphics card | SAPPHIRE, "SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB" | SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB |
| Graphics card | NVIDIA, "GeForce RTX 5090 Founders Edition" | NVIDIA GeForce RTX 5090 Founders Edition |
| Case | Fractal Design, "North Charcoal Black TG Light" | Fractal Design North Charcoal Black TG Light |
| Memory | T-FORCE, "Delta RGB DDR5-6000 CL30 32GB (2x16GB) Black" | T-FORCE Delta RGB DDR5-6000 CL30 32GB (2x16GB) Black |
| Cooler | DeepCool, "AK620" | DeepCool AK620 |
| Storage | WD_BLACK, "WD_BLACK SN8100 NVMe SSD 2TB (without heatsink)" | WD_BLACK SN8100 NVMe SSD 2TB (without heatsink) |
| GPU chip, for estimates | NVIDIA, "GeForce RTX 5060" | NVIDIA GeForce RTX 5060 |

- **First mention: the full display name.** A second mention in the same sentence uses a role
  word: "the board", "the card", "the case", "the kit", "it".
- **Never shorten, title-case or drop words**, the colour variant included. A buyer matches the
  name against a retailer's listing.
- **"The" before a part name** ("the DeepCool AK620"). "A" or "an" by sound before a socket or a
  standard: "an AM5 board", "an LGA1851 board", "an ATX power supply".
- **One display-name function,** `displayName` in `src/engine/names.ts`. The engine and the UI
  both use it, so the UI finds each name inside a sentence (section 1, "Parts").
- **A name starts with the whole brand, or leaves the brand out:** "WD_BLACK SN8100 …" under
  WD_BLACK, "Delta RGB …" under T-FORCE. Never with part of it: brand "Kingston FURY" with the
  name "FURY Beast …" displays as "Kingston FURY FURY Beast …".
- **Its test is structural.** Where the brand goes in front of the name, the brand's last word
  must not repeat as the name's first word (ignoring case), which catches that doubled word for
  any part. No test lists every name, because each data batch would need build-lead's test
  edited (the Director's ruling of 2026-10-03).
- **design-lead reviews every name in one place:** `npm run engine:dump` writes every catalogue
  part's display name to `artifacts/engine/display-names.json`. design-lead reads that file at
  each data or engine hand-off, and sends a fix to its owner: a record to data-lead, the function
  to build-lead.

## 5. Words

| Say | Not | Note |
|---|---|---|
| graphics card, the card | GPU in a sentence, VGA | "GPU" is fine in a label such as "Graphics card (GPU)" |
| GPU chip | die, SKU | Only where the estimate is per chip |
| memory, memory kit, module | RAM in a sentence, DIMM, stick | |
| power supply | PSU in a sentence | |
| motherboard, the board | mobo, mainboard | |
| CPU | processor | Unless the part's own name says "processor" |
| CPU cooler, cooler | heatsink | "Heatsink" only for an SSD heatsink |
| BIOS | UEFI, firmware | |
| the board's own feature name, from `biosFlashback.name` | Flashback, BIOS flashback | ASUS writes "BIOS FlashBack" |
| CPU support list | QVL, compatibility list, validated | |
| short power spikes | transients, transient excursions | |
| power draw, load | TBP, TGP, PPT, PL2, in a sentence | The power table may add the maker's term in brackets: "Card power (TBP)" |
| the kit's XMP profile, the kit's EXPO profile | XMP on its own, the first time | Explained once in the action: "…, an overclock that Intel doesn't guarantee" |
| turns off, runs at x8 | disabled, suspended, bifurcated | The manual's own wording goes in the evidence quote |
| doesn't publish | N/A, unknown, TBD | |
| Incompatible | Not compatible, Error, Fail, Blocked | |
| front USB-C port, USB-C header | Type-C, USB-C front panel connector | |
| drive, M.2 drive | disk, SSD stick | |

**Spelling:** US English in the product: "color", "gray", "license". Product names keep their own
spelling.

**Control names.** A toggle button keeps one name, the state it turns on, and says whether that
state is on with `aria-pressed`, never by renaming itself: "Light theme" (tokens.md §1.3). Every
other button names its action, starting with a verb.

| Control | Name | Where it's specified |
|---|---|---|
| The 3D tools row (toggles) | "Exploded view", "Open side panel", "Interior light", "Spin fans" | studio-3d-brief.md §3.1; motion.md, Studio rules §6 (the fans) |
| The 3D tools row (buttons) | "Orbit" (opens the orbit pad), "Reset view" | studio-3d-brief.md §3.1 |
| The orbit pad | "Turn left", "Turn right", "Tilt up", "Tilt down", "Zoom in", "Zoom out" | studio-3d-brief.md §3.1 (backlog item 24) |
| The theme | "Light theme" | tokens.md §1.3 |
| The lab's picker | "Add a drive", "Remove drive {n}" | lab-spec.md §2 |
| The lab's load error | "Reload" | lab-spec.md §7 |
| The Specs view | the "View" group with "List" and "Specs"; "Clear filters" | specs-view.md (backlog items 14, 16) |

- **"Spin fans"** shows only when the build has a fan. It is never stored, and it doesn't appear
  under reduced motion, when the fans never spin (motion.md, Studio rules §6).
- An icon-only button carries its name as visually hidden text, never as `aria-label` on a span
  (backlog item 43).

## 6. Status words, rule names and the summary

| Engine status | Word | Icon (18 px grid, [lab-spec.md §3](lab-spec.md#3-the-status-chip)) | Colour |
|---|---|---|---|
| ok | **Passes** | Circle with a check | `--ok` |
| warn | **Warning** | Triangle with an exclamation mark | `--warn` |
| warn, missing data | **Can't verify** | Diamond with a question mark | `--warn` |
| block | **Incompatible** | Circle with a slash | `--block` |
| not run: a part to check isn't picked (`needs-parts`) | **Not checked** | Empty circle | `--ink-3` |
| not run: nothing in the build to check (`not-applicable`) | **Doesn't apply** | Circle with a dash | `--ink-3` |

- "Passes" is for one check. Phase 2's part rows keep Studio's words for a whole part: "Fits your
  build", "Fits, with a warning" and "Incompatible" ([direction.md §4](direction.md#key-components-2)).
- **Not checked** says what to pick: "Pick {the missing parts} to check {what}." For example: "Pick
  a case to check the card's length." "Pick a CPU and a motherboard to check the socket." (The
  pattern is build-lead's, from the result types.)
- **Doesn't apply** says why: "The DeepCool AN400 is an air cooler, so it has no radiator."
- Neither is an engine status, and neither counts as a pass. A rule never uses "doesn't apply"
  to hide a case it can't judge: that is "Can't verify".

**Rule names,** shown with the rule id (plan §3 order):

| # | Rule id | Name | # | Rule id | Name |
|---|---|---|---|---|---|
| 1 | `cpu-socket` | CPU socket | 11 | `radiator-fit` | Radiator fit |
| 2 | `cpu-chipset` | CPU support list | 12 | `psu-form-factor` | Power supply form factor |
| 3 | `bios-version` | BIOS version | 13 | `psu-length` | Power supply length |
| 4 | `ram-type` | Memory type | 14 | `psu-wattage` | Power supply wattage |
| 5 | `ram-slots` | Memory slots | 15 | `gpu-power-connector` | Graphics card power cables |
| 6 | `ram-speed` | Memory speed | 16 | `m2-lanes` | M.2 slots and shared lanes |
| 7 | `gpu-length` | Graphics card length | 17 | `board-form-factor` | Motherboard form factor |
| 8 | `gpu-thickness` | Graphics card thickness | 18 | `usb-c-header` | Front USB-C port |
| 9 | `cooler-height` | Cooler height | 19 | `cooler-socket` | Cooler mounting |
| 10 | `ram-cooler-clearance` | Memory under the cooler | 20 | `display-output` | Display output |

QA's test plan v4 sets the final rule ids (plan WP-Q3). If an id changes, its name here stays.

**The summary line** counts the rules that ran: "{passes} of {checked} pass, {n} incompatible,
{n} can't verify, {n} warning(s)." Leave out a count that is zero. Then, if any rule waits for a
part: "{n} not checked yet." Rules that don't apply are not counted.
- "16 of 20 pass, 1 incompatible, 1 can't verify, 2 warnings."
- "18 of 18 pass." (Two rules don't apply.)
- "9 of 10 pass, 1 warning. 10 not checked yet."

## 7. The rules: patterns and examples

`{cpu}`, `{board}`, `{ram}`, `{card}`, `{case}`, `{cooler}` and `{psu}` are display names.
`{maker}` is the publisher name of that part's brand (`data/publishers.json`). Other slots are
values, formatted by section 3. `{condition}` is the clearance's own condition text, added after
a space when it is not null. "Can't verify" rows show only the case where data is missing.

### 1. `cpu-socket` — CPU socket

| Outcome | Reason |
|---|---|
| Passes | The {cpu} and the {board} both use {socket}. |
| Incompatible | The {cpu} needs an {cpuSocket} board, but the {board} has an {boardSocket} socket. |

- Passes: "The AMD Ryzen 7 9800X3D and the ASUS TUF GAMING B650-PLUS WIFI both use AM5."
- Incompatible: "The AMD Ryzen 7 9800X3D needs an AM5 board, but the ASUS TUF GAMING Z890-PLUS
  WIFI has an LGA1851 socket."

### 2. `cpu-chipset` — CPU support list

| Outcome | Reason |
|---|---|
| Passes | The CPU support list for the {board} includes the {cpu}. |
| Warning | The {cpu} isn't on the CPU support list for the {board}, so {maker} doesn't promise it works. |
| Incompatible | The {chipset} chipset of the {board} doesn't support the {cpu}. (Only with a source that says so.) |
| Can't verify | {maker} doesn't publish a CPU support list for the {board}. |

- Passes: "The CPU support list for the ASUS PRIME B760M-A WIFI D4 includes the Intel Core
  i5-12400F Processor."
- Warning and Incompatible: no real case in the catalogue yet (needs D1).

### 3. `bios-version` — BIOS version

Section 8 has the full wording, Hazem's requirement included.

### 4. `ram-type` — Memory type

| Outcome | Reason |
|---|---|
| Passes | The {ram} and the {board} are both {type}. |
| Incompatible | The {ram} is {ramType}, but the {board} takes only {boardType} memory. |

- Passes: "The G.SKILL Flare X5 DDR5-6000 CL30 32GB (2x16GB) and the ASUS TUF GAMING B650-PLUS
  WIFI are both DDR5."
- Incompatible: "The G.SKILL Trident Z Neo DDR4-3600 CL16 32GB (2x16GB) is DDR4, but the ASUS TUF
  GAMING B650-PLUS WIFI takes only DDR5 memory."

### 5. `ram-slots` — Memory slots

| Outcome | Reason |
|---|---|
| Passes | The {ram} has {modules} modules, and the {board} has {slots} memory slots. |
| Incompatible | The {ram} has {modules} modules, but the {board} has only {slots} memory slots. |

- Passes: "The G.SKILL Flare X5 DDR5-6000 CL30 32GB (2x16GB) has two modules, and the ASUS ROG
  STRIX B650E-I GAMING WIFI has two memory slots."
- Incompatible: "The {4-module kit from D1} has four modules, but the ASUS ROG STRIX B650E-I
  GAMING WIFI has only two memory slots."

### 6. `ram-speed` — Memory speed

| Outcome | Reason | Action |
|---|---|---|
| Passes | The {ram} runs at {kitSpeed}, within the {cpuSpeed} that the {cpu} supports. | — |
| Warning: above the CPU's official speed | The {ram} is rated at {kitSpeed}, above the {cpuSpeed} that the {cpu} officially supports. | Turn on the kit's {XMP or EXPO} profile in the BIOS to run it at {kitSpeed}, an overclock that {cpuMaker} doesn't guarantee. |
| Warning: above the board's maximum | The {ram} is rated at {kitSpeed}, above the {boardMax} maximum of the {board}, so it runs slower than rated. | — |
| Warning: four modules | With four modules, the {cpu} officially supports up to {speedFour}, below the {kitSpeed} the {ram} is rated at. | — |

- Passes: "The T-FORCE Vulcan Z DDR4-3200 CL16 32GB (2x16GB) Gray runs at 3,200 MT/s, within the
  3,200 MT/s that the Intel Core i5-12400F Processor supports."
- Warning: "The G.SKILL Trident Z5 CK DDR5-8200 CL40 48GB (2x24GB) CU-DIMM is rated at 8,200
  MT/s, above the 6,400 MT/s that the Intel Core Ultra 9 Processor 285K officially supports."
  Action: "Turn on the kit's XMP profile in the BIOS to run it at 8,200 MT/s, an overclock that
  Intel doesn't guarantee."
- **The profile follows the kit's `profiles`:** EXPO on an AMD build when the kit has it,
  otherwise XMP. A DDR5-6000 kit with the Ryzen 7 9800X3D (5,600 MT/s official) warns and names
  EXPO. That warning is correct and common, so its wording stays calm.

### 7. `gpu-length` — Graphics card length

| Outcome | Reason |
|---|---|
| Passes | The {card} is {cardLength} long, and the {case} takes cards up to {caseMax}{condition}. |
| Incompatible | The {card} is {cardLength} long, but the {case} takes cards up to {caseMax}{condition}. |
| Can't verify | {maker} doesn't publish the graphics card length limit of the {case}{condition}. |

- Passes: "The SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB is 320 mm long, and the Fractal Design
  North Charcoal Black TG Light takes cards up to 355 mm."
- Incompatible, with the ARCTIC Liquid Freezer III Pro 360 at the front: "The SAPPHIRE PULSE AMD
  Radeon RX 9070 XT 16GB is 320 mm long, but the Fractal Design North Charcoal Black TG Light
  takes cards up to 300 mm with a 360 mm front radiator." Layout: "Layout checked: a 360 mm
  radiator at the front."

### 8. `gpu-thickness` — Graphics card thickness

| Outcome | Reason |
|---|---|
| Passes | The {card} is {cardThickness} thick, and the {case} takes cards up to {caseMax}{condition}. |
| Incompatible | The {card} is {cardThickness} thick, but the {case} takes cards up to {caseMax}{condition}. |
| Warning: covers a slot | The {card} is {slots} slots thick, so it covers the {slotName} slot of the {board}. (Needs D1's slot positions.) |
| Passes, the Terra | The {card} and the {cooler} both fit with the spine of the {case} at position {positions}. (Needs the Terra's spine model.) |

- Passes: "The ASUS TUF Gaming GeForce RTX 5070 Ti 16GB GDDR7 OC Edition is 62.5 mm thick, and the
  Fractal Design Terra Graphite takes cards up to 72 mm." The engine's spine model may narrow
  this; the wording stays.
- Lists of positions: "position 3, 4 or 5".

### 9. `cooler-height` — Cooler height

| Outcome | Reason |
|---|---|
| Passes | The {cooler} is {coolerHeight} tall, and the {case} takes coolers up to {caseMax}{condition}. |
| Doesn't apply: a liquid cooler | The {cooler} is a liquid cooler, so the case's cooler height limit doesn't apply. |
| Incompatible | The {cooler} is {coolerHeight} tall, but the {case} takes coolers up to {caseMax}{condition}. |
| Can't verify | {maker} doesn't publish the height of the {cooler}. |

- Passes: "The DeepCool AK620 is 160 mm tall, and the Fractal Design North Charcoal Black TG
  Light takes coolers up to 170 mm."
- Incompatible: "The DeepCool AK620 is 160 mm tall, but the Fractal Design Terra Graphite takes
  coolers up to 48 mm."

### 10. `ram-cooler-clearance` — Memory under the cooler

| Outcome | Reason | Action |
|---|---|---|
| Passes | The {ram} is {ramHeight} tall, and the {cooler} leaves {clearance} for memory. | — |
| Doesn't apply: a liquid cooler | The {cooler} is a liquid cooler, so nothing overhangs the memory. | — |
| Incompatible | The {ram} is {ramHeight} tall, but the {cooler} leaves only {clearance} for memory. | — |
| Warning: the fan can move up | The {ram} is {ramHeight} tall, so the front fan of the {cooler} must sit higher, which makes the cooler {raisedHeight} tall. (Needs D1.) | — |
| Can't verify | {maker} doesn't publish how much room the {cooler} leaves for memory. | Ask {maker} or the retailer whether memory {ramHeight} tall fits under the {cooler}. |

- Incompatible: "The T-FORCE Delta RGB DDR5-6000 CL30 32GB (2x16GB) Black is 46.1 mm tall, but the
  DeepCool AK620 leaves only 43 mm for memory."
- Can't verify: "DeepCool doesn't publish how much room the DeepCool AN400 leaves for memory."
  Action: "Ask DeepCool or the retailer whether memory 46.1 mm tall fits under the DeepCool AN400."

### 11. `radiator-fit` — Radiator fit

| Outcome | Reason |
|---|---|
| Passes | The {case} takes the {radiatorSize} radiator of the {cooler} at the {position}. |
| Doesn't apply: an air cooler | The {cooler} is an air cooler, so it has no radiator. |
| Incompatible: size | The {cooler} has a {radiatorSize} radiator, but the {case} takes radiators up to {caseMax}. |
| Incompatible: thickness | With its fans, the radiator of the {cooler} is {thickness} thick, but the {case} takes up to {maxThickness} at the {position}. |
| Can't verify | {maker} doesn't publish the radiator thickness limit at the {position} of the {case}. |

- Incompatible: "The ARCTIC Liquid Freezer III Pro 360 has a 360 mm radiator, but the Fractal
  Design Pop Mini Air RGB Black TG Clear Tint takes radiators up to 240 mm."
- Passes, at a position the case lists: "The Fractal Design North Charcoal Black TG Light takes
  the 360 mm radiator of the ARCTIC Liquid Freezer III Pro 360 at the front." Whether it passes
  depends on the radiator's thickness, which is not in the catalogue yet (needs D1).
- Positions are words: "at the front", "at the top", "at the rear", "on the side".

### 12. `psu-form-factor` — Power supply form factor

| Outcome | Reason |
|---|---|
| Passes | The {psu} is {formFactor}, which the {case} takes. |
| Incompatible | The {psu} is {formFactor}, but the {case} takes only {formFactorList} power supplies. |

- Passes: "The NZXT C850 SFX Gold is SFX, which the Fractal Design Terra Graphite takes."
- Incompatible: "The DeepCool PN850M is ATX, but the Fractal Design Terra Graphite takes only SFX
  and SFX-L power supplies."
- Lists: "A and B", "A, B and C" (no serial comma).

### 13. `psu-length` — Power supply length

| Outcome | Reason |
|---|---|
| Passes | The {psu} is {psuLength} long, and the {case} takes power supplies up to {caseMax}{condition}. |
| Incompatible | The {psu} is {psuLength} long, but the {case} takes power supplies up to {caseMax}{condition}. |

- Incompatible: "The NZXT C1200 Gold ATX 3.1 is 160 mm long, but the Fractal Design Pop Mini Air
  RGB Black TG Clear Tint takes power supplies up to 150 mm."
- The North, by its drive trays: "The NZXT C1200 Gold ATX 3.1 is 160 mm long, and the Fractal
  Design North Charcoal Black TG Light takes power supplies up to 255 mm with one HDD tray." With
  two trays it is Incompatible: "… up to 155 mm with two HDD trays." Layout: "One HDD tray
  fitted." The phrases are built from the structured condition (section 3); the maker's words,
  "1 HDD tray: 255 mm max", stay in the evidence.

### 14. `psu-wattage` — Power supply wattage (needs WP-E2)

| Outcome | Reason | Action |
|---|---|---|
| Passes | This build's estimated worst-case load is {load}, and the {psu} gives {watts}, within the recommended {range}. | — |
| Warning | The {psu} gives {watts}, at the bottom of the recommended {range} for this build. | — |
| Incompatible | The {psu} gives {watts}, below the {range} recommended for this build's estimated {load} worst-case load. | Pick a power supply of {rangeLow} or more. |
| Warning: below the card maker's figure (only a `required` or `minimum` figure) | The {psu} gives {watts}, below {the maker's figure, in section 9's form inside a sentence}. | — |

- Incompatible, the RTX 5090 Founders Edition with the DeepCool PN650M: "The DeepCool PN650M
  gives 650 W, below the [1,000–1,200 W] recommended for this build's estimated [780 W]
  worst-case load." Action: "Pick a power supply of [1,000 W] or more." NVIDIA requires a power
  supply of 1,000 W for this card: its spec page lists "Required System Power (W)" 1000 (section
  9 has the sentence). E2's range must include it, or the hand-off explains why not (plan WP-E2).
- Warning, below the card maker's figure: "The DeepCool PN650M gives 650 W, below the 750 W
  minimum that Sapphire Technology sets for the SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB."
  Whether this case warns, and which outcome wins when the power supply is also below the range,
  is E2's call; this is the wording if it does. A `recommended` figure is not a floor, so it never
  makes this warning: ASUS bases its figure on "a fully overclocked GPU and CPU system
  configuration".
- "Estimated" stays in every sentence that gives a load (CLAUDE.md rule 2).

### 15. `gpu-power-connector` — Graphics card power cables

| Outcome | Reason |
|---|---|
| Passes: 16-pin | The {card} needs one 16-pin cable, and the {psu} has a native 12V-2x6 cable. |
| Passes: 8-pin | The {card} needs {count} 8-pin cables, and the {psu} has {psuCount}. |
| Incompatible | The {card} needs {count} 8-pin cables, but the {psu} has only {psuCount}. |
| Warning: adapter | The {card} needs a 16-pin cable, and the {psu} has no native 12V-2x6 cable, so it needs the adapter that comes with the card. (Needs D1.) |

- Passes: "The NVIDIA GeForce RTX 5090 Founders Edition needs one 16-pin cable, and the DeepCool
  PN650M has a native 12V-2x6 cable."
- Passes: "The SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB needs two 8-pin cables, and the DeepCool
  PN650M has three."

### 16. `m2-lanes` — M.2 slots and shared lanes

| Outcome | Reason | Action |
|---|---|---|
| Passes | The {board} has {slotCount} M.2 slots for the {driveCount} M.2 drives in this build. | — |
| Incompatible | This build has {driveCount} M.2 drives, but the {board} has only {slotCount} M.2 slots. | — |
| Warning: a slot turns something off | On the {board}, a drive in the {slot} slot turns off {what}. | Use the {freeSlot} slot instead to keep {what}. (Only when the engine knows a free slot.) |
| Warning: a slot slows a PCIe slot | On the {board}, a drive in the {slot} slot makes the {pcieSlot} slot run at x{lanes}. | — |

- Warning: "On the ASUS TUF GAMING B550-PLUS WIFI II, a drive in the M.2_2 slot turns off SATA
  ports 5 and 6 (SATA6G_56)." The evidence quotes the manual: page vii, "M.2_2 shares bandwidth
  with SATA6G_56. When M.2_2 is populated, SATA6G_56 will be disabled."
- Warning: "On the ASUS TUF GAMING X870-PLUS WIFI, a drive in the M.2_2 slot makes the
  PCIEX16(G5) slot run at x8."
- Incompatible: "This build has three M.2 drives, but the ASUS ROG STRIX B650E-I GAMING WIFI has
  only two M.2 slots." (Needs a build with three drives: section 13.)
- Slot and port names stay as the manual writes them (`M.2_2`, `PCIEX16(G5)`), marked
  `translate="no"`.

### 17. `board-form-factor` — Motherboard form factor

| Outcome | Reason |
|---|---|
| Passes | The {board} is {formFactor}, which the {case} takes. |
| Incompatible | The {board} is {formFactor}, but the {case} takes only {formFactorList} boards. |

- Passes: "The ASUS ROG STRIX B650E-I GAMING WIFI is Mini-ITX, which the Fractal Design Terra
  Graphite takes."
- Incompatible: "The ASUS TUF GAMING B650-PLUS WIFI is ATX, but the Fractal Design Pop Mini Air
  RGB Black TG Clear Tint takes only Micro-ATX and Mini-ITX boards."

### 18. `usb-c-header` — Front USB-C port

| Outcome | Reason |
|---|---|
| Passes | The {board} has the USB-C header that the front USB-C port of the {case} needs. |
| Doesn't apply: no port | The {case} has no front USB-C port, so it needs no USB-C header. |
| Warning: no header | The {case} has a front USB-C port, but the {board} has no USB-C header, so that port won't work. |
| Warning: a slower header | The front USB-C port of the {case} is {caseSpeed}, but the USB-C header of the {board} is {headerSpeed}, so the port runs at {headerSpeed}. |

- Warning: "The Fractal Design North Charcoal Black TG Light has a front USB-C port, but the ASUS
  TUF GAMING B550-PLUS WIFI II has no USB-C header, so that port won't work."
- A slower header: "The front USB-C port of the Fractal Design North Charcoal Black TG Light is
  20 Gbps, but the USB-C header of the ASUS TUF GAMING B650-PLUS WIFI is 5 Gbps, so the port runs
  at 5 Gbps." Whether this warns is E1's call; this is the wording if it does.

### 19. `cooler-socket` — Cooler mounting

| Outcome | Reason |
|---|---|
| Passes | The {cooler} fits {socket}, the socket of the {cpu}. |
| Incompatible | The {cooler} doesn't fit {socket}, the socket of the {cpu}. |
| Warning: a kit sold separately | The {cooler} needs a separate {socket} mounting kit from {maker}. (Needs D1.) |

- Passes: "The DeepCool AK620 fits AM5, the socket of the AMD Ryzen 7 9800X3D."

### 20. `display-output` — Display output

| Outcome | Reason |
|---|---|
| Passes: a graphics card | The {card} provides the display outputs. |
| Passes: integrated graphics | The {cpu} has integrated graphics, so the build can run a display without a graphics card. |
| Incompatible | The {cpu} has no integrated graphics, and the build has no graphics card, so it has no display output. |

- Incompatible: "The Intel Core i5-12400F Processor has no integrated graphics, and the build has
  no graphics card, so it has no display output."
- Passes: "The AMD Ryzen 7 9800X3D has integrated graphics, so the build can run a display
  without a graphics card."

## 8. The BIOS warning (Hazem's decision, plan §6)

**Warn, never block.** Boards made after a BIOS came out usually ship with it, and nobody can know
which board a shop sends; a block would hide builds that work for most buyers. **The warning names
the BIOS version needed, and tells the buyer exactly what to do.**

### A board without BIOS FlashBack

| Field | Wording |
|---|---|
| Status | Warning |
| Reason | The {cpu} needs BIOS {version} or later on the {board}, and this board can't update its BIOS without a CPU it already supports. |
| Action | Ask the retailer for a board already updated to BIOS {version} or later. |

> **Warning.** The Intel Core i5 processor 14600K needs BIOS 1205 or later on the ASUS PRIME
> B760M-A WIFI D4, and this board can't update its BIOS without a CPU it already supports.
> Ask the retailer for a board already updated to BIOS 1205 or later.

The values are in the catalogue: the board's CPU support list gives 1205 for the 14600K, and its
spec page lists no BIOS FlashBack (`asus-prime-b760m-a-wifi-d4`).

### A board with BIOS FlashBack

| Field | Wording |
|---|---|
| Status | Warning |
| Reason | The {cpu} needs BIOS {version} or later on the {board}, which can update its BIOS without a CPU, using {flashbackName}. |
| Action | Before first boot, update the board to BIOS {version} or later with {flashbackName}. |
| Steps | The maker's procedure, below, with its source |
| Steps' title (`Steps.title`, a label with no full stop) | How to update with {flashbackName} |

> **Warning.** The AMD Ryzen 7 9850X3D needs BIOS 1066 or later on the ASUS TUF GAMING X870-PLUS
> WIFI, which can update its BIOS without a CPU, using BIOS FlashBack. Before first boot, update
> the board to BIOS 1066 or later with BIOS FlashBack.

**The steps for an ASUS board.** Source: ASUS, "[Motherboard] How to use USB BIOS FlashBack™?",
https://www.asus.com/support/faq/1038568/, last updated 9 Apr 2026, read by design-lead on 2 Oct
2026. Condensed from ASUS's eight steps and its warning not to unplug anything during the update.

1. Download BIOS {version} or later for the {board} from the ASUS Download Center, and unzip it.
2. Run BIOSRenamer from the download, which gives the BIOS file the name BIOS FlashBack needs.
3. Copy the renamed .CAP file to the top folder of a USB drive formatted as FAT32.
4. Shut the PC down, but leave the power supply plugged in and switched on.
5. Plug the USB drive into the board's BIOS FlashBack USB port; the board's manual shows where it is.
6. Press the BIOS FlashBack button for 3 seconds, until its light blinks three times.
7. Leave everything plugged in until the light goes out, which means the update is done.

- **The steps are copy from a maker's source.** The result cites that source like any spec.
  Today every catalogue board is an ASUS board. A board from another maker needs that maker's
  procedure, worded to this guide and reviewed by design-lead before it ships.
- **ASUS says "FAT16 / 32 MBR".** Step 3 says FAT32, the format a buyer is likely to have; the
  source link carries the detail.

### The other outcomes

| Outcome | Reason |
|---|---|
| Passes: supported from the first BIOS | The {board} supports the {cpu} from its first BIOS version. |
| Passes: the board shipped with a new enough BIOS (needs D1's BIOS dates) | The {board} first shipped with BIOS {first}, which already supports the {cpu}. |
| Can't verify | {maker}'s CPU support list for the {board} doesn't give the BIOS version that the {cpu} needs. |

## 9. Power (WP-E2)

| Where | Wording |
|---|---|
| Breakdown rows, one each | "CPU"; "Graphics card"; "Motherboard"; "Memory (2 modules)"; "Storage (1 M.2 drive)"; "Fans (3)"; "Pump" |
| Column headers | "Part"; "Gaming (W)"; "Worst case (W)"; "Source" |
| A spec term, where the row needs it | In brackets after the plain words: "Card power (TBP)", "Package power limit (PPT)" |
| Totals | Estimated gaming load: 520 W. Estimated worst-case load: 610 W. |
| Headroom | Headroom for short power spikes: 150 W, for graphics cards rated 300 W and up. |
| Recommendation | Recommended power supply: 850–1,000 W. |
| A part the estimate can't count | The totals leave out the {component}: {reason}. So they are a lower bound. |

The numbers in this table show the format only.
- **A line's label is its component,** as above, and the part's display name is shown beside it
  (copy guide §4): never a shortened name such as "Ryzen 7 9800X3D, PPT".

**The card maker's figure,** shown beside the recommended range (`makerRecommendation`). Makers
use three different words for it. Every string that mentions the figure keeps the maker's word,
by `kind` (data-lead's `recommendedPsuKind`), with one verb per kind:

| `kind` | Sentence, beside the range | Inside another sentence | Example (WP-D1 batch 1 values) |
|---|---|---|---|
| `required` | {maker} requires a power supply of {watts} for the {card}. | the {watts} that {maker} requires for the {card} | "NVIDIA requires a power supply of 1,000 W for the NVIDIA GeForce RTX 5090 Founders Edition." NVIDIA's label: "Required System Power (W)" |
| `recommended` | {maker} recommends a power supply of {watts} for the {card}. | the {watts} that {maker} recommends for the {card} | "ASUS recommends a power supply of 850 W for the ASUS TUF Gaming GeForce RTX 5070 Ti 16GB GDDR7 OC Edition." ASUS's label: "Recommended PSU" |
| `minimum` | {maker} sets a minimum power supply of {watts} for the {card}. | the {watts} minimum that {maker} sets for the {card} | "Sapphire Technology sets a minimum power supply of 750 W for the SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB." Sapphire's words: "Minimum 750 Watt Power Supply". Intel's, for the Intel Arc B580 Limited Edition Graphics: "Minimum Power Supply Unit" "600 W" |
| none: a card is picked, and `makerRecommendation` is `null` | {maker} doesn't publish a power supply figure for the {card}. | — | No catalogue card today |

- **Never call every figure a recommendation.** A required or minimum figure said as
  "recommends" softens what the maker wrote. Labels follow the same rule, never "Recommended
  PSU": "Maker's PSU (W)" in the Specs view ([specs-view.md §2](specs-view.md#2-columns)), and
  "Graphics card: maker's power supply figure" in the lab's evidence list.
- **The number goes after the noun:** "a power supply of 850 W", "a minimum power supply of
  750 W", "the 850 W that ASUS recommends"; never "an 850 W power supply". Before the number,
  the article would have to follow how each number sounds ("an 850", "a 750").
- **`{maker}` is the publisher name** (`data/publishers.json`) of the figure's source,
  `makerRecommendation.evidence.sources`. Today that is always the card's own maker. With no
  figure, it is the card brand's publisher, as in rule 7.
- **No caveat in the sentence.** NVIDIA bases its figure on "a PC configured with a Ryzen 9
  9950X processor", and ASUS on "a fully overclocked GPU and CPU system configuration". Those
  words belong in the evidence, with the figure's source; the sentence keeps the figure and the
  maker's word.
- **How the range relates to the figure** is `PsuRange.explanation`, one sentence that E2
  drafts. When it mentions the figure, it uses the "inside another sentence" form, so it never
  shortens the maker's name ("Sapphire's minimum"). When the range doesn't include the figure,
  that sentence says why (plan WP-E2). design-lead reviews it with the strings (section 13).

## 10. Estimates (WP-E3, WP-E4)

**The readout's words** ([lab-spec.md §6](lab-spec.md#6-the-estimate-readout)):

| Part | Wording |
|---|---|
| Figure | 142–158 fps |
| Label | Estimated |
| Confidence | "High confidence", "Medium confidence" or "Low confidence" |
| Conditions, full | Cyberpunk 2077 at 1440p, High preset, ray tracing off, no upscaling. Ray tracing reads "ray tracing off", "ray tracing on" or "path tracing" |
| 1% lows, when the anchors publish them | 1% lows: 120–131 fps |
| Conditions, short (Phase 2 dock at 390 only) | Cyberpunk 2077, 1440p High, native |
| Upscaling, its own readout | With DLSS Quality upscaling |
| Frame generation, its own readout, never mixed into native | With DLSS frame generation (2×). Its caption: "Counts generated frames as well as rendered ones." |
| Limiter | "Limited by the graphics card." or "Limited by the CPU." |
| The two limits | Graphics card limit: 142–158 fps. CPU limit: 210–240 fps. |

- **Presets use the game's own English names,** from D2's preset-name map. A publisher's label
  ("Hemmungslos") appears only in the evidence, never as the condition.

**The explanation line,** under the readout, when the estimate needs one (the Director's rulings of
2026-10-02, plan WP-E3):

| Case | Pattern |
|---|---|
| Reputable sources disagree by more than 10% (`conflictsWith`) | Published tests disagree: {publisherA} measured {valueA} and {publisherB} {valueB}, so the range covers both. |
| A per-source calibration was used | Adjusted for the difference between the test scenes of {publisherA} and {publisherB} in {game}. |

- Example: "Published tests disagree: [ComputerBase] measured [146 fps] and [TechPowerUp] [128 fps],
  so the range covers both." The numbers are each anchor's own, with their sources in the
  evidence. The confidence then reads Medium or Low, never High (plan WP-E3).
- The explanation names what was done in words. A factor ("× 0.91") appears only in the
  evidence.
- **What the levels mean** (plan WP-E3, finalised by E3): "High: a published test of this chip,
  game and setting." "Medium: between chips that were tested." "Low: extrapolated, or combined
  across publishers."

**When there is no number:**

| Case | Figure | Label row | Line under it |
|---|---|---|---|
| A part to pick first (`NeedsParts`) | — | Not estimated yet | Pick {the missing parts} to estimate {what}: "Pick a CPU to estimate the frame rate." |
| No published test | — | No estimate yet | There is no published test of {game} on the {chip}. |
| No creator source | — | No estimate yet | There is no published source for {workload} on this build. |
| An incompatible build | — | Not estimated | The build has an incompatible part. |
| A local AI model that doesn't fit | — | Doesn't fit in {vram} | {model} needs about {need} of video memory. |
| Too little video memory, a flag beside a figure | the range | the normal label row | A "Warning" chip, then: {game} at {setting} uses about {use} of video memory, more than the {vram} on the {card}. |

The "—" is announced as the label row's words: "No estimate yet", "Not estimated" (lab-spec.md
§6).

**Ranges inside sentences** ("Graphics card limit: 142–158 fps.") keep the en dash. The UI gives
every en dash between two numbers a visually hidden "to" form (lab-spec.md §6), so the engine
writes ranges only one way.

**Creator workloads,** one unit each: Blender, the render time of the named scene (or Open Data's
samples per minute when no scene time is sourced, plan §8 risk 4); Cinebench 2024, points; video
export and code compile, s or min; local AI, tokens/s for the named model and size.

## 11. Bottleneck verdicts (WP-E5)

| Part | Pattern |
|---|---|
| Verdict (its own field) | At {resolution} {preset} in {game}, the {graphics card / CPU} is the limit. |
| What would help (its own field) | One tier up, the {cpu2} would add about {x}%, and the {card2} about {y}%. |
| Balanced | At {resolution} {preset} in {game}, neither part holds the build back: the CPU and graphics card limits are within {x}% of each other. |
| No part one tier up | No faster {CPU / graphics card} has a price in {market}. |

- Verdict: "At 1440p High in Cyberpunk 2077, the graphics card is the limit."
- What would help: "One tier up, the [AMD Ryzen 7 9850X3D] would add about [2%], and the [NVIDIA
  GeForce RTX 5080 Founders Edition] about [28%]." The parts are E5's "one tier up" picks; every
  percentage comes from the model, pinned by a test (plan WP-E5).
- **"About {x}%" is the midpoint of the gain's range, rounded to a whole number** (the gain is an
  `Estimate`). The sentence stays plain; the lab shows the range and its confidence beside it,
  as "+25–31%, medium confidence".
- **A rebalanced build:** its title "Same price, about {x}% faster at {resolution} {preset} in
  {game}"; its changes "Swap the {from} for the {to}."; its price "{currency} {total}, prices as
  of {date}"; its checks, the summary line of section 6.
- Markets by name: "Saudi Arabia" and "the US"; the currency codes SAR and USD.

## 12. Dates and sources in text

- **Dates:** "30 Sep 2026", day, short month, year, from `Intl` en-US parts (backlog item 21).
  Times, when a source has one, in UTC: "14:05 UTC".
  - **Format with `timeZone: 'UTC'`.** A date-only value ("2026-09-30") is midnight UTC, so a
    local time zone moves it to 29 Sep in the US. And 23:30 UTC on 30 Sep is already 1 Oct in
    Riyadh. Measured in Node 24.21 (ICU 78.3) by the ui-designer, 2026-10-02.
  - en-GB is not an option: it prints "30 Sept 2026".
- **The verbs:** a spec or support list was "read 30 Sep 2026"; a review was "published 6 May
  2026"; a price is "as of 30 Sep 2026".
- **Document names in source links,** from the source's `docType`: product page, datasheet, user
  manual, support article, spec page, press release, CPU support list, BIOS release notes, review,
  benchmark results. A manual adds its page: "user manual, page vii".

## 13. How design-lead reviews strings

After each E1, E3 and E5 hand-off (brief step 5):
1. build-lead runs `npm run engine:dump`. design-lead reads **every** distinct reason, action, step
   and verdict in the dump, not only the lab's examples.
2. The review returns a list: each string approved, or rewritten with the new wording.
3. A rewrite changes the template, not one result. A snapshot test of every template's rendered
   example makes any later change show up in review.

## 14. Known gaps and questions

- **Three M.2 drives: answered.** build-lead's result types hold the drives as a list
  (`BuildParts.storage`, `15f9b5c`), and the case fans as one model in packs. The v1 share-link
  codec still holds one part per category (`src/state/categories.ts`); carrying the list in the
  URL is build-lead's, in WP-E0.
- **Long names.** Two display names can make a 160-character reason: three lines at the reading
  measure (`max-w-measure`, about 64 characters a line, backlog item 15). The mock measured it.
  That is accepted. If Phase 2 needs shorter names, data-lead adds a sourced short name; the engine
  never makes one up.
- **Condition texts: answered.** data-lead structured the conditions (`feat/data-engine-data` @
  `4337e09`) and keeps the maker's words verbatim in `asPublished`. Section 3 has the phrase
  rules that build the reason's wording from the fields.
- **The FlashBack steps' source: answered.** data-lead cites ASUS FAQ 1038568 on the 6 boards
  with BIOS FlashBack (`4337e09`). It lands with D1 batch 1.
- **Preset names** wait for D2's map (plan WP-D2).
