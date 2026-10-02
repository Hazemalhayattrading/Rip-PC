# Phase 2 components: the rules with no other home (WP-DS2)

Owner: design-lead · Date: 2026-10-03 · Status: ready for review · Built in Phase 2

These are the Phase 2 rules that no other spec holds yet. They come from backlog items 4, 9, 24,
41, 42, 43, 47, 48 and 49 ([backlog.md](backlog.md)), and from QA's finding on the focus after a
page change (QA-P1-001).
- Colours, type roles and sizes are the shipped tokens ([tokens.md](tokens.md)). There is no new
  token and no new colour pair.
- Every class named here compiles with Tailwind 4.3.3 against the shipped tokens (the app's own
  compile, 2026-10-02 and 2026-10-03).
- Measurements give their method and date. The scripts are in the design-lead worktree,
  `artifacts/screenshots/phase-1/WP-DS2/ui-designer-batch2/scripts/` (git-ignored).

---

## 1. Hit areas

**The rule** (WCAG 2.2 SC 2.5.8; ui-ux-pro-max `touch-target-size`; backlog item 4):
- **24 × 24 px is the floor**, for every target, everywhere ([tokens.md §2.5](tokens.md#25-layout)).
- **Under `pointer: coarse`, every target is at least 44 × 44 px** (Tailwind's `pointer-coarse:`).
  This is the primary pointer: a laptop with a touch screen and a trackpad stays at 24 px.
- **The hit area may be bigger than the drawing.** The control keeps its drawn size, and an
  invisible extension makes up the rest, so a phone shows the same design as a desktop.

**The extension: one technique**, a centred box of `max(100%, 2.75rem)`. Every Studio control
drawn at 24 px or more gets it on touch screens only:

```html
<button class="relative pointer-coarse:after:absolute pointer-coarse:after:top-1/2
  pointer-coarse:after:left-1/2 pointer-coarse:after:size-[max(100%,2.75rem)]
  pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2">…</button>
```

A target drawn under 24 px also needs the floor on every pointer. Two do: the "Sources" links at the
end of a caption line, in the dock and in the Specs panel's footer. They take `relative
after:absolute after:top-1/2 after:left-1/2 after:size-[max(100%,1.5rem)] after:-translate-x-1/2
after:-translate-y-1/2 pointer-coarse:after:size-[max(100%,2.75rem)]`.

- **Why a centred `max()` box, and not `after:-inset-1`.** An absolutely positioned box sits inside
  its container's border, in the padding box.
  - On a 36 px round button with a 1 px border, `after:-inset-1` makes a 42 px box, not 44, and
    taps 3 px outside its right and bottom edges missed.
  - The centred box is 44 px whatever the border.
  - design-lead probed it in the lab mock: on touch, all four edges answer a tap 3 px outside the
    button; on a desktop, none do. The probe is `toggle.edgesHitAt3pxOutside` in
    `docs/design/tools/lab-mock.mjs` (QA-P1-003).
- **How it works.** `after:` creates the pseudo-element: Tailwind 4.3.3 emits
  `content: var(--tw-content)`, an empty string by default. The extension belongs to the control,
  so a tap on it is a tap on the control.
- **The size.** `max(100%, …)` leaves a control that is already big enough alone. With the classes
  behind `pointer-coarse:`, a desktop gets no pseudo-element at all.
- **Never on a control that clips** (`overflow-hidden`, `truncate`, `line-clamp-*`): it would clip
  its own extension. Clip a child instead.
- **Extensions use `after:`.** On a control, `before:` is motion.md's hover overlay ("Studio: rules
  for Phase 2", §1). On a part row, it draws the selected bar.
- **Extensions never overlap another target, or its extension.** Two neighbours need a gap at
  least as big as their two extensions on that side. Where the gap can't grow, the drawn control
  grows instead.

**Every Studio control**

| Control | Drawn | Hit, fine pointer | Hit, coarse pointer | How |
|---|---|---|---|---|
| Primary and secondary buttons | `min-h-control` (48 px) in the dock; `min-h-11` (44 px) in panels and in the phone dock | the button | the button | — |
| Round icon buttons: the top bar, and the stage's 3D tools from md | `size-10` (40 px) | 40 px | 44 px | the extension |
| Round icon buttons: the dock's stepper, and the 3D tools on phones | `size-control-sm` (36 px) | 36 px | 44 px | the extension, with the buttons `gap-2` (8 px) apart |
| Pill segments (SAR and USD; View: List and Specs) | `min-h-chip` (30 px) tall, at least 44 px wide, in a 36 px pill | the segment | 44 px tall | the extension |
| Filter and sort chips | `min-h-chip` (30 px) | 30 px | 44 px | the extension; chip rows `gap-1.5 pointer-coarse:gap-y-3.5` |
| The compare checkbox | an 18 px box inside a `size-6` (24 px) button | 24 px | 44 px | the extension |
| A part row | the row, 64 px or taller | the row | the row | — |
| Standalone links | `inline-flex min-h-6 items-center pointer-coarse:min-h-11` | 24 px tall | 44 px tall | their own box (section 4) |
| A small link in a line it must not grow (the "Sources" links of the dock and of the Specs footer) | the text | 24 px | 44 px | the extension |
| The sheet's expand button | full width, `min-h-11` | 44 px | 44 px | its own box (section 8) |
| The lab's selects | `min-h-11` | 44 px | 44 px | [lab-spec.md §2](lab-spec.md#2-the-part-picker) |

- **The chip rows' gap:** two wrapped rows of 30 px chips 6 px apart would overlap their 44 px
  extensions by 8 px. A 14 px row gap leaves none.
- **The phone's 3D tools:** the mock sets them 6 px apart. At 36 px each, their 44 px extensions
  would overlap by 2 px, so they are 8 px apart.

## 2. Buttons and their states

**The kinds** (the Studio mock, set in the tokens' roles):

| Kind | Where | Size | At rest | Toggled on (`aria-pressed="true"`) |
|---|---|---|---|---|
| Primary | "Next: Motherboard" in the dock; one per view ([tokens.md §2.1](tokens.md#21-colour), rule 9) | `min-h-control px-5`; the phone dock `min-h-11` | `bg-action text-action-ink type-name rounded-pill` | — |
| Secondary | "Compare 2" in the dock; "Clear filters"; "Reload" | `min-h-control px-5` in the dock, `min-h-11 px-5` in panels | `border border-ink-3 text-ink type-control rounded-pill` (as the lab's Reload) | — |
| Round icon button, floating | the top bar; the stage's 3D tools | `size-10`, or `size-control-sm` on phones | `bg-surface border border-line shadow-float rounded-pill text-ink-2` | `aria-pressed:border-ink-3 aria-pressed:text-ink` |
| Round icon button, in a panel | the dock's stepper | `size-control-sm` | `border border-line rounded-pill text-ink-2` | — |
| Pill segment | SAR and USD; View: List and Specs | `min-h-chip px-3.5` | `text-ink-2 type-control rounded-pill` | `aria-pressed:bg-action aria-pressed:text-action-ink` |
| Chip | the rail's filters and sorts | `min-h-chip px-3 gap-1.5` | `border border-line text-ink-2 type-control rounded-pill whitespace-nowrap` | `aria-pressed:border-ink-3 aria-pressed:bg-surface-raised aria-pressed:text-ink` |

- A chip's label identifies it as a control, so its border at rest may be `--line`. Its pressed
  state is the `--ink-3` border (tokens.md §2.1, rule 5), the raised fill and the strong ink.
- **The primary label is `type-name` (500).** The mock sets it at 600, but tokens.md §2.4, rule 2,
  keeps 600 for headings and labels.
- Icons: 18 px (`size-4.5`), `aria-hidden="true"`, in `currentColor`. The colour class goes on the
  button, never on the `<svg>`, so the icon follows forced colours (tokens.md §2.1, rule 12).

**The states**

| State | How it shows | Notes |
|---|---|---|
| Rest | the kind's classes | — |
| Hover | An overlay layer fades its opacity. No colour animates | [motion.md](motion.md), "Studio: rules for Phase 2", §1 owns it (backlog item 10). Tailwind 4.3.3 wraps `hover:` in `@media (hover: hover)`, so touch screens never stick in it |
| Pressed, while held | motion.md, the same part, §2 (backlog item 11) | — |
| Focus | The 2 px `--focus` ring from `base.css`, offset 3 px. Never inset on `--action` (tokens.md §2.1, rule 6) | WCAG 2.4.7 |
| Toggled on | `aria-pressed="true"` and the classes above | The attribute is the state, so screen readers announce it |
| Disabled | Below | — |
| Forced colours | Toggled on: `forced-colors:aria-pressed:bg-[Highlight] forced-colors:aria-pressed:text-[HighlightText]`. Everything else: tokens.md §2.1, rule 12 | — |

**Disabled** (backlog item 9; ui-ux-pro-max `disabled-states`):
- **Which attribute.**
  - `disabled`, the native attribute, for a control that can't be used yet, needs no
    explanation, and comes back by itself. Examples: the lab's selects while the catalogue loads
    ([lab-spec.md §7](lab-spec.md#7-dates-missing-values-loading-and-errors)), and the compare
    checkbox of an incompatible part ([specs-view.md §3](specs-view.md#3-rows)). A disabled control
    leaves the tab order.
  - `aria-disabled="true"` for a control the visitor must still reach and hear about. It stays in
    the tab order, and activating it announces why it does nothing.
  - **Prefer neither.** A control that can do nothing useful is better left out, or explained in
    words. Phase 0's first step has no "Previous" link, rather than a disabled one.
- **The look comes from a utility, not from `base.css`.** `disabled:opacity-40` for `disabled`, and
  `aria-disabled:opacity-40` for `aria-disabled`, on the control itself. Its label, border and icon
  then fade together. The opacity is 0.4 (the mock's 0.35 is replaced). `base.css` already gives
  both the not-allowed cursor.
  - `base.css` has no opacity rule on purpose: a rule on `[aria-disabled='true']` would also fade a
    blocked part's row, which must not fade (below).
- **No hover and no pressed movement** on a disabled control. Write hover classes as
  `enabled:hover:…` and `not-aria-disabled:hover:…`. motion.md's pressed rule skips disabled
  controls too.
- **Contrast.** WCAG 1.4.3 and 1.4.11 exempt inactive components. This is the only place where text
  fades with opacity (tokens.md §2.1, rule 3).
- **Forced colours.** Opacity survives forced colours (measured, tokens.md §2.1, rule 12), so a
  disabled control stays faded there and needs nothing more.
- **A blocked part is not disabled.** Its row keeps full opacity: the name in `--ink-2`, the price in
  `--ink-3`, the reason in `--ink-2` with its rule id in `--ink-3`. Its radio carries
  `aria-disabled="true"` for the meaning ("unavailable") and the cursor only. It never takes
  `aria-disabled:opacity-40` (section 7).

**Accessible names** (backlog item 43):
- An icon-only control takes its name from visually hidden text inside it, such as
  `<span class="sr-only">Share build</span>`. The name is then ordinary text: Chrome's translation
  and `translate="no"` treat it like the visible text.
- **Never `aria-label` on an element without a role,** such as a `<span>` or a `<div>` (axe
  `aria-prohibited-attr`).

## 3. The theme toggle

Backlog item 48. The round button at the end of the top bar. Its behaviour is unchanged
([tokens.md §1.3](tokens.md#13-the-theme-switch)): the fixed name "Light theme", `aria-pressed`,
`localStorage` and `theme-color`.

```html
<button type="button" aria-pressed="false" class="relative grid size-10 place-items-center
  rounded-pill border border-line bg-surface text-ink-2 shadow-float
  aria-pressed:border-ink-3 aria-pressed:text-ink
  forced-colors:aria-pressed:bg-[Highlight] forced-colors:aria-pressed:text-[HighlightText]
  pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2
  pointer-coarse:after:size-[max(100%,2.75rem)] pointer-coarse:after:-translate-x-1/2
  pointer-coarse:after:-translate-y-1/2">
  <svg class="size-4.5" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="9" r="3"/>
    <path d="M9 1.25V3M9 15v1.75M1.25 9H3M15 9h1.75M3.52 3.52l1.24 1.24M13.24 13.24l1.24 1.24
             M3.52 14.48l1.24-1.24M13.24 4.76l1.24-1.24"/>
  </svg>
  <span class="sr-only">Light theme</span>
</button>
```

- **The icon is a sun, not the mock's crescent.** The name is "Light theme" in both themes, so the
  icon shows what the button turns on and never swaps with the state. A crescent that turned into
  a sun would contradict the name half the time.
  - Drawn to the iconography rules ([direction.md §4](direction.md#motion-iconography-3d-2)): an
    18 px grid, a 1.75 px stroke, round caps and joins.
  - The rays start 1.25 px clear of the disc, so the drawing stays open at 1×.
- **States** are section 2's floating round button: at rest `text-ink-2` and the `--line` border;
  with light on, `text-ink` and the `--ink-3` border. Hover and press come from motion.md.
- **The focus ring** sits on the stage: `--focus` on `--stage`, 18.43:1 in dark and 16.87:1 in light.
- **It stays in the top bar at every width.** The mock hides Share on phones, never the theme.
- **Phase 0's text button becomes this one.** Its words move into the `sr-only` span, so its name is
  unchanged, and the e2e tests that find it by name keep working.

## 4. Standalone links

Backlog item 49. A link that is not inside a sentence is a target of its own (WCAG 2.2 SC 2.5.8).
This covers:
- the site nav, the build steps, Previous and Next;
- the wordmark;
- the lab nav ([lab-spec.md §1](lab-spec.md#1-the-frame)).

Links inside sentences are exempt (the inline exception). That includes the source links of the
evidence list.

| Where the link sits | Classes | Hit area |
|---|---|---|
| In its own row or list | `inline-flex min-h-6 items-center pointer-coarse:min-h-11`; a wrapping list `gap-x-4 gap-y-3` | 24 px tall, and 44 on touch. The text stays centred in the box, so only the box grows |
| In a line it must not grow: "Sources" after "Prices as of 30 Sep 2026", in the dock and in the Specs footer | section 1's extension | 24 px, and 44 on touch. The caption keeps its 16 px line |
| Styled as a control: the dock's Next, the stepper's round Previous and Next | that control's size and extension (sections 1 and 2) | as the control. It stays an `<a>`, because it navigates |

- **Underlines.** Links in text keep `base.css`'s underline. Nav links drop it (`no-underline`), and
  the current one says so twice: with `aria-current="page"` (`"step"` in the build steps), and with
  a 2 px `--ink` underline at a 6 px offset. The classes are `aria-[current=page]:underline
  aria-[current=step]:underline decoration-ink decoration-2 underline-offset-6`.
- **Phase 0's placeholder links are 22 px tall,** the height of their line. They take these classes
  in Phase 2.

## 5. The skip link

Backlog item 47. It is the first focusable element of every page, before the top bar. It is
visually hidden until it has focus, but always in the accessibility tree.

```html
<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-toast
  focus:top-[max(var(--gutter),var(--safe-top))] focus:left-[max(var(--gutter),var(--safe-left))]
  focus:inline-flex focus:min-h-control-sm focus:items-center focus:rounded-pill focus:border
  focus:border-line focus:bg-surface focus:px-4 focus:type-control focus:text-ink
  focus:no-underline focus:shadow-float">Skip to main content</a>
```

- **The order holds.** In Tailwind 4.3.3's output, `focus:not-sr-only` comes before `focus:fixed`
  and `focus:px-4`, so those win over its `position: static` and `padding: 0` (checked with the
  app's compile).
- **`focus:`, not `focus-visible:`.** Only the keyboard reaches the link, and it must show whenever
  it has focus.
- **Placement and layer.** It sits at the top left, `--gutter` from the edges, or at the safe area
  if that is larger. `z-toast` puts it above the top bar (10) and an open sheet (20).
- **Contrast.**
  - The ring is `base.css`'s, on the stage around the pill: `--focus` on `--stage`, 18.43:1 in dark
    and 16.87:1 in light.
  - The text is `--ink` on `--surface`: 16.13:1 and 18.74:1.
- **Forced colours** drop the fill and keep the 1 px border (tokens.md §2.1, rule 12).
- **No motion.** It appears at once.
- **Activating it moves focus to `<main id="main" tabindex="-1">`**, the target SiteLayout already
  has.
  - The click handler calls `event.preventDefault()`, then `main.focus()`, so the address never
    gains `#main`: the URL is the share link ([specs-view.md §1](specs-view.md#1-where-it-lives)).
  - Without script, the `href` still works.
- **`<main>` takes `focus-visible:outline-none`.** It is a landing point, not a control (WCAG 2.4.7
  covers operable components), and a ring around the whole page would point at nothing. The next Tab
  lands on its first control, which shows its ring.

## 6. Focus on a page or step change

QA-P1-001 (a Major for build-lead). Today SiteLayout focuses `<main>` after in-app navigation, and
the browser scrolls only as far as it must. QA measured two cases on the live site (`27dbc6e`),
Chrome 151 at 1440 px:
- from the home page, "Start a build" lands at `scrollY` 178, with the header and the site nav above
  the viewport;
- from a scrolled step (`scrollY` 244), "CPU" keeps `scrollY` 244, and the new `<h1>` sits off
  screen, at −66 to −6 px.

QA's screenshots are in the QA worktree, `artifacts/screenshots/phase-1/WP-Q4/nav-check/`. Its
regression test is `tests/e2e/navigation.spec.ts` on `feat/qa-phase1-verification`.

**The rules.** QA tests rules 1 to 3, and build-lead's fix for QA-P1-001 follows them.
1. **A route change** is a link to another page or step. The window scrolls to the top at once,
   with `window.scrollTo(0, 0)`. It never scrolls smoothly, with or without reduced motion. Then
   focus moves to the new page's `<h1 tabindex="-1">`, with `h1.focus({ preventScroll: true })`.
   At that moment the header, the site nav and the `<h1>` are on screen, at every width.
2. **Back and Forward.** The browser restores the scroll position (`history.scrollRestoration`
   stays `auto`). Focus goes to the `<h1>` with `preventScroll: true`, so the restored position
   holds.
3. **In-page changes** move nothing: no scroll and no focus. These are a filter, a sort, a picked
   part, the market and the theme. Where they change the URL, they use `replaceState`, and the
   page's live region speaks. A change of path is a route change; a change of the query only (`b`,
   `view`, `sort`, `filter`) never is. The first load moves nothing either.
4. **Why the `<h1>`, not `<main>`.** The heading announces the new page's name, which is the most
   useful thing to hear. Focusing a whole region can make a screen reader read all of it.
5. **The `<h1>`'s focus ring follows `:focus-visible`,** so keyboard users see it and mouse users
   don't. It is `base.css`'s ring, which is measured on the stage.
6. **Phase 2's Studio frame never scrolls the window.**
   - On a step change, the rail's scroll container goes to its top (`scrollTop = 0`), or the
     sheet's below lg. The Specs table's container goes to its top too.
   - Then focus goes to the step's `<h1>`: on the stage from md, and in the sheet's header below md.
     Where the layout needs the heading in two places, the hidden copy is `display: none`
     (`md:hidden` or `max-md:hidden`), and focus goes to the copy for which `checkVisibility()`
     returns true.
   - The top bar is fixed, so the `<h1>` takes `scroll-mt-topbar`. A later scroll into view (a
     screen reader's cursor, a zoomed viewport) then never hides it under the bar (WCAG 2.4.11).
   - The camera's move to the new part is the stage's own motion ([motion.md](motion.md)).
     Nothing scrolls on the fixed stage.
7. **WCAG.**
   - 2.4.3, Focus Order: focus starts at the new content. It never falls back to `<body>`, which
     would send the next Tab to the skip link and the top bar again. From the `<h1>`, Tab moves
     through the step's rail (the view switch, the chips, the list), the stage's 3D tools, then the
     dock, which is the order the step reads.
   - 2.4.11, Focus Not Obscured: at that moment the `<h1>` is clear of the chrome at every width
     (section 9's zones). At lg and md it sits on the stage, below the top bar (104 px from the top
     at lg and 84 px at md, against a 68 px bar). Below md it sits in the sheet's header, below the
     380 px stage and above the 76 px dock.
   - 2.4.2, Page Titled: the document title changes with the page (the route table).

**The step's `<h1>`** reads as the route table's heading, "Step 4 of 12: Motherboard". The label
line ("Step 4 of 12", `type-small text-ink-3`) and the step's name (`type-display`) are one `<h1>`,
with a visually hidden colon between them.

## 7. The part list: a single-select radiogroup

Backlog items 42 and 43. The rail's list of parts, in Phase 2. This replaces the Studio mock's rows,
which use `role="option"` with no listbox and put a checkbox inside each option (QA DS0-02, DS0-04;
axe `aria-required-parent` and `nested-interactive`).

**Why three zones per row.** axe-core 4.13.0, the installed version, defines the two roles this way:
- **`radio` has `childrenPresentational: true`.** Everything inside a radio is flattened into it, so
  nothing interactive may sit inside: not the compare checkbox, and not the button that opens a
  price's source.
- **`radiogroup` has no required owned elements.** So the group may hold other things beside its
  radios: each row's compare checkbox and figures button, and the "Won't fit your AM5 board"
  divider before the blocked rows.

So each row is three siblings: **compare | radio | figures.** The figures button keeps "every number
links to its source" (BUILD_PROMPT §9) without putting a control inside the radio.

**Markup** (one row; the ids are per part):

```html
<div role="radiogroup" aria-labelledby="rail-title">
  <div class="relative grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-x-3 rounded-row
              py-2.5 pr-2.5 pl-3">
    <div role="radio" aria-checked="true" tabindex="0"
         aria-labelledby="name-9800x3d"
         aria-describedby="state-9800x3d figures-9800x3d spec-9800x3d why-9800x3d"
         class="col-start-2 row-start-1 after:absolute after:inset-0 after:rounded-row">
      <div id="name-9800x3d" class="type-name line-clamp-2" translate="no">AMD Ryzen 7 9800X3D</div>
      <div id="spec-9800x3d" class="type-small text-ink-3">8 cores, 5.2 GHz, 120 W</div>
      <div id="state-9800x3d" class="…">(the warn icon) Fits, with a warning</div>
      <div id="why-9800x3d" class="type-small text-ink-2 max-w-measure">The AMD Ryzen 7 9800X3D
        needs BIOS 2613 or later on the ASUS TUF GAMING B650-PLUS WIFI, … <span
        class="whitespace-nowrap text-ink-3">Rule <span translate="no">bios-version</span></span></div>
    </div>
    <button type="button" role="checkbox" aria-checked="true" tabindex="0"
            class="relative col-start-1 row-start-1 grid size-6 place-items-center …">
      (the 18 px box)
      <span class="sr-only">Compare <span translate="no">AMD Ryzen 7 9800X3D</span></span>
    </button>
    <button type="button" aria-haspopup="dialog" aria-expanded="false" tabindex="0"
            class="relative col-start-3 row-start-1 text-right …">
      <span id="figures-9800x3d">SAR 1,899 … 96–108 fps …</span><span class="sr-only">, sources</span>
    </button>
  </div>
  …
</div>
```

- **The whole tile selects.** `after:absolute after:inset-0` stretches the radio over the row. The
  checkbox and the figures button come later in the DOM and are `relative`, so they paint above the
  stretched layer and take their own clicks and taps. No z-index is needed ([tokens.md
  §2.5](tokens.md#25-layout): never a raw z-index number).
- **The grid puts the checkbox first on screen;** the DOM order (radio, checkbox, figures) is the
  focus order.
- **The look** follows tokens.md §2.1, rule 8. The selected row is `--surface-raised`, with the 3 px
  `--ink` bar drawn by `before:` on the row, and its forced-colours bar is
  `forced-colors:before:bg-[Highlight]`.
- **Hover** is motion.md's overlay ("Studio: rules for Phase 2", §1). The row adds `isolate`, and
  the radio's stretched `after:` layer carries the overlay, under the row's text. It shows only
  while the radio is hovered, not the compare checkbox or the figures button.
- **Selecting is instant** (motion.md, rule 2). The part seats in 3D and the dock's numbers follow.

**Keyboard**

| Key | Where | Does |
|---|---|---|
| Tab | into the list | Goes to the roving row. It starts at the selected part (the first row when nothing is selected), then follows focus |
| Tab, Shift + Tab | from a row | To that row's compare checkbox (unless it is disabled), then its figures button, then out of the list; back the same way |
| Down or Right, Up or Left | on a row | Focus to the next or previous row. **The selection doesn't change.** It stops at the ends, with no wrap |
| Home, End | on a row | The first or last row |
| Page Down, Page Up | on a row | 10 rows down or up, as in the Specs grid |
| Space, Enter | on a row | Selects the part (`aria-checked="true"`). On a blocked row nothing is selected, and the rail's live region says "{display name} is incompatible. {reason}" |
| Space | on the compare checkbox | Adds or removes the part. A fourth part gets "Compare holds 3 parts. Remove one first." ([specs-view.md §6](specs-view.md#6-keyboard-and-screen-readers)) |
| Enter, Space | on the figures button | Opens the source popover. Escape closes it, and focus returns to the button |

- **Moving focus never selects.** A selection seats a part in 3D and changes the dock's numbers, so
  selecting on every arrow press would turn browsing into noise. Focus therefore moves without
  selecting, as WAI-ARIA allows for a listbox. A screen reader still says "not checked" on each row.
  Nothing changes on focus (WCAG 3.2.1).
- **The roving row.** Only the roving row's radio, compare checkbox and figures button have
  `tabindex="0"`; every other row's three have `-1`.
  - Moving focus to a row, by an arrow or by clicking one of its controls, makes it the roving row.
  - So the list costs at most three tab stops, never three per part. A screen reader's browse mode
    still reaches every checkbox.
- **After a sort or a filter,** focus stays on the same part. If a filter hides that part, focus
  moves to the first row ([specs-view.md §4](specs-view.md#4-sorting-and-filtering), rule 4).

**Names and descriptions** (backlog item 43)
- **The group** is named by the rail's title (`aria-labelledby`).
- **The radio.** Its name is the part's display name (`aria-labelledby`). Without it, the radio would
  take its name from everything inside it.
  - Its description is the state word, the figures, the spec line and the reason with its rule id
    (`aria-describedby`, in that order).
  - A blocked row adds `aria-disabled="true"`, so it is announced as unavailable. It stays in the
    arrow-key order, so its reason can be heard, and it is not faded (section 2).
- **The compare checkbox** is named "Compare {display name}" in visually hidden text.
- **The figures button** is named by its visible figures, then a visually hidden ", sources". The
  visible text comes first, so voice control works by what is on screen (WCAG 2.5.3).
- **The confidence mark** is `aria-hidden="true"`, beside its word as real text: "Medium confidence",
  or "Medium" with " confidence" visually hidden where space is short. It never uses `aria-label`
  on a `<span>`.
- **Every estimate in a row** carries its confidence word and mark, and the list states the test
  conditions and "Estimates" once above the rows, as the Specs view does (CLAUDE.md rule 2;
  [specs-view.md §5](specs-view.md#5-numbers-and-sources)). The mock's rows show neither. Where
  they sit in the tile is for the Phase 2 mock to draw.
- **Other mock fixes.** The stage's `<div aria-label="Build view">` has no role, so the label is not
  allowed. The stage becomes a `<section>` named by visually hidden text, or it takes no name. The
  mock's confidence span loses its `aria-label` (above).

**Up to 80 rows:** see [specs-view.md §3](specs-view.md#3-rows). The list's rows take
`content-visibility: auto`.

## 8. The phone sheet's expand button

Backlog item 24, the sheet part; the 3D orbit's alternatives are in the 3D brief. Below lg the rail
is a sheet under the stage. Dragging the sheet up collapses the stage to a 96 px strip
([direction.md §4](direction.md#layout-2)). A drag needs a single-pointer alternative (WCAG 2.2 SC
2.5.7), and the keyboard needs one too. That alternative is a button.

- **The button is the sheet's top edge.** It spans the sheet's full width at `min-h-11` (44 px), and
  holds the handle: a 40 × 4 px bar, `rounded-pill bg-ink-3`, centred, 8 px from the top.
  - **The handle is `--ink-3`, not the mock's `--line`.** It is now the visible part of a control,
    so it needs 3:1 (WCAG 1.4.11). `--ink-3` on `--surface` is the measured control-border pair:
    6.77:1 in dark and 6.52:1 in light.
  - **Forced colours:** `forced-colors:bg-[CanvasText]`, because a background would vanish.
- **The markup:** `<button type="button" aria-expanded="false" aria-controls="rail">`, with the
  visually hidden name "Parts list". The name says what the button opens. Only `aria-expanded`
  changes; the name doesn't (the WAI-ARIA disclosure pattern).
  - **Collapsed:** the stage at full height (380 px on phones, 560 at md), with the sheet under it.
  - **Expanded:** the stage is the 96 px strip, and the sheet fills the rest.
- **A click or a tap toggles it, and the drag still works.** A press that moves less than 8 px
  before it lifts is a tap. A longer one is a drag: the sheet follows the finger, and settles on the
  nearer state when released.
- **Keyboard.**
  - Enter and Space toggle it, because it is a button.
  - Escape collapses the expanded sheet and moves focus to the button, when nothing inside the sheet
    is open. An open popover closes first.
- **Focus stays on the button** after a toggle. The sheet's content is next in the tab order.
- **Opening the Specs view below lg expands the sheet** ([specs-view.md §1](specs-view.md#1-where-it-lives)),
  and the button then says `aria-expanded="true"`. Collapsing it keeps the view, and the table
  scrolls in the shorter sheet.
- **Scrolling** (backlog items 1 and 7).
  - The sheet is its own scroll container, `overflow-y-auto overscroll-contain`: a fling at its end
    neither scrolls the stage nor reloads the page.
  - Its header (this button, the step's title and the chips) sits outside the scroller.
  - The dock floats over the sheet's end, so the scroller takes the dock's scroll padding
    (tokens.md §2.5).
- **Motion.** The sheet and the strip move by `transform` only, with motion.md's values. Under
  reduced motion they switch at once.
- **At lg** there is no sheet and no button: the rail stands beside the stage.

## 9. Text zones in the Studio frame

Backlog item 41. Text on the stage sits only where the contrast table has measured it: on the wall,
on the key light and on the floor ([tokens.md §2.1](tokens.md#21-colour), rule 4). The build is
never behind it. So the frame reserves **text zones**, and the camera frames the build outside them,
with its view offset ([studio-3d-brief.md §3.1](studio-3d-brief.md#31-camera)).

**The rules**
- **A text zone** is the box of an element that sets text or controls on the stage, plus a 24 px
  clearance on each side that faces the build.
- **The build frame** is the stage minus the zones and the chrome panels (the top bar, the rail, the
  dock, the sheet). The build stays inside it: its bounding box, its floor shadow and its glow.
- **The zones are measured, not typed in.** The frame reads the boxes of the heading block and the
  tools row, with a `ResizeObserver` on each, and passes the free rectangle to the camera. The
  tables below give the expected values at the reference sizes, for tuning and for QA.
- **The Studio frame never scrolls the window** (section 6), so nothing ever slides under the top
  bar's text, and the bar stays clear, as in the mock.
- **Callouts** are `--surface` panels, so they may sit over the stage, but never over a zone or a
  control.
- **Small text in a zone that reaches the floor is safe.** `--ink-3` holds 4.61:1 at the floor's near
  edge (DS0-01). State colours never sit on the stage (tokens.md §2.1, rule 2).
- **Safe areas** are inside the measurement: with `viewport-fit=cover`, the top bar is
  `calc(var(--topbar) + var(--safe-top))` tall, and the zones move with it.

**lg and up.** The fixed frame, for a viewport W × H; worked at 1440 × 900.

| Zone | What it holds | Left | Top | Right | Bottom | At 1440 × 900 |
|---|---|---|---|---|---|---|
| Top bar | the wordmark, the build's name, the pills, the round buttons | 0 | 0 | W | `--topbar` | 0–1440 × 0–68 |
| Heading | "Step 3 of 12", the step's `<h1>`, the hint | 0 | `--topbar` | `--inset` + 24rem + 24 px | `--topbar` + 36 px + the block + 24 px | 0–448 × 68–260, or 68–320 with a two-line name |
| 3D tools | the tools row and its caption | 0 | H − (`--dock` + 2 × `--gutter`) − 40 px − 24 px | `--inset` + 24rem + 24 px | H − `--dock` − `--gutter` | 0–448 × 712–792 |
| The rail (a panel) | the parts | W − `--gutter` − `--rail-width` − 24 px | 0 | W | H | from 976 |
| The dock (a panel) | the readouts | 0 | H − `--dock` − `--gutter` − 24 px | W | H | from 768 |

- **The build frame at 1440 × 900** is x 448–976 (528 px) by y 92–768 (676 px).
- **The heading block** is at most 24rem wide. That fits the longest word of every step's name:
  "Motherboard" is 359 px in `type-display` at 56 px (measured in Rig Lab Sans, Chromium 141).
  - Four names take two lines: "Memory (RAM)", "Graphics card (GPU)", "Power supply (PSU)" and
    "Fans and looks".
  - Its height: the label line (18 px), 2 px, the name (60 px a line), 8 px, and the hint (22 px a
    line). That is 132 px, or 192 px with a two-line name.
- **The hint** takes at most two lines: about 90 characters. The mock's hint is 64 characters, and it
  takes two lines at 22rem (measured).
- **The tools row** is five 40 px buttons, 8 px apart (232 px), `--inset` from the left and 16 px
  above the dock. A caption beside it ends inside the zone.
- **Phase 3 grows the tools zone in two ways** (design-lead, 2026-10-03; the frame re-measures the
  zone's box, so the camera follows):
  - **"Spin fans"** joins the row when the build has a fan ([motion.md, Studio rules
    §6](motion.md#studio-rules-for-phase-2)): six buttons, 280 px, which fit the zone at lg
    (384 px) and at md (352 px).
  - **The orbit pad** ([studio-3d-brief.md §3.1](studio-3d-brief.md#31-camera)) opens as one row
    of six buttons directly above the tools row, 8 px from it, in the order Turn left, Turn right,
    Tilt up, Tilt down, Zoom in and Zoom out. The zone grows 48 px upward while the pad is open.
  - **On phones** six 36 px buttons need 256 px, more than the 124 px tools zone, so the pad wraps
    into two rows of three, and the zone grows 88 px upward. "Spin fans", if a phone shows it at
    all, is the Phase 3 mock's call.
- **When the viewport is narrow,** from 1100 to about 1280 px, the space beside the heading is narrow:
  only 188 px wide at 1100 × 800. Then the build is framed below the heading instead: x from
  `--inset` to the rail's clearance, and y from the heading zone's bottom to the tools zone's top. At
  1100 × 800, with a two-line name, that is x 40–636 by y 320–612. The camera takes whichever of the
  two rectangles shows the build larger.

**md (768–1099).** The stage is 560 px tall, and the sheet starts 36 px above its bottom edge. Worked
at 768 × 1024.

| Zone | Left | Top | Right | Bottom | At 768 × 1024 |
|---|---|---|---|---|---|
| Top bar | 0 | 0 | W | `--topbar` | 0–768 × 0–68 |
| Heading | 0 | `--topbar` | `--inset` + 22rem + 24 px | `--topbar` + 16 px + the block + 24 px | 0–404 × 68–232, or 68–284 with a two-line name |
| 3D tools | 0 | the sheet's top − 16 px − 40 px − 24 px | `--inset` + 22rem + 24 px | the sheet's top | 0–404 × 444–524 |
| The sheet (a panel) | 0 | 560 − 36 px | W | H | from 524 |

- **The build frame at 768 × 1024** is x 404–740 (336 px; `--inset` from the right edge) by y 92–500
  (408 px).
- **The heading block** is 22rem wide here. That fits "Motherboard" at 48 px (308 px), and the same
  four names take two lines. Its height is 124 px, or 176 px with a two-line name.
- **This fixes DS0-01.** The mock's case starts at x 330, inside the heading zone, so the hint's last
  word ran into the case top.

**Phones (below md).** The stage is 380 px tall, and the sheet starts 40 px above its bottom edge.
Worked at 390 × 844.

| Zone | Left | Top | Right | Bottom | At 390 × 844 |
|---|---|---|---|---|---|
| Top bar | 0 | 0 | W | `--topbar` | 0–390 × 0–56 |
| 3D tools | 0 | the sheet's top − 16 px − 36 px − 24 px | `--inset` + 124 px + 24 px | the sheet's top | 0–164 × 264–340 |
| The sheet (a panel) | 0 | 380 − 40 px | W | H | from 340 |

- **There is no heading on the stage.** The sheet's header carries it (direction.md §4).
- **The tools row** is the three tools that stay on phones (orbit, explode, lighting): 36 px each,
  8 px apart, 124 px in all.
- **Two frames are possible.**
  - Beside the tools: x 164–374 by y 80–316 (210 × 236 px).
  - Above them: x 16–374 by y 80–264 (358 × 184 px).
  - For the hero shot, beside the tools shows the case larger (236 px tall against 184). The camera
    chooses per shot.

**In the 96 px strip** (the sheet expanded, or the Specs view open, below lg):
- There is no stage text. The 3D tools hide.
- At md, the step's heading moves into the sheet's header, as on phones. The stage's copy is then
  `display: none`, so focus goes to the visible copy (section 6).
- The strip runs from `--topbar` to `--topbar` + 96 px. The build frame is the strip, 8 px in from
  its top and bottom and `--inset` in from each side.

## 10. Known gaps

- **Written, not drawn.** The Phase 2 mock checks these rules against the real layout: the part
  row's three zones, the confidence word in a row, the strip, and the sheet's handle.
- **Short md viewports.** A landscape tablet (1024 × 768) leaves about 150 px of the sheet visible
  between the stage and the dock, until the sheet is expanded. The Phase 2 mock decides whether md
  needs a shorter stage.
- **The source popover** (the figures button, and the Specs view's number cells) is specified only as
  far as [specs-view.md §5](specs-view.md#5-numbers-and-sources) goes. Its dialog pattern and its
  sizes are Phase 2 work.
- **The keyboard paths** (the radiogroup's roving row, the sheet's button, the skip link, focus on a
  page change) need qa-lead's e2e tests when they are built. QA already has rules 1 to 3 of
  section 6.
