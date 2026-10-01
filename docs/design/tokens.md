# Design tokens: direction C, Studio (WP-DS1)

Owner: design-lead · Date: 2026-10-01 · Status: ready for review

Hazem picked **C, Studio** on 2026-09-30 ([direction.md](direction.md#4-direction-c-studio)). This
document is the contract between design and build:
- what each token is for, and its usage rules;
- the Preflight decision, with what `base.css` gives back;
- how to wire the tokens into the app (section 1, for build-lead);
- why the font loads the way it does, with measured numbers.

| File | What it holds |
|---|---|
| [`src/styles/tokens.css`](../../src/styles/tokens.css) | Raw tokens as custom properties (dark and light), the fonts, and the Tailwind v4 `@theme` mapping and type roles |
| [`src/styles/base.css`](../../src/styles/base.css) | What Preflight removes and Rig Lab needs back (section 3) |
| [`src/styles/motion.ts`](../../src/styles/motion.ts) | The motion tokens for Motion and the 3D scene, in milliseconds and seconds |
| [`src/styles/fonts/`](../../src/styles/fonts/) | `rig-lab-sans.woff2` (72,332 bytes), `OFL.txt`, `FONTLOG.txt` |
| [`src/styles/tokens.test.ts`](../../src/styles/tokens.test.ts) | 96 tests, run by `npm run test` (section 6) |

Every value below is the value in `tokens.css`. If the two ever disagree, `tokens.css` wins, and
this document has a bug.

---

## 1. Wiring (build-lead, WP-B1 part 2)

### 1.1 The Tailwind entry, `src/app/app.css`

```css
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import '../styles/tokens.css';
@import 'tailwindcss/preflight.css' layer(base);
@import '../styles/base.css' layer(base);
@import 'tailwindcss/utilities.css' layer(utilities) source('..');
```

- **`tokens.css` takes no layer.** Tailwind 4.3.3 refuses it inside one: `@custom-variant` and
  `@utility` cannot be nested, and `@import … layer()` nests the whole file. The build fails with
  "`@custom-variant` cannot be nested." A test keeps this rule honest (section 6).
- **The order matters.**
  - `tokens.css` comes after `theme.css`, because it removes Tailwind's default palette, type
    scale, radii, shadows, easings and animations (`--color-*: initial` and so on). Those must be
    declared before they can be removed.
  - `base.css` comes after Preflight, in the same layer, because it restores what Preflight resets.
- **Keep `source('..')`** from the scaffold, so class detection stays inside `src/`.
- **Replace the scaffold's comment.** It says Preflight is left out. Preflight is now on, and
  section 3 explains how `base.css` restores links, headings, focus rings and placeholders.
- The scaffold uses three utilities today (`aspect-4/3 w-full max-w-3xl`, in
  `src/components/garage/GarageSlot.tsx`). All three still work; a test proves it.

### 1.2 `index.html`

```html
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#131416" />
    <link
      rel="preload"
      href="/src/styles/fonts/rig-lab-sans.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <script>
      // Rig Lab opens dark. A visitor's light choice is restored before the first paint.
      try {
        if (localStorage.getItem('rig-lab-theme') === 'light') {
          document.documentElement.dataset.theme = 'light';
          document.querySelector('meta[name="theme-color"]').content = '#f3f3f1';
        }
      } catch {}
    </script>
    …
```

- **The preload.** Vite rewrites the `href` to the hashed file, `/Rip-PC/assets/rig-lab-sans-<hash>.woff2`.
  That is the same file the CSS `url()` points at, so the browser downloads it once.
  - Measured by `tokens-check.mjs` with the app's base `/Rip-PC/`: `preloadRewrittenToSameAsset:
    true`, `cssReferencesHashedFont: true`, `fontIdenticalToSource: true`.
  - **`crossorigin` is required.** Fonts are always fetched in CORS mode. A preload without it is
    not reused, and the font downloads twice.
  - Preload only this one file. It is the only font Rig Lab ships.
  - Every route page the build writes is the built `index.html` with its own title and
    description (`scripts/vite/static-route-pages.ts`), so each keeps the preload and the theme
    script. After wiring, look at one, for example `dist/build/cpu.html`.
- **The theme script** runs before the stylesheet paints anything, so a visitor who chose light
  never sees a dark frame first. It is wrapped in `try`, because storage can throw (private
  windows, blocked site data). Keep it inline and this small.
- **`theme-color`** colours the phone browser's toolbar: `#131416` (`--stage`, dark) or
  `#f3f3f1` (light).

### 1.3 The theme switch

- **Rig Lab opens dark** on every first visit, whatever the operating system prefers. The studio is
  a dark room; light is the visitor's choice. Never switch on `prefers-color-scheme`.
- **The control:** the round button in the top bar (Studio mock). Make it a toggle button with the
  fixed name "Light theme" and `aria-pressed="true"` when light is on. Its icon follows the
  iconography rules ([direction.md](direction.md#motion-iconography-3d-2)).
- **Switching:** set `document.documentElement.dataset.theme` to `'light'` or `'dark'`, store the
  same word under `localStorage` key `rig-lab-theme` (inside `try`), and update `theme-color`.
  Every colour token switches at once; nothing else needs to change.
- **A subtree can carry its own theme:** `data-theme="light"` on an element switches only that
  element and its children. Use it for print previews, not as a second page theme.
- **The 3D scene** reads `--stage`, `--stage-floor`, `--stage-floor-deep` and `--scene-light` with
  `getComputedStyle(document.documentElement)`. Read them again whenever the theme changes.
- The `dark:` and `light:` variants follow `data-theme`, not the operating system. Colours never
  need them; keep them for rare art-direction changes.

### 1.4 Motion from script

Import `durationMs`, `delayMs` and `easing` from `src/styles/motion.ts`. Use
`motionSeconds(name, reducedMotion)` and `delaySeconds(name, reducedMotion)` for Motion and the 3D
scene: with reduced motion every duration is 0, except `cut`, the 200 ms crossfade that replaces
a camera move. CSS transitions use the utilities in section 2.6 and switch off by themselves.

### 1.5 After wiring, prove it

- `npm run verify`, `npm run perf:bundle`, `npm run perf:vitals`, and screenshots of `/` and
  `/build/cpu` at 390, 768 and 1440 in both themes. JS does not change. For scale, the token
  specimen's whole stylesheet is 14,560 bytes before gzip.
- Then `node docs/design/tools/tokens-check.mjs` re-runs the design side's pipeline check (section 6).

---

## 2. The tokens

Two layers, as `tokens.css` says at the top:
1. **Raw tokens** are plain custom properties, such as `--surface`. They switch at runtime with the
   theme, reduced motion or the breakpoint. Components, the 3D scene and scripts may read them.
2. **The Tailwind mapping** (`@theme`) turns them into utilities, such as `bg-surface`. Colour,
   shadow, motion, layout and layer tokens map with `inline`, so a utility reads the raw variable
   and switches with it. The fixed scales map with `static`, so plain CSS can use them too.

Tailwind's defaults are removed, so only Rig Lab's values exist:
- colours (`bg-white`, `text-gray-500`, `bg-purple-600` no longer exist);
- type sizes (`text-sm`, `text-4xl`) and the bold weights (`font-bold`);
- radii, shadows, easings and animations (`rounded-lg`, `shadow-lg`, `ease-in-out`,
  `animate-spin`).

Tailwind's 4 px spacing step (`p-4` = 16 px), container widths (`max-w-3xl`), aspect ratios and
layout utilities stay.

**The tokens reproduce the picked look.** `tools/studio-parity.mjs` renders the Studio mock on its
own inline values and on the shipped `tokens.css` with Rig Lab Sans, at 390, 768 and 1440 in both
themes. The results:
- every pixel outside text is identical;
- no text box moves or re-wraps (0 of 73 to 91 per size);
- text drifts by at most 0.19 px. The differing glyph-edge pixels (0.7–1.0 %) come from the
  subset's advances, which differ from the full Mona Sans by at most 4 font units per glyph.

### 2.1 Colour

| Token | Utility | Dark | Light | Use |
|---|---|---|---|---|
| `--stage` | `bg-stage` | `#131416` | `#f3f3f1` | The studio wall; the page background |
| `--stage-floor` | `bg-stage-floor` | `#1c1d20` | `#e8e8e5` | The floor, below the horizon |
| `--stage-floor-deep` | `bg-stage-floor-deep` | `#0f1012` | `#d9d9d5` | The floor's near edge |
| `--stage-key` | `bg-stage-key` | `rgba(255,244,232,.12)` | `rgba(255,255,255,.95)` | The key light's pool, laid over the wall |
| `--surface` | `bg-surface` | `#17181b` | `#ffffff` | Panels over the stage: rail, dock, callouts, pills, sheets |
| `--surface-raised` | `bg-surface-raised` | `#212226` | `#f3f3f1` | A selected or hovered row; a raised control |
| `--line` | `border-line` | `#2d2f34` | `#e0e0dc` | Panel edges and dividers |
| `--ink` | `text-ink` | `#f4f4f3` | `#111214` | Primary text |
| `--ink-2` | `text-ink-2` | `#babcc0` | `#45484d` | Secondary text, reasons, hints |
| `--ink-3` | `text-ink-3` | `#9da0a6` | `#62666c` | Meta, units, captions; control borders |
| `--ok` | `text-ok` | `#62d497` | `#1c7a45` | "Fits": the state icon and its label |
| `--warn` | `text-warn` | `#f4ba4e` | `#8a5900` | "Warning": the state icon and its label |
| `--block` | `text-block` | `#ff8b80` | `#b3261e` | "Incompatible": the state icon and its label |
| `--action` | `bg-action` | `#f4f4f3` | `#111214` | The primary button; a pressed pill |
| `--action-ink` | `text-action-ink` | `#111214` | `#ffffff` | Text on `--action` |
| `--focus` | `outline-focus` | `#ffffff` | `#111214` | Focus rings |
| `--scene-light` | `bg-scene-light` | `#d4e5ff` | `#6f9ee0` | The scene's default RGB light; the build's chosen colour replaces it in 3D |
| `--scrim` | `bg-scrim` | `rgba(0,0,0,.6)` | `rgba(17,18,20,.32)` | Behind an expanded sheet or the Specs panel |

Selected text has no token of its own: `base.css` sets it as `--stage` on a solid `--ink` (rule 11).

Any colour utility takes Tailwind's opacity modifier (`bg-ink/10`); it compiles to `color-mix()`.

**Rules**
1. **The only colour is light.** UI accents are neutral. Colour comes from the key light and from
   the build's own RGB, in 3D only, so a buyer's lighting colour never clashes with the states.
2. **State colours go on the state icon and its label only.** The reason sentence and its rule id
   are in `--ink-2` and `--ink-3`, so a list full of warnings stays calm. Every state also has its
   icon silhouette and its word ([direction.md §1.3](direction.md#13-compatibility-ok-warn-block)):
   colour is never the only signal (WCAG 1.4.1).
3. **Three text tiers, no others.** `--ink`, `--ink-2`, `--ink-3`. Never fade text with opacity:
   the contrast table below measures these three tokens, not faded copies of them.
4. **Text sits on a surface, or on the stage only where it was measured:** the step label,
   heading and hint, over the wall or the key light, and labels over the floor (section 2.2).
   Never set text over the 3D model itself. A callout over the scene is a `--surface` panel.
5. **Control borders use `--ink-3`** (checkbox, input, pressed chip): at least 5.20:1. `--line` is
   for panel edges and dividers only, and is never a control's only boundary.
6. **Focus is always visible:** a 2 px ring in `--focus`, offset 3 px, from `base.css`. Never remove
   it, on the stage too.
7. **Panels are opaque.** No glass blur, no gradients in the chrome. The key light's pool on the
   stage is the only gradient.
8. **Selection:** a selected row is `--surface-raised` with a 3 px `--ink` bar at its leading
   edge (inset 14 px top and bottom, as in the mock), and says "Selected" in words.
9. **One primary action per view** (`bg-action text-action-ink`), usually "Next: …".
10. **No raw colour values in components.** Every colour is a token. If a design needs a new one,
    design-lead adds it here and to the contrast check first.
11. **Selected text is solid:** `--stage` text on an `--ink` highlight, from `base.css`. That is
    16.75:1 in dark and 16.87:1 in light, on every surface.
    - Changed on 2026-10-01. The first version tinted the highlight and kept each tier's own
      text colour, which fell to 3.06:1 (`--ink-3` on a raised row).
    - Forcing `--ink` text onto that tint fails too: `--action` surfaces are `--ink`-coloured,
      so the result is 1:1.

**The stage background**, behind and around the 3D canvas, and the whole picture when WebGL is
missing. It is the mock's recipe in tokens:

```css
background:
  radial-gradient(38% 52% at 47% 46%, var(--stage-key) 0%, transparent 74%),
  linear-gradient(to bottom, var(--stage) 0 var(--stage-horizon),
    var(--stage-floor) var(--stage-horizon), var(--stage-floor-deep) 100%);
```

### 2.2 Contrast, measured

Generated by `node docs/design/tools/contrast.mjs` from `tokens.css` itself. WCAG 2.1: text 4.5:1
(1.4.3), non-text UI 3:1 (1.4.11). Overlays such as `--stage-key` are composited first. **All 30
pairs pass in both themes.** `node docs/design/tools/contrast.mjs --check` exits non-zero on any
failure, and a unit test runs it.

| Foreground | Background | Use | Kind | Dark | Light |
|---|---|---|---|---|---|
| `--ink` | `--surface` | primary text on panels | text (4.5:1) | 16.13:1 | 18.74:1 |
| `--ink-2` | `--surface` | secondary text | text (4.5:1) | 9.33:1 | 9.18:1 |
| `--ink-3` | `--surface` | meta, units, captions | text (4.5:1) | 6.77:1 | 5.77:1 |
| `--ink` | `--surface-raised` | text on a selected or hovered row | text (4.5:1) | 14.44:1 | 16.87:1 |
| `--ink-2` | `--surface-raised` | secondary on a selected row | text (4.5:1) | 8.36:1 | 8.26:1 |
| `--ink-3` | `--surface-raised` | meta on a selected row | text (4.5:1) | 6.06:1 | 5.20:1 |
| `--ink` | `--stage` | step heading on the stage | text (4.5:1) | 16.75:1 | 16.87:1 |
| `--ink-2` | `--stage` | hint on the stage | text (4.5:1) | 9.69:1 | 8.26:1 |
| `--ink-3` | `--stage` | step label on the stage | text (4.5:1) | 7.03:1 | 5.20:1 |
| `--ink` | `--stage` + `--stage-key` | heading where the key light is brightest | text (4.5:1) | 12.17:1 | 18.65:1 |
| `--ink-2` | `--stage` + `--stage-key` | hint where the key light is brightest | text (4.5:1) | 7.04:1 | 9.13:1 |
| `--ink-3` | `--stage` + `--stage-key` | label where the key light is brightest | text (4.5:1) | 5.11:1 | 5.75:1 |
| `--ink-2` | `--stage-floor` | text over the floor | text (4.5:1) | 8.86:1 | 7.48:1 |
| `--ink-3` | `--stage-floor` | labels over the floor | text (4.5:1) | 6.43:1 | 4.70:1 |
| `--ok` | `--surface` | Fits | text (4.5:1) | 9.62:1 | 5.36:1 |
| `--warn` | `--surface` | Warning | text (4.5:1) | 10.13:1 | 5.98:1 |
| `--block` | `--surface` | Incompatible | text (4.5:1) | 7.83:1 | 6.54:1 |
| `--ok` | `--surface-raised` | Fits on a selected row | text (4.5:1) | 8.61:1 | 4.82:1 |
| `--warn` | `--surface-raised` | Warning on a selected row | text (4.5:1) | 9.07:1 | 5.39:1 |
| `--block` | `--surface-raised` | Incompatible on a hovered row | text (4.5:1) | 7.00:1 | 5.88:1 |
| `--action-ink` | `--action` | primary button, pressed pill | text (4.5:1) | 17.03:1 | 18.74:1 |
| `--ink-3` | `--surface` | control borders: checkbox, input, pressed chip | ui (3:1) | 6.77:1 | 5.77:1 |
| `--ink-3` | `--surface-raised` | control borders on a raised row | ui (3:1) | 6.06:1 | 5.20:1 |
| `--focus` | `--surface` | focus ring on panels | ui (3:1) | 17.75:1 | 18.74:1 |
| `--focus` | `--surface-raised` | focus ring on a raised row | ui (3:1) | 15.89:1 | 16.87:1 |
| `--focus` | `--stage` | focus ring on the stage | ui (3:1) | 18.43:1 | 16.87:1 |
| `--focus` | `--stage` + `--stage-key` | focus ring in the key light | ui (3:1) | 13.39:1 | 18.65:1 |
| `--ink` | `--surface-raised` | selected-row bar | ui (3:1) | 14.44:1 | 16.87:1 |
| `--action` | `--surface` | primary button against its panel | ui (3:1) | 16.13:1 | 18.74:1 |
| `--stage` | `--ink` | selected text: the solid selection, on any surface | text (4.5:1) | 16.75:1 | 16.87:1 |

The tightest pairs are in light: `--ink-3` over the floor (4.70:1) and "Fits" on a selected row
(4.82:1). Any change to `--ink-3`, `--ok`, `--stage-floor` or `--surface-raised` must re-run the check.

### 2.3 Elevation

| Token | Utility | Dark | Light | Use |
|---|---|---|---|---|
| `--elevation-float` | `shadow-float` | `0 24px 64px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3)` | `0 16px 48px rgba(20,20,28,.12), 0 1px 3px rgba(20,20,28,.08)` | Chrome floating over the stage: rail, dock, callouts, pills, round buttons |
| `--elevation-overlay` | `shadow-overlay` | `0 32px 96px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.35)` | `0 24px 72px rgba(20,20,28,.18), 0 2px 6px rgba(20,20,28,.1)` | Sheets and the Specs panel, over everything |

Two levels only. Rows inside a panel are flat; they change colour, not elevation.

### 2.4 Type

**Rig Lab Sans**, one variable file: width 100–125 %, weight 300–600 (section 4). The family is
`font-sans`, and `base.css` sets it on the page.

| Role (class) | Size / line, phone | from md (768) | from lg (1100) | Weight | Width | Tracking | Use |
|---|---|---|---|---|---|---|---|
| `type-display` | 30 / 34 | 48 / 52 | 56 / 60 | 300 | 125 % | −0.01 em | The step's name on the stage ("Processor") |
| `type-figure` | 24 / 28 | 30 / 34 | 36 / 40 | 300 | 125 % | −0.01 em | Live numbers in the dock: FPS range, build total. Never wraps |
| `type-unit` | 12 / 16 | 16 / 20 | 16 / 20 | 400 | 100 % | 0 | The unit or currency beside a figure ("fps", "SAR") |
| `type-wordmark` | 19 / 24 | | | 600 | 125 % | +0.01 em | "Rig Lab" in the top bar |
| `type-heading` | 17 / 22 | | | 600 | 112.5 % | 0 | Panel titles ("Processors") |
| `type-label` | 15 / 20 | | | 600 | 112.5 % | 0 | A callout's part name; the current step |
| `type-body` | 15 / 22 | | | 400 | 100 % | 0 | Running text and hints |
| `type-name` | 15 / 20 | | | 500 | 100 % | 0 | Part names, prices, button labels |
| `type-control` | 14 / 18 | | | 500 | 100 % | 0 | Pills (SAR/USD), filter chips, secondary buttons |
| `type-small` | 13 / 18 | | | 400 | 100 % | 0 | Spec lines, compatibility states and their reasons |
| `type-caption` | 12 / 16 | | | 400 | 100 % | 0 | Captions, "Prices as of", provenance. The smallest text |

Sizes are in px; the CSS uses rem.

**Rules**
1. **One role per piece of text.** A role sets size, line height, weight, width and tracking
   together. Tailwind's size utilities are removed, so off-scale text cannot creep in.
2. **Weights:** 300 only for display and figure, 400 for reading, 500 for names and controls, 600
   for headings and labels. Nothing is bolder. Rig Lab Sans stops at 600, and `base.css` turns off
   faked bold (`font-synthesis-weight: none`).
3. **Widths:** 125 % only for display, figure and wordmark; 112.5 % for headings and labels; 100 %
   for everything else.
4. **12 px is the floor.** `type-caption` is the smallest text Rig Lab sets.
5. **Tabular figures everywhere, prose included.** Every role and the page body set
   `font-variant-numeric: tabular-nums`.
   - Numbers keep their width when they change (prices on a market switch, FPS, the total), so
     nothing beside them moves.
   - Rig Lab Sans's tabular set is digits only: punctuation keeps its normal width, so "1,899"
     has no gaps ([direction.md §1.1](direction.md#11-numbers-are-the-product)).
   - **Its tabular digits are a separate design:** a slashed zero and a footed one, like the
     digits of a spec plate. The proportional digits have a plain zero. The picked Studio mock
     sets every figure tabular ("Ryzen 7 9800X3D", "30 Sep 2026"), so the slashed zero is part
     of the picked look. Proportional prose would put two kinds of zero in one row: the part
     name's and its price's. So Studio does not follow §1.1's "prose keeps the font's default
     figures" (direction.md records this).
6. **Numbers are written the Rig Lab way** ([direction.md §1.1](direction.md#11-numbers-are-the-product)):
   - a no-break space before the unit ("120 W");
   - an en dash in ranges, with the unit once ("96–108 fps");
   - the currency code before the amount ("SAR 9,412").
7. **Headings** (`h1`–`h3`) balance their lines (`text-wrap: balance`, in `base.css`).
8. **Rule ids never break** inside: `whitespace-nowrap` on "Rule socket-match". It moves to the
   next line whole.

### 2.5 Layout

**Breakpoints** (fixed scale, `static`): `sm` 390 px (24.375rem), `md` 768 px (48rem), `lg` 1100 px
(68.75rem), `xl` 1440 px (90rem). `lg` is where the rail moves beside the stage; it was measured in
the mock.

**The Studio frame.** The stage fills the viewport and the chrome floats over it. The 3D camera
frames the build in what is left: below the top bar, above the dock, and left of the rail from
`lg`.

| Token | Utility | Phone | md (768) | lg (1100) | Use |
|---|---|---|---|---|---|
| `--gutter` | `p-gutter`, `m-gutter`, … | 16 px | 16 px | 16 px | Between floating panels and the viewport edge |
| `--inset` | `px-inset`, … | 16 px | 28 px | 40 px | Text inset on the stage |
| `--topbar` | `h-topbar` | 56 px | 68 px | 68 px | Top bar height |
| `--dock` | `h-dock` | 76 px | 80 px | 92 px | Dock height |
| `--rail-width` | `w-rail` | full width | full width | 424 px | The part rail, beside the stage from `lg` |
| `--stage-horizon` | (CSS only) | 64 % | 64 % | 64 % | Where the wall meets the floor |

**Radii** (`static`): `rounded-control` 5 px (checkboxes), `rounded-row` 14 px (part rows,
callouts), `rounded-panel` 20 px (the rail, sheets), `rounded-dock` 22 px (the dock),
`rounded-pill` (pills, round buttons, chips).

**Named sizes on top of the 4 px step:** `h-control` 48 px (primary buttons), `size-control-sm`
36 px (round icon buttons), `h-chip` 30 px (filter chips).

**Hit areas are at least 24 × 24 px** (WCAG 2.2, 2.5.8, one step above the project's 2.1 AA floor).
The mock's compare checkbox is drawn at 18 px. In Phase 2 its button gets a 24 px hit area, with
the 18 px box drawn inside it.

**Layers**, back to front (`z-*`): `stage` 0 (the canvas and its floor shadow), `stage-ui` 2
(leader lines and callouts pinned to the build), `chrome` 4 (the step heading and the 3D tools),
`rail` 6, `dock` 8, `topbar` 10, `sheet` 20 (the phone sheet expanded, the Specs panel), `toast` 30.
Never use a raw `z-index` number.

### 2.6 Motion

From [motion.md](motion.md#direction-c-studio-cinematic-the-object-moves-first). Only `transform`
and `opacity` animate. Numbers swap; they never count through values nobody quoted. Nothing loops.

| Token | Utility | ms | Use |
|---|---|---|---|
| `--dur-ui` | `duration-ui` | 160 | Hover, pressed states, a pill's highlight |
| `--dur-fade` | `duration-fade` | 200 | Crossfades: a callout chip, a compatibility state |
| `--dur-exit` | `duration-exit` | 240 | An old value leaving; the step track filling |
| `--dur-value` | `duration-value` | 360 | A new value arriving; the rail sliding; the callout re-anchoring |
| `--delay-value` | `delay-value` | 40 | The new value starts after the old one begins to leave |
| `--dur-light` | (`motion.ts`) | 400 | The RGB colour changing, in the shader |
| `--dur-seat` | (`motion.ts`) | 500 | A part seating in 3D |
| `--dur-camera` | (`motion.ts`) | 700 | The camera moving to the next part |
| `--dur-cut` | (`motion.ts`) | 200 | Reduced motion only: the crossfade that replaces a camera move |

Easings: `ease-settle` `cubic-bezier(0.2, 0.8, 0.2, 1)` for UI (quick start, soft stop, no
overshoot); `ease-dolly` `cubic-bezier(0.65, 0, 0.35, 1)` for the camera.

**Reduced motion:** under `prefers-reduced-motion: reduce` every duration and delay is 0 ms, so
CSS transitions stop by themselves. Script uses `motionSeconds()`, which returns 0 too, except
for `cut`. A test keeps `motion.ts` and the CSS equal.

---

## 3. Preflight is on, and what `base.css` gives back

Preflight (Tailwind's reset) gives every component the same starting point on every browser. It
also removes things Rig Lab must not lose. `base.css` restores them in the base layer, so a
component's utilities can still restyle any of them.

| Preflight (Tailwind 4.3.3) | `base.css` | Why |
|---|---|---|
| Links: `color: inherit; text-decoration: inherit`, so a link looks like text | Links are underlined: 1 px in `--ink-3`, offset 0.18 em; 2 px in the text colour on hover | WCAG 1.4.1: a link in text must not rely on colour |
| Headings: `font-size: inherit; font-weight: inherit` | `h1` takes the display role's sizes, `h2` the heading role's, `h3`–`h6` the label role's; `h1`–`h3` balance their lines | A heading without a class still looks like one |
| `b`, `strong`: `font-weight: bolder` | 600 | Rig Lab Sans stops at 600; never fake a bolder weight |
| Placeholders: half the text colour (`color-mix(… 50%, transparent)`) | `--ink-3`, full opacity | WCAG 1.4.3: half-strength text falls below 4.5:1 |
| Focus: the browser's default ring (Preflight leaves it) | A 2 px ring in `--focus`, offset 3 px, on `:focus-visible` | WCAG 2.4.7, with a ring measured on every surface (section 2.2) |
| Page: `line-height: 1.5`, a system font stack | `--stage` background, `--ink` text, Rig Lab Sans, 15 / 22 body, tabular figures, no faked bold, antialiased | The page is the stage before any component paints |
| Buttons: `cursor: default` | `pointer` on buttons, `[role=button]`, `summary`, `label[for]`; `not-allowed` when disabled | The click affordance a mouse user expects |
| Selection: the browser's highlight | Solid: `--stage` text on `--ink` | Selected text stays at least 16.75:1 on every surface (section 2.1, rule 11) |

Two Preflight rules that components must allow for:
- **Lists lose their markers** (`list-style: none`). Safari then stops announcing them as lists. A
  list that is a list keeps `role="list"` (as the specimen's swatch list does).
- **`img` and `svg` become `display: block`.** Inline icons need `inline-block`, or sit in a flex
  row with `shrink-0` (as the state icons do).

---

## 4. The font: Rig Lab Sans, its fallback, `swap` and LCP

### 4.1 What ships

- **Rig Lab Sans** is a subset of **Mona Sans 2.000** (SIL Open Font License 1.1). "Mona" is a
  Reserved Font Name and a subset is a Modified Version, so the family is renamed.
  [`FONTLOG.txt`](../../src/styles/fonts/FONTLOG.txt) records the source, its SHA-256 and every
  change. [`OFL.txt`](../../src/styles/fonts/OFL.txt) is the licence. The build is reproducible
  with [`tools/build-font.py`](tools/build-font.py).
- **One WOFF2, 72,332 bytes.** Latin plus ≤ ≥ ≈ −, width 100–125 %, weight 300–600, self-hosted,
  so no third-party request.
- **One preload** (section 1.2), and `font-display: swap`.

### 4.2 Why `swap`, and what it costs (measured)

`swap` paints text at once in the fallback face, then swaps to Rig Lab Sans when it arrives.
`tokens-check.mjs` measures the worst case: a first visit whose font arrives 1.5 s late
(Chromium 141 on Windows, the token specimen built with Vite).

| Width | Fallback | First paint | LCP | Font arrives | Layout shift from the swap |
|---|---|---|---|---|---|
| 390 | calibrated (shipped) | 120 ms | 120 ms, in the fallback | 1,510 ms | **0.0008** |
| 390 | plain Arial | 128 ms | 128 ms, in the fallback | 1,514 ms | 0.0043 |
| 1440 | calibrated (shipped) | 124 ms | 124 ms, in the fallback | 1,513 ms | **0.0008** |
| 1440 | plain Arial | 120 ms | 120 ms, in the fallback | 1,512 ms | 0.0040 |

One run per row, on 2026-10-01. The layout-shift values were the same in every run made that day.

- **LCP never waits for the font.** The largest text is recorded at first paint, in the fallback,
  and the swap creates no new LCP entry.
- **The swap costs 0.0008 of the 0.05 CLS budget.** That is about a fifth of what an uncalibrated
  Arial costs. The residue is horizontal: text that follows a wide or bold role on the same line
  ("fps" after a figure), because one fallback face can only match one width and weight (4.4).
- **Why not the alternatives:**
  - `block` hides text for up to 3 s, so first paint and LCP wait for the font.
  - `optional` drops the brand face on a slow first visit.
  - `fallback` swaps only within about 3 s, so a slow visit can keep Arial for the whole page
    view, and the page looks different from visit to visit.

  With a calibrated fallback, `swap` costs almost nothing and always ends in Rig Lab Sans. On a
  repeat visit the font usually comes from the cache before the first paint, so there is no swap.

### 4.3 The fallback face

`Rig Lab Sans Fallback` is a local Arial: `local('Arial')`, `local('ArialMT')`, or Liberation Sans,
which has Arial's widths, on Linux. It is adjusted so Rig Lab's own text keeps its width and its
baseline.

| Descriptor | Value | Derivation |
|---|---|---|
| `size-adjust` | **103.14 %** | Rig Lab Sans width ÷ Arial width, at width 100, weight 400 |
| `ascent-override` | 105.68 % | Rig Lab Sans ascent, 1,090 / 1,000 em, ÷ 1.0314 |
| `descent-override` | 31.03 % | Rig Lab Sans descent, 320 / 1,000 em, ÷ 1.0314 |
| `line-gap-override` | 0 % | Rig Lab Sans has no line gap |

- **Overrides are scaled by `size-adjust`** (CSS Fonts 5), so each is divided by it.
- Rig Lab Sans's hhea, typo and win metrics agree (1,090 / −320 / 0, with USE_TYPO_METRICS on).
  The font's MVAR table varies only the x-height, caret and script offsets. Every browser and
  platform therefore uses the same line metrics, at every width and weight.
- **The calibration text** is every visible string of the Studio mock: 1,689 characters in 74
  lines, shaped with tabular figures as the roles set them.

**Two methods, one answer** (the brief's 2 attempts, both successful):
1. **Font files, no browser:** [`tools/calibrate-fallback.mjs`](tools/calibrate-fallback.mjs).
   - It shapes the text with HarfBuzz (harfbuzzjs 1.6.2, the shaper Chromium uses) in the
     shipped woff2 and in `C:\Windows\Fonts\arial.ttf`.
   - Width ratio **1.0314**. Nothing is rounded to pixels, so the result is the same on every
     platform.
2. **The browser:** Chromium 141 on Windows lays text out with fractional advances (DirectWrite).
   - `tokens-check.mjs` measures the same text at 12,157.23 px in Rig Lab Sans and 11,787.36 px
     in Arial: ratio **1.0314**.
   - Headless Chromium on Linux rounds advances to whole pixels. It could not calibrate on
     2026-09-30, and the check now says so instead of failing.

**Width error, before and after**, Windows Chromium, 15 px, tabular figures (the fallback against
Rig Lab Sans; positive = the fallback is wider):

| Text | Plain Arial | Before: 102.03 % | **After: 103.14 %** |
|---|---|---|---|
| All 1,689 characters | −3.04 % | −1.10 % | **0.00 %** |
| A reason: "May need a BIOS update before first boot. …" | −4.01 % | −2.09 % | −1.01 % |
| A spec line: "8 cores, 5.2 GHz, 120 W" | −0.06 % | +1.94 % | +3.08 % |

For the whole text, HarfBuzz gives −3.04 %, −1.07 % and 0 %.

- **Per line**, across the 27 lines of 20 characters or more, the calibrated face is within
  1.18 % (median), 2.88 % (90th percentile) and 3.08 % (worst).
- **The worst lines are digit-heavy spec lines.** Rig Lab Sans's tabular digits are narrower
  against Arial's than its letters are, and one `size-adjust` cannot fit both.
- **Sentences, the text that wraps, land within about 1 %.**

**Baselines.** The first baseline of every role, measured at 1440, is the same in the fallback as
in Rig Lab Sans. That holds in all 10 roles. Plain Arial is 1 to 2 px off in 5 of them.

### 4.4 What one fallback face cannot match

The face matches the body role (width 100, weight 400). With `font-synthesis-weight: none`, every
weight shows Arial Regular until the swap, so the other roles keep a residual width error (HarfBuzz,
whole text):

| Roles | Width, weight | Fallback against Rig Lab Sans |
|---|---|---|
| name, control | 100, 500 | −1.26 % |
| heading, label | 112.5, 600 | −7.35 % (Arial Bold unscaled: −5.15 %) |
| display, figure | 125, 300 | −7.05 % |
| wordmark | 125, 600 | −11.62 % |

These roles are single lines: the step name, panel titles, figures that never wrap. So the error
moves only text that follows them on the same line, which is the 0.0008 above.

Extra fallback faces per width and weight (`font-stretch` and `font-weight` descriptors, each with
its own `size-adjust`) would remove most of it. That is not worth the complexity at 0.0008 of CLS;
revisit it if a layout puts wrapping text in those roles.

**Re-run after any font or role change:**

```sh
npm install --prefix <dir> harfbuzzjs@1.6.2 wawoff2@2.0.1    # outside the repo
node docs/design/tools/calibrate-fallback.mjs --modules <dir>/node_modules
node docs/design/tools/tokens-check.mjs                     # browser check, on Windows or macOS
```

---

## 5. What the tokens deliberately leave out

- **No component styles.** Rows, pills, the dock and the rail are built in Phase 2 from the roles
  and tokens above, to the Studio mock and [direction.md](direction.md#key-components-2).
- **No dark/light images.** The 3D scene owns everything visual on the stage.
- **No icon set.** The icon rules (18 px grid, 1.75 px stroke, round caps and joins) are in
  [direction.md](direction.md#motion-iconography-3d-2); the icons are drawn in Phase 2.

---

## 6. Tests and tools

| What | Command | Proves |
|---|---|---|
| `src/styles/tokens.test.ts`, 96 tests | `npm run test` (in `verify`) | Every utility compiles with Tailwind 4.3.3, and the removed defaults stay removed. `tokens.css` fails inside a layer (the wiring rule). `motion.ts` equals the CSS, and reduced motion zeroes everything but `cut`. The fallback's overrides stay Rig Lab Sans's metrics ÷ `size-adjust`. The font is a WOFF2 within the 80 KB budget, with its licence. Selected text is `--stage` on `--ink`, the pair the contrast check measures, and the contrast check passes. |
| `docs/design/tools/contrast.mjs` | `node docs/design/tools/contrast.mjs [--check]` | WCAG 2.1 AA for every pair in section 2.2, dark and light, from `tokens.css` itself |
| `docs/design/tools/tokens-check.mjs` | `node docs/design/tools/tokens-check.mjs` | The real Vite and Tailwind build under `/Rip-PC/`: hashed font, preload rewritten to the same file, no default palette. Six specimen screenshots (390, 768 and 1440, dark and light), both variable axes, the fallback's width and baselines, and the slow-font LCP and CLS |
| `docs/design/tools/calibrate-fallback.mjs` | section 4.4 | The fallback descriptors from the font files |
| `docs/design/tools/studio-parity.mjs` | `node docs/design/tools/studio-parity.mjs` | The Studio mock as picked (`3fe5978`), as it is now, and on the shipped tokens, at 390, 768 and 1440 in both themes, compared pixel by pixel and box by box (section 2) |

Screenshots and reports go to `artifacts/screenshots/phase-0/WP-DS1/tokens/` and `…/parity/` (git-ignored).

## 7. Known gaps

- **Android has neither Arial nor Liberation Sans,** so the fallback face does not load there. Text
  paints in the system font (Roboto), unadjusted, until Rig Lab Sans arrives.
  - Measured with HarfBuzz against Google Fonts' Roboto: Roboto sets **4.52 % narrower**. A second
    face, `local('Roboto')` at `size-adjust: 104.74%`, would match it.
  - It is not shipped, because nobody has checked that Android Chrome resolves `local('Roboto')`.
    To check on a real Android phone in Phase 5.
  - The cost is bounded: plain Arial's swap measured 0.004 of CLS on the specimen.
- **The swap was measured on the token specimen,** not on the app. Once build-lead has wired the
  tokens, `npm run perf:vitals` measures the real pages.
- **Calibration covers Arial on Windows.** macOS and iOS also ship Arial, and Liberation Sans was
  drawn to Arial's widths, so they should behave the same. None of them was measured here.
- **The compare checkbox's hit area** (18 px in the mock) must grow to 24 px in Phase 2 (2.5).
