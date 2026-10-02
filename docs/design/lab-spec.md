# Engine lab spec (WP-DS2)

Owner: design-lead · Date: 2026-10-02 · Status: ready for build-lead (WP-E0, then each lab page) ·
Mock: [`mocks/lab/index.html`](mocks/lab/index.html) · Words: [copy-guide.md](copy-guide.md)

The Engine lab is a few internal pages at `/lab/` where Hazem and the team pick real parts and read
the engine's answer, its reason and its sources (plan §1). It is marked "Engine lab: internal
preview", it is not in the site nav, and it asks search engines not to index it. It still meets
every bar: axe AA in both themes at 390, 768 and 1440, no console errors or warnings, and the JS
budget.

**It previews five Phase 2 components.** Build them as real components under `src/components/`,
so the builder reuses them unchanged:
1. the status chip (section 3);
2. the result row (section 4);
3. the evidence list (section 5);
4. the source link (section 5);
5. the estimate readout (section 6), which backlog item 44 governs.

Everything here uses the shipped tokens and roles ([tokens.md](tokens.md)). It adds no colour pair
that the contrast check does not already measure (section 10).

---

## 1. The frame

The lab is an instrument, so it is quiet: one column of panels on the stage colour, no 3D, no
motion. Studio's voice comes from the type: each page opens with its name in `type-display`, the
same light, expanded face as the builder's step names.

```
1440 (lg and up)
  Rig Lab  [Engine lab: internal preview]                                          [Light theme]
  Overview  Parts  Accuracy  Compatibility  Power  Games  Creator  Bottleneck

  Compatibility                                        (h1, type-display)
  One row per rule: its result, its reason and the specs it used, with their sources.

  ┌ Build (picker, 22rem, sticky) ┐   16 of 20 pass, 1 incompatible, 1 can't verify, 2 warnings.
  │ CPU                           │   ┌ results panel ───────────────────────────────────────────┐
  │ [AMD Ryzen 7 9800X3D       v] │   │ (status)      CPU socket  cpu-socket                      │
  │ Motherboard                   │   │ ⊘ Incompatible The AMD Ryzen 7 9800X3D needs an AM5 board,│
  │ [ASUS TUF GAMING Z890-…    v] │   │               but the ASUS TUF GAMING Z890-PLUS WIFI …    │
  │ …                             │   │               Sources                                     │
  └───────────────────────────────┘   ├───────────────────────────────────────────────────────────┤
                                       │ ⚠ Warning     BIOS version  bios-version                  │
                                       │ …                                                         │

768 (md): one column. The picker panel comes first, its fields in two columns; the results follow.
390: one column. Fields in one column; each result row stacks its heading, status and body.
```

