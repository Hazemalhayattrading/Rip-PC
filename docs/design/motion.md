# Motion specification (WP-DS0)

Owner: design-lead · 2026-09-30, WP-DS0: the three directions (motion-designer work, done by
design-lead) · 2026-10-03, WP-DS2: [Studio's rules for Phase 2](#studio-rules-for-phase-2), by the
motion-designer · Status: for review

Motion is specified per direction. The chosen one becomes tokens in WP-DS1. All three share the
rules below. The mocks implement the number swap (all three), the market-toggle row fade (Bench)
and reduced motion (all three). Step changes and the 3D responses are specified here but not built.
Hazem picked C, Studio. How to build its motion in Phase 2 is in
[Studio: rules for Phase 2](#studio-rules-for-phase-2).

## Rules for every direction

1. **Transform and opacity only.** Nothing animates width, height, top, left, colour, shadow or
   blur. Web Animations run on the compositor. `will-change` is set only while an animation runs.
2. **Feedback in the same frame.** A pick shows its selected state immediately, with no
   transition. Motion afterwards explains what changed. It never delays the answer (BUILD_PROMPT
   §6 asks for under 100 ms).
3. **Numbers never pass through values that aren't real.** A count-up tween from SAR 9,412 to
   SAR 9,062 would show prices nobody quoted. Numbers **swap**: the new value moves in and the
   old one leaves. Tabular figures keep the width stable, so nothing reflows. Screen readers hear
   the final value once.
4. **No motion on load**, and no motion that the person didn't cause. The one exception is the 3D
   camera settling after a step change. **Nothing loops on its own.** The fans in the 3D view spin
   only while the visitor has turned them on, and the same control stops them (WCAG 2.2.2, Pause,
   Stop, Hide). Under reduced motion they never spin. *Revised in WP-DS2, backlog item 23: fans no
   longer spin by themselves ([section 6](#6-fans-item-23)).*
5. **Reduced motion** (`prefers-reduced-motion: reduce`):
   - every transform-based movement is removed;
   - numbers and lists swap instantly;
   - the 3D camera cuts instead of flying;
   - fans stay still.

   The measured mocks run zero animations in this mode (below).

## Direction A: Bench (mechanical, exact, fast)

Easing `inst = cubic-bezier(.2, 0, 0, 1)`: quick start, firm stop, no overshoot, like a needle
settling. Durations: 120 ms (micro), 160 ms (values), 180 ms (bars, markers), 240 ms (panels).

| Event | What moves | Duration and easing | Reduced motion |
|---|---|---|---|
| Part selected | Row highlight and 2 px bar appear at once; readouts swap; range bands and meters slide to the new values (`translateX`, `scaleX`) | 0 ms highlight; 160 ms swap; 180 ms bands; `inst` | Everything instant |
| Number changes | New value rises from 40% below and fades in; old value leaves 40% up | in 160 ms, out 120 ms, `inst` | Instant swap |
| Step advance | Rail marker slides to the next step (`translateY`); table content leaves 8 px left and fades, the next table enters from 8 px right | 180 ms marker; 120 ms out, 160 ms in | Instant |
| Compatibility state change | State icon and label crossfade in place | 120 ms opacity | Instant |
| Market toggle (SAR/USD) | Segment highlight slides; readouts swap; table rows fade in | 180 ms slide, 160 ms swap, 120 ms rows | Instant |
| Compare add or remove | Chip enters or leaves the compare bar with a 4 px lift and fade | 120 ms | Instant |
| 3D response (Phase 3) | The new part seats along its mounting axis (the CPU drops into the socket). The camera does not move. The chosen part's outline switches to the trace colour. | 240 ms, `inst` | The part appears in place |

## Direction B: Folio (editorial, calm, like turning a page)

Easing `page = cubic-bezier(.3, 0, .1, 1)`, a long soft landing. Durations: 160 ms (out),
280 ms (in), 420 ms (step change).

| Event | What moves | Duration and easing | Reduced motion |
|---|---|---|---|
| Part selected | "Your pick" appears on the row at once; the figure caption, total and FPS swap | 0 ms state; 280 ms swap, 60 ms delay; `page` | Instant |
| Number changes | Old value fades out in place and rises 6 px; new value fades in from 6 px below | out 160 ms, in 280 ms after 60 ms, `page` | Instant swap |
| Step advance | Chapter underline slides to the next chapter (`translateX`, `scaleX`); article fades out; the next heading rises 12 px and fades in; the plate stays still, for continuity | 280 ms underline; 160 ms out; 420 ms in | Instant |
| Compatibility state change | Reason line fades in under the part name | 200 ms opacity | Instant |
| Market toggle | Price column crossfades; total and FPS swap | 200 ms rows, 280 ms swap | Instant |
| Margin notes | Appear with their paragraph; never animated alone | none | none |
| 3D response (Phase 3) | The plate re-renders with a 280 ms crossfade. On request, a slow turntable (one turn in 12 s) that stops on any input. | 280 ms | Crossfade removed; no turntable |

## Direction C: Studio (cinematic, the object moves first)

Easings:
- UI: `settle = cubic-bezier(.2, .8, .2, 1)`, expressive, with a soft stop;
- camera: `dolly = cubic-bezier(.65, 0, .35, 1)`, ease in and out.

Durations: 160 ms (UI), 360 ms (values), 500 ms (part seating), 700 ms (camera).

| Event | What moves | Duration and easing | Reduced motion |
|---|---|---|---|
| Part selected | Row state at once. In 3D, the part seats (500 ms); the callout re-anchors (`translate`, 360 ms) and its text crossfades; dock values swap | 0 ms state; 360 ms swap, 40 ms delay; `settle` | Callout jumps; values swap instantly; no seating motion |
| Number changes | New value rolls up from 55% below and fades in; old value rolls up out | in 360 ms, out 240 ms, `settle` | Instant swap |
| Step advance | The camera dollies to the next part; the rail content slides 24 px and crossfades; the step track fills its next segment (`scaleX`) | 700 ms camera `dolly`; 360 ms rail; 240 ms track | The camera cuts behind a 200 ms canvas crossfade; the rail swaps |
| Compatibility state change | Callout chip crossfades | 200 ms | Instant |
| Market toggle | The pill's pressed option switches at once: its highlight and both labels change in the same frame (rule 2; a pill is a pick). Dock values roll | 0 ms state; 360 ms roll | Values swap instantly |
| Lighting colour (Phase 3) | RGB emission lerps in the shader (not a CSS animation) | 400 ms | Instant |

**The market pill no longer slides** (WP-DS2, design-lead's ruling, 2026-10-03). Until then its
highlight slid over 240 ms. A pill is a pick, so rule 2 applies. And mid-slide, the pressed label's
text would sit on the wrong background, so for 240 ms no frame of it could be read.

## Studio: rules for Phase 2

WP-DS2, 2026-10-03: backlog items 10 to 13, and the motion rule of item 23 (the 3D brief's part
is in [studio-3d-brief.md](studio-3d-brief.md)). These rules make the Studio table buildable. Its
durations and easings stay as they are, as tokens ([tokens.md §2.6](tokens.md#26-motion)). Who
animates what:
- **CSS draws states:** hover and pressed. No script animates them.
- **Motion animates changes:** values rolling, the rail sliding, panels switching.
- **The 3D scene animates in `useFrame`:** seating, the camera, the fans.

Every statement about Motion below was read in the installed code: motion and framer-motion
13.4.6, motion-dom 13.4.5 and motion-utils 13.3.0. File names are given in brackets, under each
package's `dist/es/`. Motion's documentation was read through Context7 for `MotionConfig`,
`useReducedMotion`, `Transition`'s `ease`, `whileHover` and `whileTap`. Where the docs and the code
disagree, the code wins, and the section says so.

### 1. Hover: an overlay's opacity (item 10)

Hover never animates a colour. A control that reacts to hover has an overlay layer that holds the
hover colour at full strength. Only the layer's opacity moves.

| | Spec |
|---|---|
| What moves | The control's `::before` (on a part row, the radio's `::after`: see below), which fills it (`inset-0`, the control's own radius) and sits under its content. Its opacity goes from 0 to 1 on hover, and back on leave. Nothing else moves: no lift, no shadow, no scale, no colour transition |
| Duration and easing | 160 ms (`duration-ui`), `ease-settle`, both ways |
| Trigger | `:hover`. Tailwind 4.3.3 wraps `hover:` in `@media (hover: hover)` (compiled with tokens.css), so a tap never leaves a hover stuck on a touch screen |
| Colour | `--surface-raised`, at full strength. The contrast check already measures it as "text on a selected or hovered row", with every ink and state colour on it (the lowest is `--ok`, 4.82:1 light). No new colour pair |
| Stacking | The control is `relative isolate`, and the overlay is `before:z-under` (`--z-under: -1`). `isolate` keeps the overlay inside the control's own stacking context, the only place `z-under` is allowed ([tokens.md §2.5](tokens.md#25-layout)) |
| No overlay | Controls drawn in `--action`, which are the primary button and a pill's pressed option: no pair is measured over `--action`, so their hover shows nothing. Disabled controls |
| Reduced motion | `--dur-ui` is 0 ms, so the overlay appears at once. It shows a state, not a movement, so it stays |

The utilities. First, the layer:

```
relative isolate before:pointer-events-none before:absolute before:inset-0 before:z-under
before:rounded-[inherit] before:bg-surface-raised before:opacity-0 before:transition-opacity
before:duration-ui before:ease-settle
```

Then the trigger, which never fires on a disabled control (components.md, disabled states):
- `enabled:hover:before:opacity-100` on a button;
- `not-aria-disabled:hover:before:opacity-100` on a control that can be `aria-disabled`;
- on a pill segment, also `not-aria-pressed:`, because its pressed option is drawn in `--action`:
  `enabled:not-aria-pressed:hover:before:opacity-100`.

**On a part row** the overlay lives on the radio, not the row. There, `::before` draws the
selected row's bar (components.md), and the radio's `::after` already stretches over the row as
its hit area. That stretched layer carries the overlay:
- add `isolate` to the row;
- add `after:z-under after:bg-surface-raised after:opacity-0 after:transition-opacity
  after:duration-ui after:ease-settle hover:after:opacity-100` to the radio, beside its
  `after:absolute after:inset-0 after:rounded-row`.

Below the content, the layer still catches every click outside the radio's own text. The overlay
shows only while the radio is hovered, not while the compare checkbox or the figures button is
(checked, section 7). A row has no disabled state: a blocked row still answers with its reason
(components.md). So its trigger has no guard, and the contrast check measures `--block` on the
hovered row.

**Where `::before` is already taken** by a drawing, the overlay uses `::after` with the same
classes. Where both are taken (a drawing, plus the touch-screen hit extension, which uses `after:`
in components.md), the overlay is an `aria-hidden` span: the control's first child, with the same
classes minus the `before:` prefixes.

- **Selected rows** keep `bg-surface-raised` as their own background, with no transition. A pick
  shows at once (rule 2), and losing it does too. The overlay over a selected row is the same
  colour, so hovering it changes nothing.
- **Any other hover change is instant.** A link's underline thickens at once (`base.css`). An
  icon that turns from `--ink-2` to `--ink` does it with no transition. Only the overlay fades.
- **This overlay replaces every hover that fades a background over 160 ms**, wherever a spec has
  one. specs-view.md §3's row hover is one of them.
- **`--dur-ui` times** a hover overlay's fade, the pressed scale and a chevron's turn (the lab's
  steps chevron, [lab-spec.md §4](lab-spec.md#4-the-result-row)). It never times a colour.
- **Not Motion's `whileHover`.** The overlay needs no script and no React render. Motion's hover
  gesture skips touch too (`gestures/hover.mjs` drops `pointerType` "touch"), so CSS loses
  nothing.
- **Forced colours** give the overlay the system background, so hover shows nothing there. Hover
  carries no information. A state that does carry some follows backlog item 3.

### 2. Pressed (item 11)

| | Spec |
|---|---|
| What moves | The control's own box: `scale` from 1 to 0.97 about its centre, and back. Its text, icon and focus ring scale with it. Nothing around it moves |
| Duration and easing | 160 ms (`duration-ui`), `ease-settle`, both ways. A release mid-way reverses from where the scale is (a CSS transition does) |
| Trigger | `data-pressed` on the control. It is set on `pointerdown` (the primary pointer's main button) and on a Space or Enter `keydown` that isn't a repeat. It is removed on `pointerup`, `pointercancel`, `pointerleave`, `keyup` and `blur` |
| Feedback within 100 ms | The first frame after the press is already 41 % of the way, at scale 0.988: `ease-settle` covers 41 % of its distance in the first 10 % of its time, and 98 % by 100 ms. Measured: 19 to 33 ms from the event to the first scaled frame (section 7) |
| The action | On `click`, never on `pointerdown` (WCAG 2.5.2), so moving off before the release cancels it. The press is only visual, and never decides anything |
| On | Buttons: primary, secondary and text buttons, the round tool buttons, the stepper's previous and next, pill options, filter chips |
| Not on | Part rows and Specs rows: at 0.97, a row in the 424 px rail loses about 6 px on each side and opens gaps between rows. A row answers with its selected state, at once (rule 2). Also not on checkboxes and radio marks (the mark appears at once), selects and text fields, links, panels, or the canvas. Never on a disabled control: the handler doesn't set `data-pressed` on `disabled` or `aria-disabled="true"` |
| Reduced motion | No scale: the scale utility is `motion-safe:`. The press shows as the overlay at full strength instead, at once. With a mouse the overlay is already there from hover, and `--action` controls have none, so there the press adds nothing visible. The result of the press appears at once (rule 2) |

The utilities, added to section 1's:

```
transition-[scale] duration-ui ease-settle motion-safe:data-pressed:scale-97
motion-reduce:data-pressed:before:opacity-100
```

- **A pill segment** writes the second line as
  `motion-reduce:not-aria-pressed:data-pressed:before:opacity-100`. Otherwise, pressing its
  pressed option would put the `--action-ink` label on `--surface-raised`, which is unreadable.
- **A control drawn only in `--action`** (the primary button) takes the first line alone. It has
  no overlay.

**Why `data-pressed`, and not `:active` or Motion's `whileTap`:**
- **`:active` is late on touch and missing for Enter.** Measured in Chromium 141: under a finger
  held for 300 ms, `:active` matched only at the tap, 350 ms after the touch began. Enter never
  set it. `data-pressed` scaled the first frame after the event: 19 ms by mouse, 33 ms by touch,
  32 ms by Space and 28 ms by Enter.
- **`whileTap` answers Enter only, not Space.** `gestures/press/utils/keyboard.mjs` (motion-dom)
  ignores every key but "Enter".
- **`whileTap` animates `scale` on the main thread.** Motion hands the browser only opacity,
  clipPath, filter, transform and backgroundColor (`animation/waapi/utils/accelerated-values.mjs`).
  `scale` runs in Motion's own frame loop, so the release would wait behind the pick's render. A
  CSS transition of `scale` runs on the compositor.
- **The press gesture makes elements focusable.** It sets `tabIndex = 0` on any element that has
  no `tabindex` attribute and isn't a button, input, select, textarea or link
  (`gestures/press/index.mjs`). A wrapper, or a row without a `tabindex`, would become a tab stop.

One shared handler (a hook or a wrapper component in `src/components/`) sets and clears the
attribute directly on the element, so a press never re-renders React. Every end event clears it,
so a control never stays pressed when focus moves on mid-press.

### 3. Reduced motion through Motion (item 12)

1. **The app root** wraps everything in `MotionConfig`, in `src/app/App.tsx`:

   ```tsx
   import { MotionConfig, useReducedMotion } from 'motion/react';
   import { easing, motionSeconds } from '../styles/motion';

   export function App({ onNavigate }: AppProps) {
     const reduce = useReducedMotion();
     return (
       <MotionConfig
         reducedMotion="user"
         transition={{ duration: motionSeconds('ui', reduce), ease: easing.settle }}
       >
         <Router base={ROUTER_BASE}>
           <Pages onNavigate={onNavigate} />
         </Router>
       </MotionConfig>
     );
   }
   ```

2. **What `reducedMotion="user"` does** (`animation/interfaces/visual-element-target.mjs`). When
   the device asks for reduced motion, every value in Motion's `positionalKeys` jumps to its
   target. Those are width, height, top, left, right and bottom, and the transforms x, y, z,
   scale, rotate and skew with their axes. Opacity and every other value still animate with their
   transition. So does a `transform` string, which isn't in the list. Without `MotionConfig`,
   Motion's default is `"never"`, which ignores the setting (`context/MotionConfigContext.mjs`).
   The docs say the same: "transform and layout animations will be disabled. Other animations,
   like opacity and backgroundColor, will persist."
3. **So `MotionConfig` is the safety net, and `motionSeconds()` is the rule.** Every transition
   takes its duration from `motionSeconds(name, reduce)` and its delay from
   `delaySeconds(name, reduce)`. Get `reduce` from `const reduce = useReducedMotion()`, in the
   component that starts the animation. Under reduced motion both return 0, except `cut`
   (200 ms). Motion skips an animation with 0 duration and 0 delay and applies its final value on
   the next frame (`animation/interfaces/motion-value.mjs`). So the opacity fades that the net
   lets through stop too.
4. **A transform that shows a state still applies, at once. A transform that is only feedback
   doesn't.** Under reduced motion, the lab's steps chevron still turns 90°, instantly
   ([lab-spec.md §4](lab-spec.md#4-the-result-row)). The pressed scale isn't applied (section 2).
5. **`useReducedMotion()` returns `boolean | null`.** It is `null` where there is no window: a
   server render, or a Node test. `motionSeconds()` and `delaySeconds()` take it as it is, and
   `null` counts as no preference, as it does inside Motion.
6. **The root's default transition** replaces Motion's own defaults for an animation that
   forgets its transition (`animation/utils/default-transitions.mjs`):
   - every transform except scale (x, y, rotate and the rest) springs with stiffness 500 and
     damping 25, which overshoots by about 12 %;
   - scale springs with stiffness 550 and damping 30, about 7 %, unless its target is 0;
   - everything else gets 300 ms of `[0.25, 0.1, 0.35, 1]`.

   With the default in place, nothing springs and nothing overshoots. It is only a fallback:
   every animation still names its token.
7. **Movement in Motion uses `transform` strings, not `x`, `y` or `scale`.** Motion hands
   `transform` and `opacity` to the browser as Web Animations, which the compositor can run. `x`,
   `y` and `scale` run in Motion's own frame loop on the main thread, beside React and the 3D
   scene. Measured with Motion's own `animate()`: a roll written with `transform` ran as browser
   animations of transform and opacity; the same roll written with `y` showed only opacity
   (section 7). The net in point 2 doesn't catch a `transform` string, so point 3 is what stops
   it.
8. **The setting is read when a component mounts, not live.** `useReducedMotion()` keeps the value
   it read at mount (`utils/reduced-motion/use-reduced-motion.mjs` in framer-motion:
   `useState(prefersReducedMotion.current)`, with a TODO about updating it). Motion's own flag
   does the same (`render/VisualElement.mjs`, in `mount()`). The hook's comment and Motion's docs
   say it re-renders when the setting changes; the 13.4.6 code doesn't. **So a changed OS setting
   reaches script motion on the next page load, while CSS switches at once.** That is acceptable
   for transitions shorter than a second. The fans can't wait, so they listen to the media query
   instead (section 6).
9. **Tests set reduced motion before the page loads**, for the same reason. Use
   `browser.newContext({ reducedMotion: 'reduce' })`, or `page.emulateMedia({ reducedMotion:
   'reduce' })` before `page.goto()` (Playwright 1.56.1).

### 4. The type test (item 13)

[`src/styles/motion.types.test.ts`](../../src/styles/motion.types.test.ts) checks motion.ts against
Motion's own types. So a Motion upgrade that changes them fails `npm run typecheck`, which is part
of verify, and not the UI.
- **Types, checked by `tsc -b`:**
  - every easing extends `BezierDefinition` (`readonly [number, number, number, number]`) and
    `Transition['ease']`;
  - the value roll and the root's default transition, built from the tokens, satisfy
    `Transition` and `MotionConfigProps['transition']`;
  - `useReducedMotion()`'s return type fits `motionSeconds()` and `delaySeconds()`;
  - `"user"` is a `reducedMotion` value.
- **Why `tsc -b` and not Vitest.** Vitest's typecheck mode is off (`vitest.config.ts` sets no
  `typecheck`), so `expectTypeOf` does nothing at run time. `tsc -b` checks the file through
  `tsconfig.node.json`, which includes `src/**/*.test.ts`.
- **At run time, in Vitest:**
  - Motion recognises each easing as a cubic Bézier, and hands the browser the same
    `cubic-bezier()` string as its `--ease-*` token (`mapEasingToNativeEasing`);
  - every control point stays within 0 to 1, so CSS takes the curve and nothing overshoots.
- **It bites** (2026-10-03):
  - with `settle` cut to three numbers, `tsc -b` reported 7 errors in the test, besides
    motion.ts's own check, and Vitest failed 3 of its tests and one in tokens.test.ts;
  - with motion.ts's own type also loosened to `readonly number[]`, motion.ts compiled, and the
    test alone failed `tsc -b`.

### 5. The number swap's slot

Rule 3 swaps numbers. The slot keeps a readout's width fixed while values roll, and after, so
nothing beside it moves.

| | Spec |
|---|---|
| Structure | An `inline-grid` span (`justify-items-start`, `aria-hidden="true"`) holding the whole readout line: the figure and its unit, or the code and the amount. During a roll it holds two copies, old and new, in one grid cell (`[grid-area:1/1] whitespace-nowrap`). So the slot is as wide as the wider copy, and never narrower than its minimum. Nothing is absolutely positioned or measured |
| Minimum width | In **em**, for the longest expected value at its widest breakpoint (table below), rounded up to 0.1 em |
| Figures | Tabular. Every type role sets `tabular-nums`; never override it |
| Alignment | `justify-items-start`, because the dock's readouts sit left-aligned over their captions. A right-aligned column would use `justify-items-end` |
| Spoken | The animated copies are hidden from screen readers. Beside the slot, outside the animation, is one `sr-only` copy of the final value, with the range's spoken form ("142 to 158 fps", [lab-spec.md §6](lab-spec.md#6-the-estimate-readout)). So the value is heard once ([direction.md §1.4](direction.md#14-accessibility-floor)). No `aria-label` on a span (backlog item 43) |
| The roll | As the Studio table has it, with `ease-settle`, not clipped. The new copy comes from `translateY(55%)` and opacity 0, over 360 ms after a 40 ms delay. The old copy goes to `translateY(-55%)` and opacity 0 in 240 ms, then is removed. In Motion: an `AnimatePresence` with `initial={false}` inside the slot, its child keyed by the value, with `transform` strings (section 3, point 7) |

**Why em, not ch** (measured in Chromium 141, 2026-10-03):
- `ch` is the width of a font's default zero, and Rig Lab Sans's tabular figures are narrower than
  that: 0.956 ch each in `type-figure`, with its −0.01 em tracking.
- `ch` also changes with the font: it is 0.743 em in Rig Lab Sans and 0.573 em in the Arial
  fallback. So a reserve in `ch` would change width when the font swaps in.
- A reserve in em, sized for Rig Lab Sans (wider than the fallback for figures), holds one width
  from the first paint, through the font swap, to the longest value.

| Readout | Longest expected value | Its width in Rig Lab Sans at 390, 768, 1440 | Reserve |
|---|---|---|---|
| An FPS range: the figure, a no-break space, "fps" in `type-unit` | 999–999 fps | 5.71, 5.76, 5.63 em | `min-w-[5.8em]` |
| The build total: the code in `type-unit`, a no-break space, the amount | USD 99,999.99: the wider code with the longest amount (SAR 99,999.99 is 0.04 em narrower) | 6.56, 6.63, 6.44 em | `min-w-[6.7em]` |
| The compare count | One digit, 0 to 3 | Tabular digits all have the same width | None needed |

- **The total's longest value** follows the copy guide's money format: two decimals, unless the
  amount is whole ([copy-guide.md §3](copy-guide.md#3-numbers-and-units)). Of the 45 SAR prices
  observed so far, 26 have decimals, and the highest is SAR 13,932.99 (`data/prices/sa.json`). So
  a high-end build's total has five digits before the point.
- **Past the reserve** (a four-digit FPS range such as 1,050–1,180, or a total of 100,000 or
  more), the slot grows to fit and never clips. What follows it moves once, right after the pick.
  A shift within 500 ms of an input doesn't count toward CLS (`hadRecentInput`).
- **For a new readout,** add up its characters' widths from the table below: Rig Lab Sans, in em
  of each role's own size, tracking included.
  - Multiply `type-unit` text by the unit-to-figure size ratio: 0.5 at 390, 0.533 at 768 and
    0.444 at 1440.
  - Take the largest of the three, and round it up to 0.1 em.

| `type-figure` | em | `type-unit` | em |
|---|---|---|---|
| A digit (tabular) | 0.710 | fps | 1.426 |
| Comma | 0.153 | SAR | 2.054 |
| Full stop | 0.149 | USD | 2.128 |
| En dash | 0.515 | | |
| No-break space | 0.224 | | |

### 6. Fans (item 23)

Rule 4, revised: in the garage (Phase 3), fans spin only while the visitor has turned them on,
and the same control stops them. Nothing else loops (WCAG 2.2.2, Pause, Stop, Hide).

| | Spec |
|---|---|
| The control | A round tool button in the 3D tools row: the fan icon, the visually hidden name "Spin fans", and `aria-pressed="true"` while the fans spin. Pressing it again stops them. It shows only when the build has a fan, so the tools row doesn't change as the camera moves. The clearance model's fans are discs (studio-3d-brief.md §2), so Phase 2 has no control |
| Default | Off, in every step, on every visit. The choice is never stored |
| Starting and stopping | The blades' speed eases from still to cruise over 500 ms (`--dur-seat`, with `ease-settle` applied to the speed), and back to still over 500 ms. The button's pressed state shows at once (rule 2) |
| Cruise | One turn a second: 6° a frame at 60 fps. A real fan's 1,000 to 2,000 RPM would turn the blades 100° to 200° a frame, and they would strobe. One turn a second stays far below half the blade spacing per frame (20° for 9 blades, 16° for 11), so the blades never seem to stop or run backwards |
| While spinning | The scene's only continuous rendering ([studio-3d-brief.md §4](studio-3d-brief.md#4-performance-limits)). The spin pauses while the canvas is off-screen or the tab is hidden, and resumes, still on |
| Reduced motion | No control: the fans never spin, so the button would do nothing. If the setting turns on while they spin, they stop at once and the control goes. The scene listens to the `change` event of `matchMedia('(prefers-reduced-motion: reduce)')`, not to `useReducedMotion()`, which reads only at mount (section 3) |
| Any other loop | An animated RGB effect, if Phase 3 previews one, follows the same rule, and never flashes more than three times a second (WCAG 2.3.1) |

### 7. Checked on a prototype

This is not the app, and not the reference laptop.
- **Setup:** the spec's utilities, compiled by the project's Tailwind 4.3.3 with tokens.css and
  base.css, in headless Chromium 141 at 1440 × 900 on this PC, 2026-10-02. The rolls used Motion
  13.4.6's own browser bundle (`animate()`). The overlay used `before:-z-1`, the value `z-under`
  will hold.
- **Interactions:** hover a row, press a button, then three rolls of the FPS range and the total.
- **Log:** `artifacts/screenshots/phase-1/WP-DS2/motion-designer/proto-log.json` in the
  design-lead worktree (git-ignored), with the page, the scripts and the negative controls' logs
  beside it.

| Run | Frames | Mean | p95 | Max | Over 20 ms | Long animation frames | Animated |
|---|---|---|---|---|---|---|---|
| Normal | 202 | 16.67 ms | 16.8 ms | 16.8 ms | 0 | None | CSS opacity and scale; Web Animations of transform and opacity |
| 4× CPU throttle | 205 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | None | The same |
| Reduced motion | 201 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | None | Nothing: 0 animations |
| Rolls written with `y` | 201 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | None | CSS opacity and scale; a Web Animation of opacity only, because `y` ran on the main thread |

The press, from the event to the first changed frame:

| Input | `data-pressed`: scale | `:active`: scale | Reduced motion, `data-pressed`: the overlay |
|---|---|---|---|
| Mouse | 19 ms | 29 ms | Already on, from hover |
| Touch, held 300 ms | 33 ms | 350 ms, only at the tap | 16 ms |
| Space | 32 ms | 3 ms | 17 ms |
| Enter | 28 ms | Never | 11 ms |

The slots' widths:

| Width | FPS slot | Total slot | What follows it |
|---|---|---|---|
| 390 | 139.2 px | 160.8 px | Never moved |
| 768 | 174.0 px | 201.0 px | Never moved |
| 1440 | 208.8 px | 241.2 px | Never moved |

- These held for every value up to the reserve, in Rig Lab Sans and in the fallback. Values
  tried: 8–12, 96–108, 142–158, 470–540 and 999–999; SAR 82.75, SAR 9,412.37, USD 2,431.97,
  SAR 99,999.99 and USD 99,999.99.
- Mid-roll, with both copies in the cell, the width held too.
- Past the reserve, 1,050–1,180 (both fonts) and SAR 123,456.78 (Rig Lab Sans) widened the slot,
  as specified.

The part row, 2026-10-03: components.md's draft markup, with the overlay on the radio's
stretched layer. `after:-z-1` stands in for `z-under`.

| Pointer over | Element hit | Overlay | The click went to |
|---|---|---|---|
| The row's padding, right of the price | The radio's layer | Shown | The radio |
| The gap under the checkbox | The radio's layer | Shown | The radio |
| The part name | The name, above the layer | Shown | The radio |
| The compare checkbox | The checkbox | Hidden | The checkbox |
| The figures button | The button | Hidden | The figures button |

The log is `row-overlay.json`, beside the others. `row-overlay-hovered.png` shows the text drawn
over the overlay, unchanged.

- **Still to measure, by qa-lead:** the real components on the reference laptop (BUILD_PROMPT §8),
  with the 3D scene rendering beside them.

## Measured on the mocks

Numbers from [`tools/motion-check.cjs`](tools/motion-check.cjs), run on 2026-09-30. Each run used
headless Chromium (build 1194) at 1440 × 900. It performed three real interactions: market to
USD, market back to SAR, then selecting the Ryzen 7 7800X3D. Every frame interval was recorded,
along with every long animation frame (`PerformanceObserver`, type `long-animation-frame`) and
the property list of every running animation. Full log:
`artifacts/screenshots/phase-0/WP-DS0/mocks/motion-log.json` (git-ignored).

| Mock | Run | Frames | Mean | p95 | Max | Frames > 20 ms | Long animation frames | Properties animated |
|---|---|---|---|---|---|---|---|---|
| Bench | normal | 146 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | transform, opacity |
| Bench | 4× CPU throttle | 155 | 17.74 ms | 16.7 ms | 83.3 ms | 4 | 55, 84, 65, 71 ms | transform, opacity |
| Bench | reduced motion | 143 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | none (0 animations) |
| Folio | normal | 143 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | opacity, transform |
| Folio | 4× CPU throttle | 155 | 17.10 ms | 16.8 ms | 33.4 ms | 4 | 54 ms | opacity, transform |
| Folio | reduced motion | 143 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | none (0 animations) |
| Studio | normal | 142 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | opacity, transform |
| Studio | 4× CPU throttle | 152 | 16.88 ms | 16.7 ms | 33.3 ms | 2 | none | opacity, transform |
| Studio | reduced motion | 143 | 16.67 ms | 16.7 ms | 16.8 ms | 0 | none | none (0 animations) |

**Reading it.**
- At normal speed all three hold 60 fps with no long frames.
- Under 4× CPU throttling, the only slow frames are the click frames themselves. The mocks
  re-render the whole list with `innerHTML` on each pick; the animations that follow stay at
  16.7 ms p95. The worst click frame (84 ms) is under the 200 ms INP budget even at 4× throttling.
  The real app must still render lists incrementally.
- This is headless Chromium on a shared container, **not the Core Ultra 7 155H reference laptop**.
  qa-lead re-measures on the reference machine (BUILD_PROMPT §8), and the 3D motion does not exist
  yet.

## Implementation notes for WP-DS1 and Phase 2

- Use the durations and easings above as tokens: the CSS utilities (`--dur-*`, `--ease-*` in
  `src/styles/tokens.css`) for states, and `motionSeconds()`, `delaySeconds()` and `easing` from
  `src/styles/motion.ts` for Motion. In Phase 2, CSS draws hover and pressed, and Motion animates
  changes under `MotionConfig`, with `useReducedMotion()` read in each animating component
  ([Studio: rules for Phase 2](#studio-rules-for-phase-2), sections 1 to 3).
- **No `layout` animations on part tables.** FLIP is transform-based, but measuring 40 or more
  rows on every change costs a layout read per row. Animate the changed values, not the list.
- The number swap needs a fixed-width slot: tabular figures plus a minimum width for the longest
  expected value. Otherwise the in-flow value can shift its neighbours. Made exact in WP-DS2, in
  em rather than `ch` ([section 5](#5-the-number-swaps-slot)).
- 3D motion (seating, camera) lives in `src/three/` and follows the same easing names, driven by
  `useFrame` damping rather than CSS.
