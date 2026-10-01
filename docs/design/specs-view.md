# Specs view: the expert table (Studio)

Owner: design-lead · Date: 2026-10-01 · Status: ready for review · Built in Phase 2

Studio is the least dense of the three directions. Its rail shows 4 parts in the first view at
1440 ([direction.md §4](direction.md#4-direction-c-studio)), but a step can hold 40 or more parts,
and an expert wants to scan and compare specs. The **Specs view** is the same step's parts as a
dense, sortable table: 12 full rows in the first view at 1440 (section 9).

It is a **view of the rail, not a new page and not a modal:**
- the same parts, filters, selection and compare set as the list;
- the build stays on the stage beside it on desktop (BUILD_PROMPT §6);
- "no modal where a panel works".

Values in this document are illustrative, as in the mocks.

## 1. Where it lives

**Opening it:** a two-option switch in the rail's header, "View: List · Specs" (`type-control`,
the pressed pill style). The choice is remembered for the visitor (`localStorage`, key
`rig-lab-view`, inside `try`). It is not part of the share link: a shared build opens in the list.

| Width | Layout |
|---|---|
| **lg and up** (1100+) | The rail becomes the Specs panel, growing leftward to `min(960px, 100vw − 2 × --gutter − 400px)`: 960 px at 1440, 668 px at 1100. At least 400 px of stage stays visible on the left, and the camera frames the build there (view offset; [studio-3d-brief.md §3.1](studio-3d-brief.md#31-camera)). The top bar and the dock stay. |
| **md** (768–1099) | The rail's sheet, in table mode. Opening Specs expands the sheet, and the stage collapses to Studio's 96 px strip, so the build stays in view. |
| **Phone** (below 768) | The same expanded sheet over the 96 px strip, above the docked bar. |

At every width the table scrolls horizontally when its columns do not fit. **The compare and name
columns stay pinned on the left. No column is ever hidden** at narrow widths, so nothing is
silently lost.

```
1440, dark: the Specs panel open (values illustrative)
┌ top bar ── Rig Lab, AAA 1440p build ────────────────────────────────── [SAR|USD]  Share  Theme ┐
│ Step 3 of 12   ┌ Specs panel, 960 ────────────────────────────────────────────────────────────┐│
│ Processor      │ Processors  12 of 38 fit                             View [List | Specs]      ││
│                │ [Fits my build] [Fastest in my games] [AM5]                                   ││
│ [ the build,   │ FPS: Cyberpunk 2077, 1440p High, native. Estimates.                           ││
│   framed in    │ ☐ Name                Cores  Boost  L3    Power  FPS      Conf.     Price  Fit ││
│   the left     │     ▌                 (C/T)  (GHz)  (MB)  (W)                       (SAR)      ││
│   400+ px ]    │ ☐ ▌Ryzen 7 9800X3D ✓   8/16    5.2    96    120  96–108   ▮▮▯ Medium 1,899  ⚠  ││
│                │     May need a BIOS update before first boot. …  Rule bios-min-version         ││
│                │ ☐  Ryzen 7 7800X3D     8/16    5.0    96    120  95–107   ▮▮▯ Medium 1,549  ✓  ││
│                │ ☐  Ryzen 9 9950X3D    16/32    5.7   128    170  96–109   ▮▮▯ Medium 2,849  ⚠  ││
│                │ …                                                                             ││
│                │ Won't fit your AM5 board. Needs an LGA1851 board. Rule socket-match           ││
│                │ ☐  Core Ultra 7 265K  20/20    5.5    30    125  —        —          1,199  ⊘  ││
│                │ Prices as of 30 Sep 2026 · 9 of 12 priced · Sources                           ││
│ [3D tools]     └───────────────────────────────────────────────────────────────────────────────┘│
├ dock ─ ‹ Processor, 3 of 12 › │ 96–108 fps │ SAR 9,412, as of … │ Compare 2 │ Next: Motherboard ┤
```

In the sketch, "▌" is the selected row's bar, and ✓, ⚠ and ⊘ stand for the state icons with
their words ("Fits", "Warning", "Incompatible"). The Socket column has gone because the AM5 filter
is on (section 4, rule 5).

## 2. Columns

Every column is a catalogue field with a source (CLAUDE.md rule 1). The field names below are from
data-lead's WP-D0 schema (`feat/data-foundations`, not yet merged), and change with it.

**The processor step, in full:**

| Column | Header (unit) | Field | Cell | Align |
|---|---|---|---|---|
| Compare | (checkbox) | — | Checkbox; up to 3 parts | centre |
| Name | Name | `brand`, `family` and the model name | `type-name`. "Selected" after it when chosen | left |
| Socket | Socket | `socket` | AM5 | left |
| Cores | Cores (C/T) | `cores`, `threads`; `performanceCores` + `efficiencyCores` when `hybrid` | 8/16, or 8P + 12E / 20 | right |
| Boost | Boost (GHz) | `boostClockMhz` | 5.2: one decimal | right |
| L3 | L3 (MB) | `l3CacheMb`; `has3dVCache` | 96, with "3D" after it when true | right |
| Power | Power (W) | `power`: `tdpW` (AMD) or `processorBasePowerW` (Intel) | 120. The source popover names the scheme ("TDP" or "Processor Base Power") | right |
| Memory | Memory | `memory.types`, `memory.speeds` | DDR5-5600 | left |
| iGPU | iGPU | `igpu` | Yes / No | left |
| FPS | FPS | the engine's estimate for the step's preview game | 96–108, a range | right |
| Confidence | Conf. | the estimate's level | The three-step mark and its word | left |
| Price | Price (SAR) or (USD) | the market's price observation | 1,899, amount only | right |
| Fit | Fit | the compatibility result | Icon and word in the state colour | left |

**The other steps, first columns after Name, then FPS (where the part moves FPS), Price and Fit:**

| Step | Columns (header units in brackets) |
|---|---|
| Motherboard | Chipset · Form factor · Memory (type, slots, max MT/s) · M.2 (count, best gen) · PCIe x16 (gen) · Wi-Fi · Front USB-C header · BIOS flashback |
| RAM | Type · Kit (modules × GB) · Speed (MT/s) · CL · Voltage (V) · Height (mm) · Profiles (EXPO, XMP) |
| GPU | Chip · VRAM (GB) · Length (mm) · Thickness (slots) · Board power (W) · Power connectors · Recommended PSU (W) |
| Storage | Interface · PCIe gen · Capacity (GB) · Read (MB/s) · Write (MB/s) · Cache (DRAM, HMB) · Endurance (TBW) · Heatsink |
| PSU | Wattage (W) · Efficiency (80 Plus, Cybenetics) · ATX version · 12V-2x6 (native) · Form factor · Length (mm) · Modular |
| Cooling | Type · Height (mm) or radiator (mm) · Fans (count × mm) · Rated (W) · RAM clearance (mm) |
| Case | Size · Boards · GPU max (mm) · Cooler max (mm) · Radiators (front, top) · PSU max (mm) · Size H × W × D (mm) |
| Case fans | Size (mm) · Thickness (mm) · Max (RPM) · Airflow (CFM) · Static pressure (mmH₂O) · Noise (dBA) · Connector · Lighting |

Column order is by what decides a pick at that step: the clearance numbers come first for GPU,
cooling and case.

## 3. Rows

**Height:** 40 px on desktop, 44 px on touch widths. A warning row is 58 px, because it carries
its reason line. Rows are divided by 1 px `--line`; they have no radius and no shadow.

| State | How the row shows it |
|---|---|
| Hovered | `--surface-raised` background, 160 ms (`duration-ui`) |
| Selected | `--surface-raised`, the 3 px `--ink` bar at the leading edge (as in the list), and "Selected" with a check icon after the name |
| Fits | Fit cell: the ok icon and "Fits", in `--ok` |
| Warning | Fit cell: the warn icon and "Warning", in `--warn`. **The reason stays visible** as a second line under the row, in `type-small`, `--ink-2`, with the rule id in `--ink-3`, unbroken |
| Incompatible | Grouped at the end, under one heading row per reason: "Won't fit your AM5 board. Needs an LGA1851 board. Your board is AM5. Rule socket-match". In the row: the name in `--ink-2`, the price in `--ink-3`, FPS "—" (accessible name "Not estimated"), the compare checkbox disabled. Selecting it announces the reason instead |
| A spec the maker does not publish | "—", with the accessible name "Not published". Its popover says so |
| No price in this market | "No price", in `--ink-3`. Its popover gives the gap record: retailers tried and the date |

Blocked parts are shown, not hidden, and their reason is never only in a tooltip
([direction.md §1.3](direction.md#13-compatibility-ok-warn-block)). Grouping them by reason keeps
the reason visible once, not on every row.

## 4. Sorting and filtering

1. Every column header is a sort button. The first press sorts the useful way round: numbers high
   to low, price low to high, names A to Z. The second press reverses.
2. The table opens in the list's current sort and filters, and the two views always share them.
3. Empty values ("—", "No price") sort last in both directions. Ties sort by name.
4. **Rows reorder at once, with no animation.** Focus stays on the same part. If a filter hides
   that part, focus moves to the first row.
5. **A column whose value is the same in every row in view folds into the table's caption.**
   After the AM5 filter, Socket goes and the caption says "All AM5". It comes back when the rows
   differ again.
6. A polite live region says what changed: "Sorted by Boost, high to low", "12 of 38 shown".

## 5. Numbers and sources

The number rules of [direction.md §1.1](direction.md#11-numbers-are-the-product) and
[tokens.md §2.4](tokens.md#24-type) hold; tables add three:
- **Units and currency live in the header** ("Boost (GHz)", "Price (SAR)"). Cells show amounts
  only, right-aligned, in tabular figures.
- **One precision per column:** GHz to one decimal, everything else whole.
- **The FPS condition is stated once,** above the table: "FPS: Cyberpunk 2077, 1440p High,
  native. Estimates." Ranges always come with their confidence mark and its word, so the level
  never relies on the mark alone (CLAUDE.md rule 2).

**Every number links to its source** (BUILD_PROMPT §9). Each number cell is a button that opens
the source popover: the value, the publisher or retailer, the date read (UTC), and "Open source".
It is the same popover the list uses. The panel's footer carries the step's as-of line: "Prices as
of 30 Sep 2026 · 9 of 12 priced · Sources".

## 6. Keyboard and screen readers

The table is a native `<table>` with `role="grid"`, following the WAI-ARIA Authoring Practices
data grid. An expert can work it without the mouse, which is the point of the view.

| Key | Does |
|---|---|
| Tab | Enters the grid once, at the last cell it was on; the next Tab leaves it |
| Arrow keys | Move between cells, header row included |
| Home, End | First or last cell of the row |
| Ctrl + Home, Ctrl + End | First or last cell of the grid |
| Page Up, Page Down | 10 rows up or down |
| Enter | On a name: selects the part (a blocked part announces its reason). On a number: opens its source. On a header: sorts |
| Space | On the compare cell: adds or removes the part. A fourth says "Compare holds 3 parts. Remove one first." |
| Escape | Closes a popover; focus returns to its cell |

- **Caption:** "Processors: 12 of 38 shown, sorted by FPS, high to low". Each column header has its
  unit in words in its accessible name ("Boost clock, gigahertz"); `aria-sort` marks the sorted
  column. The name cell is the row header.
- **Group heading rows** are one cell spanning the row, so a screen reader reads each reason once.
- **The focus ring** is the 2 px `--focus` ring with a −2 px offset inside the cell, so a scroll
  container or a pinned column never clips it.
- **Hit areas:** the compare checkbox's cell is the hit area, at least 24 × 24 px
  ([tokens.md §2.5](tokens.md#25-layout)).

## 7. Motion

From [motion.md](motion.md#direction-c-studio-cinematic-the-object-moves-first) and the tokens.
Only `transform` and `opacity` move.
- **List to Specs:** the list fades out (200 ms, `--dur-fade`). The panel comes in 24 px from the
  right and fades up (360 ms, `--dur-value`, `ease-settle`). The camera re-frames the build in
  the stage that is left (700 ms, `ease-dolly`). Back to the list is the same in reverse.
- **Selecting a row:** the selected state is instant (feedback under 100 ms, BUILD_PROMPT §6). The
  part seats on the stage (500 ms), and the dock's numbers swap (240 ms out, 360 ms in).
- **Sorting and filtering:** no movement (section 4, rule 4).
- **Reduced motion:** every switch is instant, and the camera cuts with a 200 ms crossfade.

## 8. Tokens

| Use | Token or role |
|---|---|
| Panel | `bg-surface`, `rounded-panel`, `shadow-float`, `z-rail`; `z-sheet` when it is the expanded sheet |
| Row hover, selected row, the "Selected" mark | `bg-surface-raised`; the bar `--ink` |
| Dividers, the pinned column's edge when scrolled | `border-line` |
| Panel title | `type-heading` |
| The view switch, filter chips | `type-control`, `h-chip`, `rounded-pill` |
| Column headers, the FPS condition, group headings, footer | `type-caption`, `text-ink-3` |
| Part name | `type-name`, `text-ink` (`text-ink-2` when blocked) |
| Number cells, reasons | `type-small`; reasons in `text-ink-2`, rule ids in `text-ink-3` |
| States | `text-ok`, `text-warn`, `text-block`, on the icon and the word only |

There are no new tokens. Every pair above is already in the contrast table
([tokens.md §2.2](tokens.md#22-contrast-measured)).

## 9. Density, worked out from the tokens

Rows in the first view, at common viewport heights. The fixed parts are:
- the panel header: the title and switch row, 56 px, plus the chips row, 46 px;
- the FPS condition line, 24 px;
- the table header, 40 px;
- the footer, 36 px.

| Viewport | Height for rows | Full rows in view | The list, in the Studio mock |
|---|---|---|---|
| 1440 × 900 | 900 − 68 top bar − 92 dock − 2 × 16 gutter − 202 fixed = 506 px | **12** at 40 px, also with one warning row | 4 |
| 768 × 1024 | 1024 − 68 − 96 strip − 80 dock − 16 − 202 = 562 px | **14** at 40 px | 2, and part of a third, under the 560 px stage |
| 390 × 844 | 844 − 56 − 96 − 76 − 202 = 414 px | **9** at 44 px | 2, and part of a third |

The heights are worked out from the tokens, not measured; the Phase 2 mock measures them.

## 10. Known gaps

- **Not drawn yet.** This is a written spec; a static mock on the shipped tokens is the first
  Phase 2 design task for this view.
- **The compare view** (up to 3 parts side by side) is a separate Phase 2 spec. This view only
  feeds it.
- **The column sets follow WP-D0's schema,** which is not merged yet.
- **The confidence levels' meaning** comes from the engine team (Phase 1); this view only shows
  them.
- **The grid's keyboard path needs e2e tests** from qa-lead when it is built.
- **The Studio mock's list rows put a checkbox inside a `role="option"`,** which ARIA does not
  allow, because an option cannot contain a control. The Phase 2 list must use another pattern:
  a list of rows with a select button and a checkbox each, or this grid.
