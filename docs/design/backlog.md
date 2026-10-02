# Design backlog: WP-DS2 (Phase 1)

Owner: design-lead · Opened 2026-10-01 · Status: **every item specified** (WP-DS2 batches 1
and 2, 2026-10-02 to 2026-10-03). Where each one now lives is in [the status table](#status-where-each-item-lives).

These items come from the skill review of WP-DS1, done on 2026-10-01 and checked against the
installed packages:
- skills: core-web-vitals, accessibility, web-design-guidelines, frontend-design,
  ui-ux-pro-max, motion-framer, react-three-fiber, r3f-materials, r3f-lighting, r3f-loaders,
  r3f-textures, blender-web-pipeline, threejs-webgl;
- installed versions: three 0.186.1, R3F 9.8.1, drei 10.7.9, postprocessing 6.39.5, motion
  13.4.6.

They are specification gaps, not defects in shipped tokens. The one defect the review found, the
`::selection` contrast, was fixed in Phase 0 ([tokens.md §2.1](tokens.md#21-colour), rule 11).

The Director scheduled them as **WP-DS2, in Phase 1**, in parallel with the engine. Most items are
specs for Phases 2 and 3. Items 5 to 8, 13 and 15, and item 10's token, ship in `src/styles/`
with tests (the status table at the end).

| # | Area | Gap, and the fix | Skill or rule | Evidence |
|---|---|---|---|---|
| 1 | Accessibility | Focus hidden under fixed chrome. Scroll containers under the top bar, dock and sheets set `scroll-padding` from `--topbar` and `--dock`; the Specs grid also pads for its sticky header and pinned columns | WCAG 2.2 SC 2.4.11; web-design-guidelines (sticky bars must not cover focus) | The dock floats over the sheet's last rows at 768 and 390 (`mocks/studio/768-dark.jpg`) |
| 2 | Accessibility | Controls that hold text use `min-height`, not a fixed `height`, so user text spacing never clips them (`min-h-control`, `min-h-chip`) | WCAG 1.4.12 | `--spacing-control` and `--spacing-chip` are fixed heights ([tokens.md §2.5](tokens.md#25-layout)) |
| 3 | Accessibility | Forced colours (Windows High Contrast). A state drawn only by a background also gets a border, outline or `currentColor` glyph | accessibility (high-contrast testing); ui-ux-pro-max `state-clarity` | The mock's checked checkbox is `background: var(--ink)` and the selected-row bar is a background (`mocks/studio/index.html` lines 167, 169) |
| 4 | Accessibility | Hit areas are at least 44 × 44 px under `pointer: coarse`, extending past the drawn control; 24 px stays the floor everywhere | ui-ux-pro-max `touch-target-size`; WCAG 2.2 SC 2.5.8 | Chips 30 px, phone tool buttons 36 px, checkbox 18 px (mock lines 159, 261, 168) |
| 5 | Accessibility | Form inputs at least 16 px on touch screens, so iOS does not zoom (`base.css`, `!important` in the base layer) | ui-ux-pro-max `readable-font-size` | The control roles are 14 px (`type-control`) and 15 px (`type-body`) |
| 6 | Layout | Safe-area tokens for the full-bleed stage: `--safe-top`, `--safe-right`, `--safe-bottom`, `--safe-left` from `env(safe-area-inset-*)`; chrome offsets are `max(var(--gutter), var(--safe-*))`. `viewport-fit=cover` lands with the Phase 2 frame | web-design-guidelines (full-bleed needs safe areas); ui-ux-pro-max `safe-area-awareness` | `tokens.css` has no safe-area tokens; `index.html` has no `viewport-fit` |
| 7 | Touch | `touch-action: manipulation` on controls; `overscroll-behavior: contain` on sheets and the Specs panel | web-design-guidelines (touch and interaction) | `base.css` sets neither |
| 8 | Theming | A native `<select>` and its options get an explicit `background-color` and `color` (Windows dark mode) | web-design-guidelines (dark mode and theming) | Preflight makes select backgrounds transparent; `base.css` adds nothing |
| 9 | States | Disabled: opacity 0.4, the not-allowed cursor (already in `base.css`), and `disabled` or `aria-disabled`. A blocked part's text is not "disabled": it stays `--ink-2` | ui-ux-pro-max `disabled-states` | The mock fades its disabled checkbox to 0.35 (line 171); `tokens.md` has no disabled rule |
| 10 | Motion | Hover never animates colour. It fades an overlay layer's opacity over 160 ms: no lift, no shadow, no scale. Correct the `--dur-ui` comment, which says "hover" | motion.md rule 1; frontend-design (hover transitions on every card); ui-ux-pro-max `state-transition` | `tokens.css` `--dur-ui` comment; [specs-view.md §3](specs-view.md#3-rows) fades a background over 160 ms |
| 11 | Motion | Pressed state: `scale(0.97)`, `ease-settle`, 160 ms; feedback starts within 100 ms | ui-ux-pro-max `scale-feedback`, `tap-feedback-speed` | `tokens.md` has no pressed-state rule |
| 12 | Motion | The app root wraps in `<MotionConfig reducedMotion="user">`, and `useReducedMotion()` feeds `motionSeconds()` | motion-framer; Motion 13.4.6 types (`reducedMotion: "always" \| "never" \| "user"`) | [tokens.md §1.4](tokens.md#14-motion-from-script) does not say so |
| 13 | Motion | A type-level test of `motion.ts` against Motion's `Transition` type, so an API change breaks `tsc`, not the UI | motion-framer; CLAUDE.md rule 7 | `easing` matches `BezierDefinition` (`readonly [n, n, n, n]`), checked by hand only |
| 14 | Specs view | Meta strings joined with middle dots become commas and sentences: "Prices as of 30 Sep 2026, 9 of 12 priced. Sources". The view switch is a pill group labelled "View" | frontend-design (template chrome) | [specs-view.md §1](specs-view.md#1-where-it-lives) and §5 |
| 15 | Specs view | Reason lines capped at 65 characters (`max-w-[65ch]`); `tokens.md` gains a measure rule of 45–75 characters | frontend-design (under 80 characters); ui-ux-pro-max `line-length` | Reason lines span the 960 px table: about 150 characters at 13 px |
| 16 | Specs view | Empty state: "No processors match these filters." with a "Clear filters" button | frontend-design (empty states invite action); web-design-guidelines (content handling) | [specs-view.md](specs-view.md) has no empty state |
| 17 | Specs view | Long part names wrap to two lines, then truncate; the full name is the accessible name and shows in the callout | web-design-guidelines (long content) | Seed names reach "ASUS TUF Gaming GeForce RTX 5070 Ti 16GB GDDR7 OC Edition" |
| 18 | Specs view | View, sort and filters live in the URL, agreed with build-lead on 2026-10-01. Each is its own parameter next to `b`, never inside it: `view=specs` (absent means list; any other value means list), `sort=<column-id>-<asc\|desc>` (the direction is the last hyphen segment), `filter=<chip-id>,<chip-id>` (unknown ids drop one by one). Ids come from typed tables with a pinned test, stable and never reused. Updates use `replaceState`; dropped values give the codec's notice; the theme stays out. **`view` carries across part steps; sort and filters belong to their step** (Back restores them from history). WP-DS2 writes this into specs-view.md §1 and §4 | web-design-guidelines (URL reflects state); ui-ux-pro-max deep linking | [specs-view.md §1](specs-view.md#1-where-it-lives) stores `rig-lab-view` in `localStorage`; build-lead's proposal, 2026-10-01 |
| 19 | Specs view | Up to 80 rows: `content-visibility: auto` on rows; virtualize only if INP measurements need it | web-design-guidelines (lists over 50 items) | BUILD_PROMPT §4 scope: 40–80 GPUs per step |
| 20 | Copy | `translate="no"` on part names, model numbers, rule ids and units | web-design-guidelines (locale and i18n) | Saudi audience; Chrome offers to translate English pages into Arabic |
| 21 | Copy | Dates from `Intl` en-US parts in day-month-year order ("30 Sep 2026"); money from `Intl.NumberFormat` with `currencyDisplay: 'code'` | web-design-guidelines (`Intl.*`, no hardcoded formats) | Node 24, ICU 78.3, measured 2026-10-01: en-GB prints "30 Sept 2026"; the currency format puts U+00A0 after the code |
| 22 | Font loading | **Measured in the app by build-lead** (WP-B1 Part 2, applied throttling): the preload costs LCP, 2,117 ms against 1,775 ms without it, because first paint waits for the JS the font shares bandwidth with. All inside 2.5 s. Phase 0 keeps the preload (Director, 2026-10-01). **Phase 2:** render the shell text into the static route HTML, so LCP stops waiting for JS; then measure preload against no preload again under applied throttling. QA adds an applied-throttling LCP check at Phase 2 entry (QA-P0-006) | core-web-vitals (preload only with trace evidence); Director's decision | [tokens.md §4.2](tokens.md#42-why-swap-and-what-it-costs-measured); build-lead's logs `artifacts/logs/wp-b1/lh-devtools-*.json` |
| 23 | 3D | Fans spin only when the visitor turns them on, and the same control stops them | WCAG 2.2.2; motion.md rule 4; web-design-guidelines (autoplay over 5 s needs a pause) | [studio-3d-brief.md §4](studio-3d-brief.md#4-performance-limits) spins fans in Looks and Review automatically |
| 24 | 3D | Every drag has an alternative: orbit by buttons in steps and by arrow keys; the phone sheet expands with a button | WCAG 2.2 SC 2.5.7; web-design-guidelines (gesture alternatives) | [studio-3d-brief.md §3.1](studio-3d-brief.md#31-camera) orbits by drag; direction.md §4 drags the sheet |
| 25 | 3D | `<Canvas shadows="percentage">` (PCF, soft from r182). Bare `shadows` selects the deprecated PCFSoftShadowMap. The key light's shadow camera fits the case's bounds | r3f-lighting | three 0.186.1 installed; brief §3.2 says only "a 1024² shadow map" |
| 26 | 3D | The environment is built from drei `Lightformer`s, captured once (`frames={1}`), or is a self-hosted HDRI; never a drei preset (external CDN) | r3f-lighting | Brief §3.2 names Poly Haven HDRIs and no hosting |
| 27 | 3D | The cyclorama is unlit in the token colours (`toneMapped: false`), and the floor shadow comes from a `ShadowMaterial` catcher. A pixel probe checks the render against `--stage` (±1 per channel, both themes) | threejs-webgl (colour management) | Brief §3.2 assumes a lit cyclorama renders at the CSS colour |
| 28 | 3D | Selective bloom: emissive materials `toneMapped: false` with intensity above 1; Bloom with a high `luminanceThreshold`, `mipmapBlur` and `resolutionScale: 0.5` | threejs-webgl; r3f-materials (emissive lights nothing) | postprocessing 6.39.5 types have these options |
| 29 | 3D | `EffectComposer` multisampling starts at 4, or 0 with SMAA, on the iGPU; the default is 8 | threejs-webgl; BUILD_PROMPT §8 | `@react-three/postprocessing` 3.1.3 source: `multisampling = 8` |
| 30 | 3D | With `frameloop="demand"`, invalidate every frame during camera moves and seating. `PerformanceMonitor` samples only while frames render | react-three-fiber | Brief §4 asks for render on demand without saying so |
| 31 | 3D | Part swaps keep the old part as the Suspense fallback until the new one is ready. drei `Detailed` for LOD; `Clone` or instancing for RAM sticks and fans; `dispose={null}` on shared cached subtrees. An error boundary retries, and the clearance volume stays | react-three-fiber (pitfall 4); r3f-loaders | Brief §4 says "loads lazily" only |
| 32 | 3D | Decoders (Meshopt preferred, Draco, the Basis transcoder) self-hosted under `/Rip-PC/` and counted in the 6 MB first-build budget | r3f-loaders | drei's default Draco decoder loads from an external CDN; brief §4 budget table |
| 33 | 3D | Glass: `transparent`, `depthWrite: false`, front side, overlaps tested. Colour maps sRGB, data maps `NoColorSpace`. One shared instance per library material, cloned only for per-build colours | r3f-materials; r3f-textures | [studio-3d-brief.md §3.3](studio-3d-brief.md#33-materials) |
| 34 | 3D | The texture budget states GPU memory: a 2K map with mipmaps is about 22 MB uncompressed, 5.6 MB UASTC, 2.8 MB ETC1S. Anisotropy about 4 on brushed metal; `flipY = false` for replacement glTF maps | r3f-textures (download size is not GPU memory) | Brief §4: 160 MB texture budget |
| 35 | 3D | Near and far planes fit the case; glass is separated from its frame (no z-fighting). The 30° field of view is deliberate (a product lens) | threejs-webgl | [studio-3d-brief.md §3.1](studio-3d-brief.md#31-camera) |
| 36 | 3D | A delivery spec for any model, bought, commissioned or CC BY: GLB, metres, +Y up, real scale, transforms applied, origin at the mounting reference, Principled BSDF only with library material names, no lights or cameras, LOD0 and LOD1 within the per-part budget | blender-web-pipeline (pre-export checklist) | Brief §5 and §7 have no delivery spec |
| 37 | 3D pipeline | On this PC: gltf-transform 4.5.1 (`simplify`, `meshopt`, `resize`, `webp`) works; there is no Blender and no Python | blender-web-pipeline; brief "This PC" | Checked 2026-10-01 |
| 38 | 3D pipeline | **KTX2 needs KTX-Software's `toktx`** (gltf-transform `etc1s`, `uastc`). It is not on this PC, and installing it is a system install on Hazem's PC, which the Director is putting to him. **Phase 3 depends on his answer.** Without it, textures ship as WebP, and the 160 MB budget holds about 7 uncompressed 2K maps | CLAUDE.md (Hazem decides installs) | `where toktx` found nothing, 2026-10-01 |
| 39 | Team | 3d-artist worker prompts include the seven 3D skills | Director's skills note, 2026-10-01 | — |
| 40 | 3D assets | The paid-asset research did not cover ArtStation or Unity Asset Store licences | studio-3d-brief.md §9 (the known gaps; §8 before WP-DS2 added the delivery spec) | The 3d-artist worker's report |
| 41 | Layout | Text zones at every width: the camera's view offset frames the build outside the step heading and its hint, the 3D tools row and their captions, so nothing of the scene sits behind text. Small text on the floor is token-safe since DS0-01 (`--ink-3` 4.61:1 at the floor's near edge) | [tokens.md §2.1](tokens.md#21-colour), rule 4; WCAG 1.4.3 | QA DS0-01 at 768 light: the hint's last word runs into the case top (1.56:1), and the mock label sits over the case (2.38:1). qa-lead's `defects/studio-768-light-text-over-case.png` |
| 42 | Accessibility | Keyboard selection in the part list (Phase 2): the rows are a single-select radiogroup. One tab stop, arrow keys move, Space selects, and a blocked row announces its reason. The compare checkbox is a separate control, outside the radio | WCAG 2.1.1 (A); qa-lead DS0-02 | The mock's `.part` is `role="option"` with `tabindex=-1`; its only focusable child is the compare checkbox, and there is no select control |
| 43 | Accessibility | ARIA structure and names: no `role=option` outside a listbox (item 42 removes options), and no control nested inside another. Accessible names come from visible or visually hidden text, never `aria-label` on a span with no role. The confidence word ("Medium confidence") is real text beside its three-step mark | axe `aria-required-parent`, `nested-interactive`, `aria-prohibited-attr`; qa-lead DS0-04 | 6 options with no listbox, a checkbox inside an option, and `aria-label` on the role-less confidence span in the mock |
| 44 | Estimates | **The dock never shows an estimate without its labels.** At every width the FPS readout shows the range, the word "estimated", the confidence word and mark, and the test conditions (shortened at 390, never dropped). Captions are `type-caption` (12 px floor). In the product this is a Blocker class | CLAUDE.md rule 2; QA test plan §14; qa-lead DS0-05 | At 390 the mock's dock hides the confidence word and the conditions, shows no "estimated", and sets its captions at 11 px |
| 45 | Accessibility | No ancestor's overflow may clip a focus ring: padding inside clip and scroll containers, `overflow: clip` with `overflow-clip-margin`, or an inset ring (-2 px, as in the Specs grid). Goes into tokens.md rule 6 | WCAG 2.4.7; qa-lead DS0-07 | The Studio mock's Next button loses 1 px of its focus ring |
| 46 | Credits | Before any 3D asset ships, its CREDITS row records the model URL, the author's handle and profile link, the licence and its version, and an archived copy of the model page. The survey now carries the handles (DS0-13, done 2026-10-01) | CC BY 4.0 attribution; qa-lead DS0-13 | [3d-asset-survey.md](3d-asset-survey.md), the Author column |
| 47 | Accessibility | The skip link stays visually hidden until focused. Then it shows as a `--surface` pill at the top left (`--gutter` offset, `z-toast`, the focus ring) and moves focus to `<main>` | WCAG 2.4.1; Director's Phase 2 note (WP-B1 review) | The Phase 0 skip link shows all the time (build-lead, WP-B1 Part 2) |
| 48 | Components | The "Light theme" toggle gets its button styling: the round top-bar button, with its icon, `aria-pressed` and the round-button spec | [tokens.md §1.3](tokens.md#13-the-theme-switch); Director's Phase 2 note | The Phase 0 toggle is text only, with no button chrome under Preflight (build-lead) |
| 49 | Accessibility | Standalone links (site nav, build steps, previous and next) get a 24 px hit area (`min-h-6` with `inline-flex items-center`, or block padding). Links inside sentences are exempt | WCAG 2.2 SC 2.5.8; [tokens.md §2.5](tokens.md#25-layout); Director's Phase 2 note | The Phase 0 placeholder links are 22 px tall (build-lead) |

**Already recorded by the Director for Phase 2:**
- the compare checkbox drawn at 18 px needs a 24 px hit area (44 px on touch, item 4);
- the mock's list puts a checkbox inside `role="option"`, which ARIA does not allow
  ([specs-view.md §10](specs-view.md#10-known-gaps));
- Android has neither Arial nor Liberation Sans, so text starts in unadjusted Roboto (4.52 %
  narrower). A `local('Roboto')` face at 104.74 % needs a real-device test
  ([tokens.md §7](tokens.md#7-known-gaps)).

## Status: where each item lives

Every item is now a spec in the file and section below, or shipped where the row says. Batch 1 was
merged as `427d241`. Batch 2 is on `feat/design-ds2`: the ui-designer wrote items 1 to 9, 14, 16
to 22, the sheet's part of 24, 41 to 43 and 47 to 49; the motion-designer 10 to 13 and 23's motion
rule; the 3d-artist 23 and 24's 3D parts, 25 to 38, 40 and 46. design-lead reviewed every item.

| # | Status | Where it lives now |
|---|---|---|
| 1 | Specified | [tokens.md §2.5](tokens.md#25-layout), "Focus never hides under the chrome"; [specs-view.md §6](specs-view.md#6-keyboard-and-screen-readers) |
| 2 | Specified | tokens.md §2.5, "Named sizes": `min-h-*` for anything that holds text |
| 3 | Specified | [tokens.md §2.1](tokens.md#21-colour), rule 12 (forced colours, measured) |
| 4 | Specified | [components.md §1](components.md#1-hit-areas); [lab-spec.md §9](lab-spec.md#9-accessibility-checklist) (QA-P1-003) |
| 5 | **Shipped** | `src/styles/base.css` (`56096a8`), tested; tokens.md §3 |
| 6 | **Shipped** | `src/styles/tokens.css`, the `--safe-*` tokens (`56096a8`), tested; tokens.md §2.5, "Safe areas" |
| 7 | **Shipped** | `base.css` (`56096a8`), tested; [components.md §8](components.md#8-the-phone-sheets-expand-button); specs-view.md §1 |
| 8 | **Shipped** | `base.css` (`56096a8`), tested; tokens.md §3 |
| 9 | Specified | [components.md §2](components.md#2-buttons-and-their-states); tokens.md §2.1, rule 3 |
| 10 | Specified, token shipped | [motion.md, Studio rules §1](motion.md#studio-rules-for-phase-2); `--z-under` in tokens.css, test first; the `--dur-ui` comment |
| 11 | Specified | motion.md, Studio rules §2 |
| 12 | Specified | motion.md, Studio rules §3; `motion.ts` takes `boolean \| null` |
| 13 | **Shipped** | `src/styles/motion.types.test.ts`, checked by `tsc -b`, with two negative controls; motion.md, Studio rules §4 |
| 14 | Specified | [specs-view.md §1 and §5](specs-view.md#1-where-it-lives) |
| 15 | **Shipped** (batch 1) | `max-w-measure` in tokens.css; tokens.md §2.5, "The reading measure" |
| 16 | Specified | specs-view.md §4, rules 8 and 9: "No CPUs match these filters." |
| 17 | Specified | specs-view.md §2 and §3 (measured at 15rem and 11rem) |
| 18 | Specified | specs-view.md §1 and §4, rule 7 |
| 19 | Specified | specs-view.md §3: no virtualisation until INP asks for it |
| 20 | Specified | [tokens.md §2.4](tokens.md#24-type), rule 9; lab-spec.md §9 |
| 21 | Specified | [copy-guide.md §3 and §12](copy-guide.md#3-numbers-and-units); tokens.md §2.4, rule 6 |
| 22 | Decided | tokens.md §4.2: the Director's decision stands until Phase 2 measures it (QA-P0-006) |
| 23 | Specified | motion.md, rule 4 and Studio rules §6; [studio-3d-brief.md §4](studio-3d-brief.md#4-performance-limits) |
| 24 | Specified | studio-3d-brief.md §3.1 (the orbit); components.md §8 (the sheet) |
| 25 to 28 | Specified | [studio-3d-brief.md §3.2](studio-3d-brief.md#32-light) |
| 29 to 32 | Specified | studio-3d-brief.md §4 |
| 33 | Specified | studio-3d-brief.md §3.3 |
| 34 | Specified | studio-3d-brief.md §4, with §3.3 |
| 35 | Specified | studio-3d-brief.md §3.1 |
| 36 | Specified | studio-3d-brief.md §8, the delivery spec (new) |
| 37 | Specified | studio-3d-brief.md §5, "The pipeline on this PC" |
| 38 | **Closed** | KTX-Software 4.4.2 is installed (Hazem approved, 2026-10-02): textures ship as KTX2. studio-3d-brief.md §5 and §3.3 |
| 39 | Done | The 3d-artist's batch 2 prompt named the seven 3D skills |
| 40 | Specified | studio-3d-brief.md §6 (ArtStation and Unity rows), §9 and §10 |
| 41 | Specified | [components.md §9](components.md#9-text-zones-in-the-studio-frame); tokens.md §2.1, rule 4 |
| 42, 43 | Specified | [components.md §7](components.md#7-the-part-list-a-single-select-radiogroup), with §2 |
| 44 | Specified (batch 1) | [lab-spec.md §6](lab-spec.md#6-the-estimate-readout) |
| 45 | Specified (batch 1) | tokens.md §2.1, rule 6 |
| 46 | Specified | studio-3d-brief.md §8, "Credits come before shipping"; data-lead asked for the archive column |
| 47 | Specified | [components.md §5](components.md#5-the-skip-link) |
| 48 | Specified | [components.md §3](components.md#3-the-theme-toggle) |
| 49 | Specified | [components.md §4](components.md#4-standalone-links) |
| QA-P0-018 | Specified (batch 1); QA to check (WP-Q4) | tokens.md §2.1, rule 2 |
| QA-P0-019 | Specified (batch 1); QA to check (WP-Q4) | tokens.md §2.1, rule 6 |
| QA-P1-001 | Specified (the focus rule) | [components.md §6](components.md#6-focus-on-a-page-or-step-change); the fix is build-lead's |
| QA-P1-003 | Fixed (`fe6b187`); QA verified it | lab-spec.md §9 |
