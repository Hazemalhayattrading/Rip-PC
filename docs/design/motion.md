# Motion specification (WP-DS0)

Owner: design-lead (motion-designer work, done by design-lead in this package) · 2026-09-30 · Status: for review

Motion is specified per direction. The chosen one becomes tokens in WP-DS1. All three share the
rules below. The mocks implement the number swap (all three), the market-toggle row fade (Bench)
and reduced motion (all three). Step changes and the 3D responses are specified here but not built.

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
   camera settling after a step change. Nothing loops except fans in the 3D view, and fans stop
   under reduced motion.
5. **Reduced motion** (`prefers-reduced-motion: reduce`):
   - every transform-based movement is removed;
   - numbers and lists swap instantly;
   - the 3D camera cuts instead of flying;
   - fans stop.

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
| Market toggle | Pill highlight slides; dock values roll | 240 ms slide, 360 ms roll | Instant |
| Lighting colour (Phase 3) | RGB emission lerps in the shader (not a CSS animation) | 400 ms | Instant |

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

- Use Motion (Framer Motion) `animate` with the durations and easings above as tokens
  (`--dur-*`, `--ease-*` in `src/styles/tokens.css`). Read `useReducedMotion()` once at the root.
- **No `layout` animations on part tables.** FLIP is transform-based, but measuring 40 or more
  rows on every change costs a layout read per row. Animate the changed values, not the list.
- The number swap needs a fixed-width slot: tabular figures plus a `min-width` in `ch` for the
  longest expected value. Otherwise the in-flow value can shift its neighbours.
- 3D motion (seating, camera) lives in `src/three/` and follows the same easing names, driven by
  `useFrame` damping rather than CSS.