| Part | Spec |
|---|---|
| Page | The stage colour (`base.css` already paints it). Content in `px-inset` (16, 28, 40 px), `pt-6 pb-16`. No horizontal page scroll at any width: wide tables scroll inside their own region (section 8) |
| Header | Not sticky, so nothing ever covers focused content (WCAG 2.4.11). Row 1: the wordmark "Rig Lab" (`type-wordmark`, a link to the site's home), the marker, then the existing "Light theme" toggle at the end. Row 2: the lab nav. `gap-x-4 gap-y-3`, wrapping |
| The marker | "Engine lab: internal preview" in `type-caption text-ink-2`, on `bg-surface`, `rounded-pill`, `px-2.5 py-0.5`, a 1 px **dashed** `--line` border. The dash is Studio's sign for "not the real thing yet": the mock's "3D view placeholder" tag uses it. It is not a control, so it has no hover or focus |
| Lab nav | `<nav aria-label="Engine lab">` with a list (`role="list"`). Links in `type-control text-ink-2`, each `inline-flex min-h-6 items-center` (24 px, backlog item 49), with no underline. The current page: `text-ink`, `aria-current="page"` and a 2 px `--ink` underline at a 6 px offset, so it never relies on colour. **Only pages that exist are listed:** no dead links while E1 to E5 are still to come |
| Page head | The `<h1>`, which `base.css` sets in the display role. Then one sentence in `type-body text-ink-2 max-w-measure`, `mt-2`. Then `mt-8` to the body |
| Body, lg | `grid grid-cols-[22rem_minmax(0,1fr)] gap-8 items-start`. The picker is `sticky top-6`. If it is taller than the viewport it scrolls inside, with `p-1` inside the scroll box so focus rings are never clipped (backlog item 45) |
| Body, below lg | One column, `gap-8` |
| Panels | `bg-surface border border-line rounded-panel`, no shadow: nothing floats over a scene here |
| Document title | "{Page} · Engine lab · Rig Lab", as the route table writes titles today |

## 2. The part picker

One shared picker for every lab page. The picked parts live in the URL through the existing build
codec (plan §1), so every hand-off can link to an exact case.

| Part | Spec |
|---|---|
| Panel | `<section aria-labelledby>` on the panel style. `p-5` |
| Heading | `<h2>` "Build", `type-heading`. Under it, `type-small text-ink-3 mt-1`: "The link holds these parts, so you can share this exact build." |
| Fields | `mt-4 grid gap-4`. Two columns from md to lg (`md:grid-cols-2`), one column in the lg side panel |
| Order and labels | The build codec's category order with the route table's step labels: CPU; Motherboard; Memory (RAM); Graphics card (GPU); Storage; Power supply (PSU); CPU cooling; Case; Case fans |
| Label | A real `<label for>`, `type-small text-ink-2`, `mb-1.5` |
| Select | Native `<select>`: `w-full min-h-11 appearance-none text-ellipsis rounded-row border border-ink-3 bg-surface pl-3 pr-10 type-name text-ink`. The chevron is an 18 px icon at `right-3`, `text-ink-3`, `pointer-events-none`, `aria-hidden`. `min-h-11` (44 px) is the touch target (backlog item 4) and leaves room for user text spacing (item 2). A long name ends in an ellipsis in the closed select (measured in the mock: without `text-ellipsis`, Chromium cuts it mid-letter); the open list and the results show it in full |
| Options | `bg-surface text-ink` on `<option>` too, so Windows dark mode never shows a white list (backlog item 8). First option "None" (value ""). Then parts by display name ([copy-guide.md §4](copy-guide.md#4-part-names)), sorted with `localeCompare('en')` |
| On change | The URL updates (`replaceState`) and the results change in the same frame: no loading state, no animation, no debounce |
| Several drives | If the build model holds more than one drive (copy-guide.md §14): the label becomes "Drive 1", and an "Add a drive" text button (`type-control text-ink`, `min-h-11`) adds "Drive 2", and so on. Each added drive has a "Remove drive 2" button: an 18 px close icon with that text visually hidden |
| Page inputs | Pages that need more than parts, such as /lab/games (game, resolution, preset, upscaling) and /lab/bottleneck (market), add a second group under the parts, headed "Test" (`type-label`), with the same field style |

## 3. The status chip

The engine's status in words, with an icon of its own and its colour. **Never colour alone**
(WCAG 1.4.1, direction.md §1.3).

```html
<span class="inline-flex items-center gap-1.5 whitespace-nowrap type-small text-warn">
  <svg class="size-4 shrink-0" viewBox="0 0 18 18" aria-hidden="true" fill="none"
       stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">…</svg>
  Can't verify
</span>
```

| State | Word | Icon (18 px grid, 1.75 px stroke, round caps and joins, drawn at 16 px) | Colour |
|---|---|---|---|
| ok | Passes | `<circle cx="9" cy="9" r="7"/><path d="M6 9.2l2 2 4.1-4.3"/>` | `text-ok` |
| warn | Warning | `<path d="M9 2.5l7 12.3H2z"/><path d="M9 7.2v3.4M9 12.9v.1"/>` | `text-warn` |
| warn, missing data | Can't verify | `<path d="M9 2l7 7-7 7-7-7z"/><path d="M7.4 7.6a1.65 1.65 0 1 1 2.35 1.5c-.45.22-.75.55-.75 1.05v.25M9 12.7v.1"/>` | `text-warn` |
| block | Incompatible | `<circle cx="9" cy="9" r="7"/><path d="M4.1 13.9l9.8-9.8"/>` | `text-block` |
| no result | Not checked | `<circle cx="9" cy="9" r="7"/>` | `text-ink-3` |

- **Every state that needs attention has a silhouette of its own:** the warning's triangle and
  the can't-verify diamond stand out among the circles, in colour or not. The ok, warn and block
  icons are the Studio mock's own.
- **Why a diamond, not a triangle with a question mark** (tried first): at 16 px on a 1× screen,
  the question mark inside a triangle blurs into a blob, because the triangle is narrowest where
  the glyph needs room. A circle with a question mark is legible, but it would be a fourth circle,
  so a forced-colours or monochrome scan would need the inner glyph to find it. The diamond is
  legible at 1×, clean at 2× and 3×, and its own shape. Evidence:
  `artifacts/screenshots/phase-1/WP-DS2/lab-mock/icon-candidates-{1,2,3}x.png` in the design-lead
  worktree.
- **No fill and no border.** The chip is not a control, and a tinted background would make a list
  of warnings loud (tokens.md §2.1, rule 2).
- **Only on `--surface` or `--surface-raised`,** never on the stage or the floor: there, light
  `--ok` and `--warn` fall below 4.5:1 (QA-P0-018, now tokens.md §2.1 rule 2).
- **Forced colours:** the icon strokes are `currentColor`, so they turn into the system text
  colour with the word. Nothing is drawn with a background.
- **Screen readers** read the word. The icon is `aria-hidden`.

## 4. The result row

One row per compatibility rule, in plan §3's order, which never changes, so a rule is always in
the same place.

```
the list 36rem wide or more                   narrower (390, and Phase 2's rail)
┌──────────────┬──────────────────────────┐   ┌───────────────────────────┐
│ (status)     │ (rule name)  (rule id)   │   │ (rule name)  (rule id)    │
│              │ (reason)                 │   │ (status)                  │
│              │ (action)                 │   │ (reason)                  │
│              │ (steps, closed)          │   │ (action)                  │
│              │ (layout checked)         │   │ (steps, closed)           │
│              │ (evidence)               │   │ (layout checked)          │
└──────────────┴──────────────────────────┘   │ (evidence)                │
                                              └───────────────────────────┘
```

| Part | Spec |
|---|---|
| The list | `<ol role="list" class="@container">` as the results panel. Each `<li>` is `px-5 py-4`; rows after the first add `border-t border-line` (`not-first:border-t`). No radius, no shadow on rows |
| **Container queries, not breakpoints** | The row is laid out by the width of its list, not of the viewport. At 1100 px the picker sits beside the results, so a row's body is about 420 px wide, narrower than at 768. And Phase 2 puts the same row in the 424 px rail. Viewport breakpoints would get both wrong |
| Grid, the list 36rem wide or more (`@xl`) | `@xl:grid-cols-[9.5rem_minmax(0,1fr)] @xl:gap-x-6`: the status in column 1, spanning the rows; everything else in column 2. The chip takes `@xl:mt-px`, so its 18 px line sits centred on the heading's 20 px line |
| Narrower | One column: heading, status (`mt-1`), body (`mt-2`) |
| **DOM order** | Heading, status, reason, action, steps, layout, evidence, at every width. A screen reader that jumps by heading hears the status right after the rule's name. Only the wide grid moves the status to the left, and it is not focusable, so focus order is unaffected |
| Heading | `<h3>` with the rule name ([copy-guide.md §6](copy-guide.md#6-status-words-rule-names-and-the-summary)) in `type-label text-ink`. After it, in the same wrapping row (`flex flex-wrap items-baseline gap-x-2`), the rule id in `type-caption text-ink-3 whitespace-nowrap`, `translate="no"` |
| Reason | `<p>` in `type-body text-ink-2 max-w-measure`: the reading measure token, about 64 characters a line and 75 at most (backlog item 15; not `65ch`, which sets up to 83). Part names inside it carry `translate="no"` |
| Action | `<p>` in `type-body text-ink max-w-measure mt-1`. It is the one instruction in the row, so it takes the strongest ink; it needs no label |
| Steps | A closed `<details>` (`mt-3`). The `<summary>`: `inline-flex min-h-6 items-center gap-1.5 type-control text-ink`, holding three children: an 18 px chevron that turns 90° when open (`transform`, `duration-ui ease-settle`, instant under reduced motion), one `<span>` with the whole text "How to update with BIOS FlashBack" (one span, or the flex gap splits the sentence), and a `<span class="text-ink-3">` "7 steps". Hide the browser's marker. Inside: an `<ol>` in `type-body text-ink-2 max-w-measure`, `list-decimal pl-5 space-y-1 marker:text-ink-3`, then the steps' source link |
| Layout | `<p>` in `type-small text-ink-3 mt-2`: "Layout checked: a 360 mm radiator at the front." |
| Evidence | Section 5, `mt-3` |
| Not checked | The chip "Not checked"; the reason says what is missing ("Needs a CPU and a motherboard.") in `type-body text-ink-3`; no evidence |

**The summary** sits above the panel: `<p role="status">` in `type-heading text-ink`, with the
sentence of [copy-guide.md §6](copy-guide.md#6-status-words-rule-names-and-the-summary). The "not
checked yet" count follows it in `type-body text-ink-2`. `role="status"` announces each change
politely after a pick; nothing else on the page is a live region.

## 5. The evidence list and the source link

Every spec a rule used, with its value and its source, next to the sentence (golden rule 1). In
the lab it is always open: the lab exists to be checked.

```
Sources                                                       (type-caption text-ink-3)
Graphics card: length        320 mm    SAPPHIRE, product page ↗, read 30 Sep 2026
Case: graphics card limit    355 mm    Fractal Design, spec page ↗, read 30 Sep 2026
Cooler: memory clearance     Not published
                             DeepCool's spec page lists no memory clearance.
```

| Part | Spec |
|---|---|
| Label | "Sources", `type-caption text-ink-3`, `mb-1` |
| The list | `<dl class="grid gap-y-2 type-small">` inside the row body, which is `@container`. Each item is a `<div>` holding one `<dt>` and two `<dd>` |
| Columns, the body 42rem wide or more (`@2xl`) | The `<dl>` takes `@2xl:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)] @2xl:gap-x-4`; each item `@2xl:col-span-3 @2xl:grid @2xl:grid-cols-subgrid`, so values and sources line up down the list: spec, value, source. In the mock this is 1440 only |
| Narrower | The spec and the value on one line (`flex flex-wrap gap-x-2`); the source on the next (`w-full`). At 768 the three columns were tried first: the dates broke across lines |
| Spec (`<dt>`) | "{Part role}: {spec}", `text-ink-2`: "Graphics card: length", "Case: graphics card limit". build-lead keeps one label map for the catalogue's fields; design-lead reviews it with the strings (copy-guide.md §13) |
| Value (`<dd>`) | `text-ink`, tabular, `whitespace-nowrap`, formatted by [copy-guide.md §3](copy-guide.md#3-numbers-and-units). A conditional value carries its condition: "300 mm with a 360 mm front radiator" (then it may wrap) |
| Not published | "Not published" in `text-ink-2`; the data's reason under it in `type-caption text-ink-3`. Never a dash on its own |
| Source (`<dd>`) | The source link, below |
| Manual quotes | `m2-lanes` adds the manual's words under its source, in `type-small text-ink-2`, inside a `<blockquote>`, in typographic quotes |

**The source link** (every lab page, and Phase 2's popover):

```html
<a href="https://…" target="_blank" rel="noopener noreferrer"><span translate="no">SAPPHIRE</span>,
  product page<span class="sr-only"> (opens in a new tab)</span><svg class="ml-0.5 inline-block
  size-3.5 align-[-0.125em] text-ink-3" aria-hidden="true">…</svg></a><span class="whitespace-nowrap
  text-ink-3">, read <time datetime="2026-09-30">30 Sep 2026</time></span>
```

The date part is `whitespace-nowrap`: a date never breaks across lines.

- **The link text** is the publisher's name (`data/publishers.json`) and the document type in
  English ([copy-guide.md §12](copy-guide.md#12-dates-and-sources-in-text)), plus a manual's
  page. **The source's own title is not shown:** some titles are German (ComputerBase), and
  showing one would need `lang` on it (WCAG 3.1.2).
- **It opens in a new tab,** because checking means opening several sources from one row, and
  the lab keeps its state in the URL anyway. The new tab is said in words (visually hidden) and
  shown by the arrow, 14 px: `<path d="M7.5 4.5h6v6"/><path d="M13.5 4.5l-9 9"/>` on the 18 px
  grid, `--ink-3`.
- **Link style:** `base.css` already underlines links (1 px `--ink-3`, 2 px on hover). Text in
  `text-ink-2`.
- **The date:** "read" for specs and support lists, "published … , read …" for reviews, "as of"
  for prices, in `text-ink-3`.
- **An archived copy,** when the source has `archiveUrl`: ", archived copy" as a second link,
  after the date.

## 6. The estimate readout

How every estimate is shown, in the lab and later in the dock. **It never appears without its
labels** (backlog item 44, CLAUDE.md rule 2): the range, the word "Estimated", the confidence
word with its mark, and the test conditions, at every width.

```
142–158 fps                                     type-figure; the unit in type-unit text-ink-2
Estimated   ▮▮▮ High confidence                 type-small text-ink-2 (the dock: type-caption)
Cyberpunk 2077 at 1440p, High preset, ray tracing off, no upscaling   type-small text-ink-3
```

| Part | Spec |
|---|---|
| Figure | `<p class="type-figure text-ink">`: the range (see the range rule below the table), a no-break space and the unit, `<span class="type-unit text-ink-2">fps</span>`. It never wraps (`type-figure` sets `nowrap`) |
| Label row | `<p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 type-small text-ink-2">`: "Estimated", then the mark and the confidence word. A gap separates them, not a middle dot (backlog item 14) |
| Confidence mark | `<svg viewBox="0 0 40 4" class="h-1 w-10" aria-hidden="true">` in `currentColor` (`--ink-2`): three 12 × 4 bars, 2 px apart. A filled bar is `fill="currentColor"`; an empty one is `fill="none" stroke="currentColor" stroke-width="1"`, inset by 0.5. High fills three, Medium two, Low one. Outlined empties keep the count readable in forced colours, where backgrounds disappear (backlog item 3). The word carries the meaning; the mark repeats it |
| Conditions | `<p class="type-small text-ink-3">`, the full form of [copy-guide.md §10](copy-guide.md#10-estimates-wp-e3-wp-e4). The Phase 2 dock at 390 uses the short form; it never drops them |
| Limiter (lab) | `type-small text-ink`: "Limited by the graphics card." Then `type-small text-ink-2`: "Graphics card limit: 142–158 fps. CPU limit: 210–240 fps." |
| VRAM flag | A status chip "Warning" with its sentence in `type-small text-ink-2`, under the conditions |
| Explanation | When sources disagree, or a per-source calibration was used: one sentence in `type-small text-ink-2 max-w-measure`, under the conditions ([copy-guide.md §10](copy-guide.md#10-estimates-wp-e3-wp-e4), the explanation line) |
| Upscaling and frame generation | Separate readouts, each under its own `type-label` heading ("With DLSS Quality upscaling"). Frame generation has its caption. Never one figure that mixes them |
| No number | The figure is "—", `aria-hidden`. The label row gives the state in words ("No estimate yet", "Not estimated", "Doesn't fit in 8 GB"), with no mark; the line under it gives the reason. Both from [copy-guide.md §10](copy-guide.md#10-estimates-wp-e3-wp-e4) |
| Anchors (lab) | The evidence list of section 5: each anchor's measured value and its source |
| Motion | None in the lab: a new value replaces the old one at once. Phase 2's dock rolls numbers as motion.md specifies, and announces the final value once |

**Every range, in any text,** renders as one unbreakable unit with a spoken form:

```html
<span class="whitespace-nowrap"><span aria-hidden="true">142–158</span><span
  class="sr-only">142 to 158</span>&nbsp;fps</span>
```

- **The spoken form,** because screen readers drop or misread the en dash.
- **`whitespace-nowrap` around the range and its unit,** because a browser may break a line after
  an en dash. The mock caught it at 390: "CPU limit: 210–" on one line and "240 fps." on the next.
- **One small formatter** does it for the figure and for any en dash between two numbers inside
  an engine sentence ("recommended 1,000–1,200 W").

## 7. Dates, missing values, loading and errors

| Case | What shows |
|---|---|
| A date | "30 Sep 2026" from `Intl` en-US parts in day, month, year order (backlog item 21), in `<time datetime="2026-09-30">` |
| A value the maker doesn't publish | "Not published", with the data's reason (section 5) |
| The catalogue loading | The results area says "Loading the catalogue." in `type-body text-ink-2`, holding its height (no layout shift), and the picker's selects are disabled. No spinner |
| The catalogue failing to load | "The catalogue didn't load, so the lab can't show results. Reload the page to try again." and a "Reload" button (`min-h-11 rounded-pill border border-ink-3 px-5 type-control text-ink`) |
| A part in the link that the catalogue doesn't have | The codec's existing notice pattern: "The link names a part that isn't in the catalogue, so it was left out." |
| A page whose engine part isn't built yet | Not in the nav; the route answers with the 404 page until its WP lands |

## 8. Page notes

| Page | Layout |
|---|---|
| `/lab/` (the index, `lab/index.html`) | h1 "Engine lab". The sentence: "The engine's answers for real catalogue parts, with their sources." A list of the lab's pages, each a link with one sentence. The catalogue's counts as a `<dl>` (Parts, Prices, Benchmark anchors), read from the loaded catalogue, never typed in |
| `/lab/parts` | A category select and a part select (the shared picker in one-part mode). Then the spec table: Spec, Value, Source. **Values show exactly as stored, with their units** ("5,200 MHz"), so an auditor sees the data itself; converting to "5.2 GHz" is the product's job. Nested fields are indented rows under their parent. Then the prices table: Market, Price, Retailer, As of; a missing price says "No SA price found", with its gap record |
| `/lab/accuracy` | The anchor table: Game, Setting, Hardware, Test system, Measured, Source; E3 adds Model and Error. The coverage grid: games down, chips (or CPUs) across, each cell a count. A zero shows "0" in `text-ink-3` and links to its line in the "Gaps" list under the grid, which gives every empty cell's reason (plan WP-D2) |
| `/lab/compat` | The picker, the summary and the 20 result rows (sections 2 to 5) |
| `/lab/power` | The picker; the breakdown table (Part, Gaming (W), Worst case (W), Source); the two estimated totals; the headroom; the recommended range as a figure ("850–1,000 W") under the label "Recommended power supply" |
| `/lab/games` | The picker and its "Test" group; the readout (section 6) with its limiter, the two limits and its anchors |
| `/lab/creator` | The picker; one block per workload: its name in `type-label`, then its readout or "No estimate yet", then its evidence |
| `/lab/bottleneck` | The picker, a workload and a market; the verdict and "what would help" in `type-body text-ink`; then each rebalanced build as a panel: its title, its swaps, its price with "prices as of", and its checks summary |

**Wide tables** (parts, accuracy, power) sit in a scroll region: `overflow-x-auto`, `p-1` inside
so focus rings survive, `tabindex="0"`, `role="region"` and an `aria-label` naming the table, so
keyboard users can scroll it. The header row is `sticky top-0` on `bg-surface`; the first column
is `sticky left-0` on `bg-surface`, with a `border-r border-line` once scrolled. Column headers
carry the unit ("Measured (fps)"); cells hold numbers only, right-aligned and tabular.

## 9. Accessibility checklist

- **Landmarks:** the header with the lab nav, one `<main>`. **Headings:** h1 per page; h2 for
  "Build" and for each results section; h3 per result row.
- **Every select has a visible `<label>`.** A change is announced once, by the summary's
  `role="status"`.
- **Status:** the word is text; icons are `aria-hidden`; colour is never the only signal.
- **Names, ids, units:** `translate="no"` on part names, rule ids, sockets, chipsets, slot names
  and units (backlog item 20).
- **Targets:** selects and buttons 44 px tall; nav links and the steps summary at least 24 px;
  links inside sentences are exempt (WCAG 2.5.8).
- **Focus:** the 2 px `--focus` ring from `base.css`, never clipped (section 1 and section 8);
  nothing sticky covers it.
- **Forced colours:** check the chips, the confidence mark and the panel borders with Chromium's
  forced-colours emulation.
- **Text spacing and reflow:** no fixed heights on anything that holds text; 320 px wide without
  page scroll.
- **Reduced motion:** the only motion is the steps chevron, and `duration-ui` is 0 under reduced
  motion.

## 10. Tokens and contrast

| Use | Token or role |
|---|---|
| Page | `--stage` (from `base.css`) |
| Panels | `bg-surface`, `border-line`, `rounded-panel` |
| Rule name, part names in selects, action | `text-ink` |
| Reason, labels, link text, the confidence mark | `text-ink-2` |
| Rule id, dates, conditions, hints, "Not checked" | `text-ink-3` |
| Status chips | `text-ok`, `text-warn`, `text-block`, on `--surface` only |
| Select borders, the reload button's border | `border-ink-3` (the control-border token) |
| The marker's dashed border | `--line`: decoration, the words carry the meaning |
| Sentences that can wrap | `max-w-measure`, the one new token (tokens.md §2.5) |

**No new colour pair.** Every text and UI pair above is already in `contrast.mjs` and passes in
both themes: `--ink`, `--ink-2` and `--ink-3` on `--surface`; the three states on `--surface`; the
focus ring on `--surface` and `--stage`; `--ink-3` control borders on `--surface`. The lab never
puts a state colour on the stage. `node docs/design/tools/contrast.mjs --check` exits 0.

## 11. Evidence: the mock

`node docs/design/tools/lab-mock.mjs` builds [`mocks/lab/`](mocks/lab/index.html) with Vite and
Tailwind through the app's own CSS wiring, then shoots and checks it. Results on 2026-10-02,
Chromium 141 (Playwright 1.56.1), in the design-lead worktree
`artifacts/screenshots/phase-1/WP-DS2/lab-mock/`:

| Check | 390 | 768 | 1440 |
|---|---|---|---|
| axe-core, QA's tags plus `wcag22aa`, dark and light | 0 violations | 0 violations | 0 violations |
| Horizontal page overflow | 0 px | 0 px | 0 px |
| Console errors and warnings | 0 | 0 | 0 |
| Longest reason line | 47 characters | 67 characters | 67 characters |

- **Every class the spec names compiles:** 134 classes, none missing from the build.
- **Forced colours** (`1440-forced-colors.png`): every chip keeps its silhouette, the confidence
  mark keeps filled against hollow bars, and every panel and select keeps its border.
- **What the mock changed in this spec:** the reading measure (`65ch` set 83 characters), the
  can't-verify icon (section 3), container queries for the row and its evidence (sections 4 and
  5), unbreakable dates and ranges, the select's ellipsis, and one span for the steps summary.

## 12. Known gaps

- **The mock is static.** It shows the frame, the picker, six result rows and a readout with real
  catalogue values. The rows' outcomes and the readout's numbers are illustrative, and the page
  says so.
- **Several drives** depend on build-lead's answer on the build model (copy-guide.md §14).
- **The field label map** for `/lab/parts` and the evidence list is build-lead's to write and
  design-lead's to review, with the engine strings.
- **The Phase 2 dock** reuses the readout at a smaller size. Its spec is Phase 2 work, with
  backlog item 44 as its rule.
