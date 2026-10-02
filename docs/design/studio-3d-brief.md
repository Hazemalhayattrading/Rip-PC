# Studio 3D brief (Phases 2 and 3)

Owner: design-lead (art direction) · For: build-lead's 3d-engineer, design-lead's 3d-artist, and
Hazem for section 7 · Date: 2026-10-01, updated 2026-10-03 for WP-DS2 (backlog items 23 to 38, 40
and 46) · Status: ready for review

Studio puts the build full-screen under studio light ([direction.md §4](direction.md#4-direction-c-studio)).
That makes the 3D the product's face, and its three known risks are all 3D risks:
- **quality:** no faithful free models of current parts exist;
- **cost:** it is the heaviest of the three directions for a laptop GPU;
- **timing:** it looks weak until the 3D exists.

This brief sets what the stage must show, an early model for Phase 2, the camera, light and
material direction, the performance limits, the paid-asset options Hazem decides on, and what any
delivered model must meet.

It builds on the [3D asset survey](3d-asset-survey.md) of 2026-09-30 (free CC0 and CC BY models),
and on a 3d-artist worker's research of paid options on 2026-10-01 (section 7). The design lead
reviewed that research before it went in here.

**Checked against the installed packages,** read from `node_modules/<package>/package.json` on
2026-10-02: three 0.186.1, @react-three/fiber 9.8.1, @react-three/drei 10.7.9,
@react-three/postprocessing 3.1.3 and postprocessing 6.39.5. Where a rule depends on how one of
them behaves, the file and line are cited, so an upgrade can be re-checked. Paths are under
`node_modules/`; Context7 was the cross-check (section 10).

---

## 1. What the stage must show

**The rule that governs everything: the stage never shows a size we cannot source.** Clearance is
Rig Lab's promise ("GPU 304 mm of 355 mm"), so every length that the stage draws or implies comes
from a catalogue field with its source (CLAUDE.md rule 1). Anything else is representative, and
says so.

| Phase | The stage shows |
|---|---|
| **2, the builder** | The build at **true size**: the case shell and every picked part as a true-size volume. The camera moves to the part each step is about. When a fit is tight or fails, the measurement is drawn on the model, with its numbers in a callout. |
| **3, the garage** | The same build, photoreal and assembling live (BUILD_PROMPT §2): the board drops in, the CPU seats, RAM clicks, the GPU slides into its slot, cables route, fans spin, RGB follows the chosen colour. Look options, orbit, zoom, an exploded view, the side panel open, an interior light. |

**Truth rules for both phases**
1. **Dimensions come from catalogue fields only.** The fields in data-lead's WP-D0 schema:
   - case: `dimensionsMm`, `gpuClearance[].maxLengthMm` (each with its `condition`),
     `coolerClearance[].maxHeightMm`, `radiatorSupport[]`, `psu.maxLengthMm`,
     `supportedBoards`, `layoutPositions` (for cases with more than one layout), `sidePanel`;
   - GPU card: `lengthMm`, `heightMm`, `thicknessMm`, `slots`;
   - cooler: `heightMm`, `ramClearanceMm`, and the radiator's `radiatorLengthMm`,
     `radiatorWidthMm`, `radiatorThicknessMm` and `fanSizeMm`;
   - RAM: `heightMm`; PSU: `formFactor`, `lengthMm`; case fan: `sizeMm`, `thicknessMm`.
2. **Where the catalogue has no number, the stage draws no measurement.** A part with an
   unpublished size is a neutral volume. Its callout says "Size not published by the maker", and
   no clearance is shown for it.
3. **Positions inside the case come from the form-factor standards,** not from a guess about one
   case. That covers the board outline, the mounting holes, the rear I/O, the expansion slots at
   20.32 mm pitch, and the ATX and SFX PSU sizes. Each standard is cited like any other source. A
   case's own internal layout (shroud height, cable space) is not in the data, so the shell is
   drawn empty and honest: the outer box from `dimensionsMm`, the glass side from `sidePanel`.
4. **"Representative model" is said in words** whenever the geometry is not the exact product:
   in the part's callout and its info panel, in `type-caption`, `--ink-3`, never over the model.
   That is BUILD_PROMPT §7's rule.
5. **No trademarks on representative models.** No logos, no copies of a maker's signature
   design: the GeForce Founders Edition shroud, Fractal's wood front, Noctua's colours. A
   representative GPU is a clean generic card at the real length, height and slot thickness.
6. **The 3D never carries the only signal.** A failing fit shows on the model, as a red-free
   measurement (section 2), and also in the UI with its icon, word and reason
   ([tokens.md §2.1](tokens.md#21-colour), rule 2). The UI owns the states; the stage illustrates
   them.

---

## 2. Phase 2: the clearance model (an early real-dimension model)

Phase 2 ships the builder before the photoreal garage. Studio cannot open on an empty stage, so
Phase 2 gets a **clearance model**: parametric geometry built in `src/three/` from the fields in
section 1, in one restrained style. It is accurate by construction, a few KB of code, and free of
licence and trademark questions. In Phase 3 it becomes the low-end fallback and the exploded and
measured view.

**Geometry**
- **The case:** a rounded box at `dimensionsMm`, 1.5 mm wall, open on the glass side. The glass
  side is a thin pane, or a steel panel if `sidePanel` says solid.
- **The layouts:** a tower (the board on the right wall, PSU at the bottom rear) and a sandwich
  for small cases with `layoutPositions` (the Fractal Terra: the GPU behind the board, on a
  riser). The case's `size` and `layoutPositions` choose between them.
- **The board:** its form-factor outline (ATX, Micro-ATX, Mini-ITX), standoff plane and rear I/O
  per the standard. The socket, DIMM slots and M.2 slots sit in a representative position that is
  the same for every board. The caption says so.
- **The parts:** GPU, cooler, RAM, PSU, radiators and fans as rounded boxes and cylinders, at their
  catalogue sizes. Fans show a hub and a blade disc, no blades.

**Look**
- Two neutral materials only: powder-coated steel for the shell, matte plastic for the parts.
- The part of the current step gets the key light, a 1.25× exposure lift on its own material, and
  the camera. The rest sit back.
- No colour except the RGB light (`--scene-light`, or the build's colour from the Looks step).

**Measurements on the model**, only at the steps that check them. The values are illustrative;
the real ones come from the build's parts.

| Step | Drawn on the model | Callout text (`type-label` and `type-small`) |
|---|---|---|
| GPU | A dimension line along the card, ending at the case's limit | "304 mm of 355 mm" and the clearance's `condition`, for example "with no front radiator" |
| Cooling (air) | Cooler height against the side panel | "158 mm of 170 mm" |
| Cooling (AIO) | The radiator's footprint on its mount position | "360 mm radiator, front: fits, up to 55 mm thick" |
| RAM | DIMM height under the cooler's overhang | "RAM 44 mm, room under the cooler 54 mm" |
| PSU | PSU length against the case's limit | "160 mm of 180 mm" |
| Case | All of the above at once, in the exploded view | One line per check, with its state |

Lines are `--ink` at 70 % opacity, 1 px, with 4 px ticks. A line that fails is drawn **dashed**,
not red, and its callout carries the state (rule 6). Numbers use tabular figures, with the unit
after a no-break space.

**Budget:** under 20k triangles, under 30 draw calls, no textures, and one floor shadow: the key
light's 1024² map, redrawn only when a part changes (section 3.2). Phase 2 renders without the
post-processing composer, so it has no bloom (section 3.2, the render paths). It must hold 60 fps
on anything that runs WebGL 2, so it doubles as the fallback.

**Without WebGL 2** (the scaffold already detects this): show the stage background
([tokens.md §2.1](tokens.md#21-colour)) and a static isometric drawing of the case at its real
size, built like the WP-DS0 placeholder ([`tools/iso-case.mjs`](tools/iso-case.mjs)), with the
same callouts.

---

## 3. Camera, light and materials (art direction)

The mood is unchanged from the survey: a product film, a dark cyclorama, a strong key and a rim,
glossy glass, RGB that glows ([3d-asset-survey.md](3d-asset-survey.md#lighting-and-material-mood-per-direction)).
One change: the survey's Studio HDRI gives way to an environment built from Lightformers, with the
HDRI as the fallback (section 3.2).

### 3.1 Camera

- **Lens:** perspective, 30° vertical field of view (34° on phones), never wider than 40°. **The
  30° is deliberate: a product lens.** On a full-frame sensor, 24 mm tall, 30° is a 44.8 mm lens
  (12 mm ÷ tan 15°); 34° is 39.3 mm, and the 40° limit is 33.0 mm. These are normal lenses: the
  case's verticals barely converge at the edges, and the step close-ups need no long dolly. A
  longer lens would flatten the case further but push the camera far back for every close-up.
- **Clipping planes fit the build.** Scene units are metres (section 8). Near 0.05 m, far 10 m.
  The zoom limits keep the camera at least 0.15 m from every surface and at most twice the hero
  shot's distance, and nothing drawn in the world (the shadow catcher, section 3.2) is farther
  than about 4 m. With 24-bit depth, the smallest depth step is about distance² ÷ (near × 2²⁴):
  0.002 mm at 1.2 m, 0.011 mm at 3 m.
- **Glass never shares a plane with its frame.** The pane sits at least 0.5 mm inside its frame's
  opening, so no transparent face is coplanar with an opaque one; 0.5 mm is more than 40 times
  the worst depth step above, so nothing flickers.
- **Framing:** the build fills the free area: below the top bar, above the dock, and left of the
  rail from `lg` (`--topbar`, `--dock` and `--rail-width` in [tokens.md §2.5](tokens.md#25-layout)).
  It stays outside the text zones (components.md): the step heading and its hint, the 3D tools
  row and their captions, so no text ever sits over the build ([tokens.md §2.1](tokens.md#21-colour),
  rule 4). Shift the camera's view offset rather than move the camera, so perspective stays true
  when the rail opens.
- **One shot per step.** The first pass is below; it is tuned against the real scene in Phase 2.

| Step | Shot |
|---|---|
| Use case, Budget | Hero: three-quarter front left, yaw 35°, pitch 12°, the whole case |
| CPU | Close on the socket through the glass; the cooler lifts away if one is picked |
| Motherboard | Side view through the glass, the whole board |
| RAM | Close on the DIMM slots, from slightly above |
| GPU | Low three-quarter along the PCIe slot, so the card's length reads |
| Storage | Close on the M.2 slots |
| PSU | Low rear three-quarter, into the PSU bay |
| Cooling | Top three-quarter: cooler height against the side panel, or the radiator's mount |
| Case | Hero, exterior |
| Looks | Hero with the interior light on |
| Review | Hero, then the visitor's own orbit |

- **Moves:** 700 ms with `ease-dolly` (`--dur-camera`, [tokens.md §2.6](tokens.md#26-motion)).
  One move per step change. A new step during a move retargets from the current pose; it never
  queues. Each move keeps the frame loop running while it lasts (section 4, render on demand).
- **Reduced motion:** no camera moves. A 200 ms crossfade (`--dur-cut`) cuts to the next shot.
- **The visitor's orbit:**
  - **Drag** to orbit, within yaw ±160° and pitch 0–35°. **Scroll or pinch** to zoom, within the
    limits above. **Double-click or Reset** returns to the step's shot.
  - **Every drag and pinch has a single-pointer and a keyboard alternative** (WCAG 2.2 SC 2.5.7,
    dragging movements; SC 2.5.1, pointer gestures).
  - **Buttons:** the 3D tools row's Orbit button opens an orbit pad: Turn left, Turn right, Tilt
    up, Tilt down, Zoom in, Zoom out. Reset stays in the row. Each is a round 3D tool button as
    components.md sizes them: 40 px from md and 36 px on phones, with a 44 px hit area under
    `pointer: coarse` (backlog item 4).
  - **Steps:** one press turns 20° (16 presses cover the yaw range), tilts 7° (5 cover the pitch
    range), or zooms by a factor of 1.25 in distance. A press moves over 360 ms (`--dur-value`)
    with `ease-dolly`; a press during a move retargets from the current pose, like a step change.
    With reduced motion a press jumps, with no crossfade: the view changes too little to need one.
  - **Keys:** the stage is one tab stop (`tabindex="0"`), with the focus ring
    ([tokens.md §2.1](tokens.md#21-colour), rule 6) and a visually hidden hint that names the
    keys. While it has focus, ← and → turn, ↑ and ↓ tilt, + and − zoom, and Home returns to the
    step's shot. Each press is one step, and a held key repeats at the system rate. The stage
    stops these keys from scrolling the page. They act only while the stage has focus, so the part
    list's arrow keys (backlog item 42) never move the camera.
- **Nothing moves on its own.** No idle turntable: motion.md's rule 4 bars looping motion, and a
  still scene costs no power. Fans spin only when the visitor turns them on (section 4).

### 3.2 Light

**Two render paths.** Tone mapping works differently with and without the post-processing
composer, and the rules below depend on it.
- **Phase 2 renders without a composer,** so no bloom. The renderer tone-maps each material: set
  `gl.toneMapping = THREE.NeutralToneMapping` through the Canvas's `gl` prop, because R3F's
  default is ACESFilmic (the note on the `flat` prop,
  `@react-three/fiber/dist/declarations/src/core/configuration.d.ts`).
- **Phase 3 always mounts `<EffectComposer>`.** While it is mounted it sets
  `gl.toneMapping = NoToneMapping` (`@react-three/postprocessing/dist/index.js` lines 447–452),
  and three never tone-maps into a render target (`three/src/renderers/webgl/WebGLPrograms.js`
  lines 177–186). Tone mapping is then the composer's last effect,
  `<ToneMapping mode={ToneMappingMode.NEUTRAL} />` (postprocessing's default mode is AgX:
  `postprocessing/build/index.js`, `ToneMappingEffect`), and it maps every pixel.
  **A material's `toneMapped` flag does nothing on this path.**

**Tone mapping: Khronos PBR Neutral, on both paths.** Below its shoulder (0.76 in linear) it only
takes a small offset out of the darks, so the case colours and the buyer's RGB colour stay close to
their swatches (three's `NeutralToneMapping`,
`three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js` lines 170–196). It can
also be inverted exactly, which the cyclorama needs. Exposure is `gl.toneMappingExposure` on both
paths: three uploads it to every shader that declares it, the composer's effect included
(`three/src/renderers/WebGLRenderer.js` line 2751). Exposure sets how bright the build reads; the
stage matches the tokens at any exposure (below).

**Environment (reflections and fill): Lightformers, captured once.**
- drei `<Environment frames={1} resolution={256}>` with `Lightformer` children: a large softbox
  upper left front, behind the key; a tall strip back right, behind the rim; a dim ceiling panel.
  A `<color attach="background">` inside it sets the room, near black in dark and light grey in
  light, so the glass and metal reflect a studio. It downloads nothing.
- **Captured once, and again only when the theme changes.** drei re-captures the six cube faces
  whenever the `<Environment>`'s children change (`@react-three/drei/core/Environment.js` lines
  120–134), and a parent render makes new child elements. Keep it in its own component, which
  re-renders only on a theme change.
- A Lightformer is an unlit `meshBasicMaterial` (`toneMapped: false`, colour × intensity) that
  lights only through reflections (`@react-three/drei/core/Lightformer.js`). Never use its `light`
  prop: it adds a point light that casts shadows, six more shadow renders at every map update.
- **Never a drei `preset`.** Presets load from raw.githack.com
  (`@react-three/drei/core/useEnvironment.js` line 8), and drei's docs say they are not meant for
  production.
- **The fallback, only if the Lightformer look fails the art review:** Poly Haven's CC0
  `monochrome_studio_02` at 1K, self-hosted under `/Rip-PC/` and loaded through
  `<Environment files>`. Its `.hdr` is 1,562,415 bytes (Poly Haven API, read 2026-10-03), a
  quarter of the 6 MB first-build budget, and it needs a CREDITS row (section 8).

**The background is the token, not the environment.** The cyclorama is a backdrop in screen space,
drawn first: a full-canvas layer, unlit, with `depthWrite: false`, that repeats
[tokens.md §2.1](tokens.md#21-colour)'s stage recipe (`--stage` above `--stage-horizon`, the floor
from `--stage-floor` to `--stage-floor-deep`, the `--stage-key` pool). So it matches the CSS stage
around the canvas at every orbit angle and view offset. Re-read the tokens when the theme changes
([tokens.md §1.3](tokens.md#13-the-theme-switch)).
- **Phase 2:** the backdrop is `toneMapped: false` and draws the token colours as they are.
- **Phase 3:** the ToneMapping effect maps the backdrop too. So the backdrop draws each colour
  passed through the inverse of Neutral at the current exposure, from one pure function in
  `src/three/` with a unit test. With t the colour in linear sRGB, and t_min and t_max its
  smallest and largest channel:
  - if t_max < 0.76 and t_min < 0.04: c = t − t_min + 0.4 √t_min;
  - if t_max < 0.76 and t_min ≥ 0.04: c = t + 0.04;
  - otherwise: p = 0.0576 ÷ (1 − t_max) + 0.52, g = 1 − 1 ÷ (0.15 (p − t_max) + 1), and
    c = (t − g t_max) × p ÷ ((1 − g) t_max) + 0.04;
  - then divide c by the exposure.

  Checked on 2026-10-03: the wall, both ends of the floor and the key pool's centre, in both
  themes, go through this inverse and three's curve and come back with 0 error in 8 bits, at
  exposures 0.8, 1 and 1.25. A channel at 255 has no inverse; no stage colour has one.
- **The pixel probe** (qa-lead): capture the stage at the same size with the canvas hidden (the
  CSS stage) and with it, in both themes and on every ladder rung (section 4). At probe points on
  the wall, at the top of the floor and at its near edge, away from the build, its shadow and any
  glow, every channel matches within ±1.

**The floor shadow comes from a `ShadowMaterial` catcher:** a 2 m square plane at the floor
(y = 0), centred under the case, with `receiveShadow`. The material is transparent by default and
draws only the shadow, black at its opacity times the shadow's strength
(`three/src/materials/ShadowMaterial.js`; its shader writes
`vec4( color, opacity * ( 1.0 - getShadowMask() ) )`, `ShaderLib/shadow.glsl.js`). Tune the opacity
per theme, and separately for each phase: Phase 2 blends it in the 8-bit canvas after sRGB
encoding, Phase 3 in the composer's linear buffer before tone mapping, so one opacity gives two
different darknesses.

**Key and rim.** One directional key, upper left front, the scene's only shadow caster. One rim,
back right, with no shadow. Fill comes from the environment.
- **`<Canvas shadows="percentage">`,** which selects `PCFShadowMap`. Bare `shadows` selects
  `PCFSoftShadowMap` (R3F 9.8.1, `@react-three/fiber/dist/events-9ce18a08.esm.js` lines
  1576–1592), and three 0.186.1 has removed it: it warns "PCFSoftShadowMap has been removed.
  Using PCFShadowMap instead." (`three/src/renderers/webgl/WebGLShadowMap.js` lines 99–104). QA's
  smoke tests fail on any console warning except the Clock one (`src/three/three-console.ts`).
  PCF is soft in this three: five Vogel-disk taps scaled by `shadow.radius`
  (`ShaderChunk/shadowmap_pars_fragment.glsl.js` lines 165–175).
- **The map is 1024², and its camera fits the case.** The key's orthographic shadow camera fits,
  in the light's space, the case's bounding box (from `dimensionsMm`) and that box's shadow on the
  floor, plus 5 %. Recompute it when the case changes. With a frustum about 0.7 m wide, one texel
  is about 0.7 mm: start `shadow.normalBias` at one texel and `shadow.bias` at 0, then tune against
  acne and floating shadows on the real models.
- **The map redraws only when what it sees changes:** `gl.shadowMap.autoUpdate = false`, and
  `gl.shadowMap.needsUpdate = true` when a part is added, removed, seated or exploded, the side
  panel opens, or the key moves (`WebGLShadowMap.js` lines 86–87 and 376). A camera move never
  needs it, because a directional light's shadow doesn't depend on the view. Fan blades and RGB
  strips don't cast, so spinning fans never redraw it.

**Light theme:** the same rig, with the light tokens on the backdrop, the key softer (a larger
`shadow.radius`), the shadow lighter, and the environment's room light grey.

**RGB.** Emissive strips and fan rings take `--scene-light`, or the build's chosen colour. The
colour changes in the shader over 400 ms (`--dur-light`).
- **Phase 3 glow: selective bloom by threshold.** `<Bloom luminanceThreshold={1} mipmapBlur />`
  comes before `<ToneMapping>`, so the glow is compressed with the rest of the picture. Only
  emissive materials go above the threshold: set the key and the Lightformers so that the
  brightest glint on glass and metal stays under 1, checked with a luminance view.
- **Every colour must glow alike.** The threshold reads luminance with Rec. 709 weights: the
  luminance pass masks with `smoothstep(threshold, threshold + smoothing, luminance(texel.rgb))`
  (`postprocessing/build/index.js` line 3475), and three's `luminance()` takes its weights from
  `ColorManagement` (`three/src/renderers/webgl/WebGLProgram.js` lines 127–145). Pure blue has 7 %
  of white's luminance, so at one intensity white glows and blue doesn't. Set each colour's
  `emissiveIntensity` to 2 ÷ its luminance in linear sRGB. Under Neutral, the cores of deep blues
  and reds then whiten, like an LED in a photograph, while the glow keeps the colour. If the art
  review rejects that, use `SelectiveBloom` on the emissive meshes with threshold 0 instead; it
  renders those meshes once more, so measure it.
- **`mipmapBlur` already makes it a half-resolution bloom.** It is `BloomEffect`'s default
  (`postprocessing/build/types/index.d.ts` line 5292), and its mip chain starts at half size and
  halves at each level (`MipmapBlurPass.setSize`, `build/index.js` line 4050). **Don't pass
  `resolutionScale`:** postprocessing 6.39.5 marks it "Deprecated. Use mipmapBlur instead."
  (`index.d.ts` line 5297), and with `mipmapBlur` on it only sizes a target that isn't used
  (`BloomEffect.setSize`, `build/index.js` line 4359, gives the luminance pass and the mip chain the
  full size). The levers to measure: fewer `levels` (8 by default), or a half-size luminance pass
  (`bloom.luminancePass.resolution.scale = 0.5`).
- **Fixed settings.** The R3F `<Bloom>` rebuilds its effect when `luminanceThreshold`,
  `luminanceSmoothing`, `mipmapBlur`, `radius` or `levels` change, because they are constructor
  arguments; only `intensity` changes live (`@react-three/postprocessing/dist/index.js` lines
  881–905). It blends with ADD (`blendFunction = 0`).
- **About `toneMapped: false`:** on emissive materials it does nothing while the composer is
  mounted (above), so it is not what makes the bloom selective; the HDR values are. Phase 2 has no
  bloom: there the strips keep the default `toneMapped: true` and an intensity of 1, so Neutral
  compresses them instead of clipping them to white.

**The interior light** (a Phase 3 look option): one point light inside the case, no shadow.

### 3.3 Materials

**One material library for every part.** Mixed conventions from different authors are what makes
a composite scene look cheap ([survey](3d-asset-survey.md#what-this-means-for-art-direction)).

| Material | Built as | Texture |
|---|---|---|
| Powder-coated steel (case; black or white per the case's `colors`) | Standard PBR, roughness about 0.6, a shared roughness noise | None, or one 512² noise |
| Smoked tempered glass | Two layers on one pane (below): a black tint at opacity about 0.18, and a reflection layer at roughness 0.05. **No transmission:** it costs a second render pass | None |
| Brushed aluminium (fins, heatsinks) | Standard PBR, metal. Its maps filter with an anisotropy of 4, capped at `gl.capabilities.getMaxAnisotropy()`, so the brushing doesn't shimmer at grazing angles. That is texture filtering, not `MeshPhysicalMaterial`'s anisotropic highlight | CC0 ambientCG brushed metal, 1K |
| PCB black | Standard PBR, roughness 0.7 | None |
| Matte plastic (fans, shrouds) | Standard PBR, roughness about 0.8 | None |
| Sleeved cable | Standard PBR | CC0 fabric normal map, 512² |

- **One shared instance per library material,** created once and named as in section 8. A
  per-build colour (the case's colour, the RGB colour) gets one clone, disposed when that build
  changes. A GLB's own materials are swapped for library instances at load, so nothing edits a
  material that a cached GLB shares.
- **Colour spaces:** colour maps (base colour, emissive) are sRGB; every data map (normal,
  roughness, metalness, occlusion) is `NoColorSpace`. The GLB path sets this per slot:
  gltf-transform encodes sRGB slots with `--assign-tf srgb` and the rest as linear
  (`@gltf-transform/cli/dist/cli.mjs` lines 698–735), and the glTF loader gives each slot its
  colour space. Set it by hand only on a map loaded outside a GLB.
- **Glass: two layers on one pane.** three blends a transparent material as its lit colour ×
  opacity plus the background × (1 − opacity) (`three/src/renderers/webgl/WebGLState.js` lines
  674–676), and the lit colour includes the reflections (`ShaderChunk/opaque_fragment.glsl.js`
  writes `vec4( outgoingLight, diffuseColor.a )`). One pane at 0.18 would show 18 % of its
  reflections and look dull. So:
  - **a tint layer:** black, `transparent`, opacity about 0.18, normal blending; it darkens what's
    behind;
  - **a reflection layer:** black Standard PBR, metalness 0, roughness 0.05, `transparent`,
    `blending: AdditiveBlending` (`WebGLState.js` lines 678–680); it adds the reflections at full
    strength, Fresnel included, as real glass does;
  - both `depthWrite: false` and `side: FrontSide`, with `renderOrder` putting the tint before the
    reflection;
  - **overlaps tested:** glass behind glass (a glass front seen through the side), glass over the
    RGB strips and fan rings, and the case's inside, at every shot in section 3.1 and at the orbit
    limits. three sorts transparent objects by `renderOrder`, then by distance per object, never
    per pixel (`three/src/renderers/webgl/WebGLRenderLists.js` lines 31–47).
- **Textures ship as KTX2** (backlog item 38 closes; the pipeline is in section 5): Basis
  Universal in `KHR_texture_basisu`, UASTC for normal maps and ETC1S for the rest, as
  gltf-transform's own help advises ("you may want to use UASTC for normal maps and ETC1S for
  other textures"); 2K at most, 1K or none for most. Each KTX2 carries its own mipmaps, because a
  compressed texture can't make them or be flipped at upload (`three/src/textures/CompressedTexture.js`
  lines 60–80).
- **Replacement maps** for a glTF model: a PNG or JPEG loaded with `useTexture` needs
  `flipY = false` to match glTF's UVs; the glTF loader sets that on its own textures
  (`three-stdlib/loaders/GLTFLoader.js` line 1775). A KTX2 can't be flipped, so a replacement map
  ships inside a GLB made by the same pipeline.
- Physical materials (clearcoat, transmission) only where a material needs them, and none in the
  Phase 2 model.

---

## 4. Performance limits

**The bar** (BUILD_PROMPT §8): 60 fps in the garage on the reference laptop, an Intel Core Ultra
7 155H with Arc graphics, in Chrome with hardware acceleration. 120 fps on a high-end desktop GPU.
Measured by qa-lead's perf-tester, not estimated.

**Scene budget** (from the survey; per build, the whole scene):

| Budget | Target | Hard cap |
|---|---|---|
| Triangles | ≤ 350k | 500k |
| Draw calls | ≤ 120 | |
| Texture memory on the GPU, after KTX2 | ≤ 160 MB, 2K per map at most (what that holds: below) | |
| Transfer before the build's first frame | ≤ 6 MB of GLB, KTX2 and decoders | |
| Per part | case 60k, board 40k, GPU 40k, cooler 30k, RAM 3k per stick, fan 4k, PSU 6k triangles | |

**What 160 MB holds.** GPU memory is not download size: a texture takes its format's bytes per
texel, whatever the file weighed. A 2048² map with its full mip chain has 12 levels and 5,592,405
texels. Block formats store whole 4×4 blocks, so the smallest mips cost a block each.

| On the GPU as | Bytes per texel | One 2K map with mips | 2K maps in 160 MB |
|---|---|---|---|
| RGBA8, uncompressed (any PNG, JPEG or WebP) | 4 | 22,369,620 B (22.4 MB) | 7 |
| BC7, ASTC 4×4, BC3 or ETC2 RGBA | 1 | 5,592,432 B (5.6 MB) | 28 |
| BC1, ETC1 or ETC2 RGB | 0.5 | 2,796,216 B (2.8 MB) | 57 |

A 1K map takes a quarter: 1,398,128 B at 1 byte per texel, so 114 of them fit.

**What each encoding becomes on the GPU.** three's `KTX2Loader` takes the first format the GPU
offers, in a fixed order (`three/examples/jsm/loaders/KTX2Loader.js` lines 793–925):
- **UASTC:** ASTC 4×4, then BC7, so 5.6 MB per 2K map wherever either exists. Without them it falls
  to ETC (2.8 MB for an opaque map, at lower quality), then BC1 or BC3, then PVRTC, and last to
  uncompressed RGBA (22.4 MB).
- **ETC1S:** ETC2 or ETC1 first (2.8 MB for an opaque map), then **BC7 before BC1**
  (`priorityETC1S`: ETC2 1, ETC1 2, BC7 3, BC1 and BC3 4). So on a GPU with BC7 and no ETC, ETC1S
  also takes 5.6 MB. ETC1S still saves download bytes everywhere; it saves GPU memory only where
  ETC exists.
- **Which formats the reference laptop offers is measured, not assumed:** qa-lead's perf-tester
  logs `gl.getSupportedExtensions()` there (`EXT_texture_compression_bptc`,
  `WEBGL_compressed_texture_s3tc`, `WEBGL_compressed_texture_etc`,
  `WEBGL_compressed_texture_astc`). Until then, budget at 1 byte per texel: 28 2K maps, or 114 1K
  maps.
- The composer's render targets come on top of this budget (anti-aliasing, below).

**How Studio keeps 60 fps on an iGPU**
- **Render on demand.** `<Canvas frameloop="demand">` draws a frame only when something
  invalidates it: a camera move, a part seating, an RGB change, the visitor's orbit. A still stage
  costs nothing, and the UI stays responsive. The rules:
  1. **Every animation invalidates every frame while it runs:** camera moves, seating, the RGB
     change, orbit damping, and the fans while they are on. Inside `useFrame`, `invalidate()`
     requests one more frame (`@react-three/fiber/dist/events-9ce18a08.esm.js` lines 17469–17491),
     and the loop stops when no animation asks. drei's controls invalidate on change by themselves
     (R3F docs, "Scaling performance").
  2. **Start an animation one frame late:** call `invalidate()`, then start it in the next frame,
     so it doesn't jump at its start (R3F docs, "Sync animations with on-demand rendering").
  3. **Animations run on their own start time, never on `delta`.** In demand mode the first
     `delta` after a pause is the whole pause (`delta = state.clock.getDelta()`, the same file,
     line 17402), which would finish a 700 ms move in one frame.
  4. **The ladder samples only frames that render.** drei's `PerformanceMonitor` counts the
     frames in each 250 ms window from `useFrame` (`@react-three/drei/core/PerformanceMonitor.js`),
     so in demand mode an idle stage reads as a few frames a second, and it would step down a fast
     GPU. Use a small sampler instead: in `useFrame`, keep the interval since the previous frame
     only if it is under 100 ms, that is, inside a run of frames; decide on the last 120 kept
     intervals (2 s at 60 fps, gathered across runs). drei's `AdaptiveDpr` follows R3F's
     `performance.regress()`, not this ladder (`core/AdaptiveDpr.js`), so it isn't used.
- **Fans spin only when the visitor turns them on,** with the Spin fans button in the 3D tools row,
  and the same button stops them. [motion.md §6](motion.md#6-fans-item-23) specifies the control:
  off by default and never stored, a 500 ms spin-up and spin-down, one turn a second, and no
  control under reduced motion. For the renderer:
  - it is the only continuous rendering: invalidate every frame while the fans turn or ease;
  - it pauses while the tab is hidden, because the frame loop runs on `requestAnimationFrame`,
    and while the canvas is off-screen;
  - fan blades don't cast shadows, so spinning never redraws the shadow map (section 3.2);
  - the spin is each fan's instance matrix (repeated parts, below).
- **Device pixel ratio** starts at the screen's own, capped at 1.5. The ladder may drop it to 1,
  and a step up may try 2.
- **A step-down ladder** for when the 95th percentile of the sampler's last 120 intervals (about
  2 s of rendered frames) is above 16.7 ms. Each rung is tried in turn:
  1. bloom off: remove `<Bloom>` and keep the composer and its tone mapping, so the picture's tones
     don't change;
  2. the shadow map becomes a baked contact shadow: a pre-rendered, blurred texture under the case,
     redrawn when the case changes;
  3. pixel ratio 1.0;
  4. lower-detail models (LOD1, section 8);
  5. the clearance model (section 2), still inside the Phase 3 composer, so anti-aliasing and tone
     mapping stay.

  **Stepping back up is a probe.** On a 60 Hz screen no frame comes faster than 16.7 ms, so
  headroom can't be measured, only tried. After 10 s of rendered frames at a p95 of 16.7 ms or
  less, go up one rung (or raise the pixel ratio toward 2). If the next 2 s fail, go back down and
  stay on that rung for the session, so the ladder never oscillates.
- **Anti-aliasing and the composer's memory.** The composer's `multisampling` defaults to 8
  (`@react-three/postprocessing/dist/index.js` line 332; Context7 agrees). On the iGPU it starts
  at 4, or at 0 with an `<SMAA />` effect placed last; qa-lead's fps probe picks. Its half-float
  MSAA colour buffer alone is pixels × samples × 8 bytes: at 1440 × 900 CSS px and a pixel ratio
  of 1.5 (2160 × 1350), that is 93 MB at 4 samples and 187 MB at 8, before depth, in memory the
  iGPU shares. The Phase 3 canvas takes `gl={{ antialias: false }}`: R3F turns the canvas's own
  MSAA on by default (`createRenderer`, `events-9ce18a08.esm.js` lines 1365–1371), which is wasted
  under a composer. Phase 2, with no composer, keeps it on. Both keep R3F's default `alpha: true`,
  so the CSS stage shows until the first frame and nothing flashes black; the backdrop makes every
  pixel opaque after that.
- **Load per part, lazily,** after the first frame of the clearance model.
  - **The stage is never empty and never shows a size we can't source.** A part's clearance volume
    (section 2) appears at once, at the catalogue size, and its model fades in over it in 200 ms
    when ready.
  - **A swap to another part shows the new part's volume at once,** not the old model: the old
    model has the old part's size, which section 1 forbids.
  - **A same-size swap keeps the old model until the new one is ready:** LOD1 to LOD0, or a look
    change on the same model. Pass the model's id through `useDeferredValue`. R3F 9.8.1 renders in
    a concurrent root (tag 1, `events-9ce18a08.esm.js` line 1349), so when the background render
    suspends, React keeps showing the old model (React docs, `useDeferredValue`).
  - **Level of detail:** drei `Detailed` with LOD0 and LOD1 (section 8), its distances tuned to the
    shots. It switches inside `useFrame`, so only on rendered frames (`core/Detailed.js`).
  - **Repeated parts:** RAM sticks with drei `Clone`, which shares geometry and materials unless
    `deep` is set (`core/Clone.js`); fans with instancing, one draw call per fan mesh for all the
    fans, each turning on its own instance matrix.
  - **Shared resources:** `dispose={null}` on every subtree that shows a cached GLB or the shared
    library materials. R3F 9.8.1 calls `dispose()` on each unmounted instance that has one, never
    on a `<primitive>`, and `dispose={null}` stops it for the whole subtree (`removeChild`,
    `events-9ce18a08.esm.js` lines 16615–16670). The cache owner frees a model only when no build
    uses it.
  - **Errors:** an error boundary around each part's model keeps the clearance volume, so the size
    stays true. It clears the failed entry (`useGLTF.clear(url)`) and retries once after 2 s. After
    a second failure it stays on the volume, and the part's info panel says that its model didn't
    load. No retry loop and no unhandled rejection (BUILD_PROMPT §8).
- **Decoders and the transcoder are self-hosted under `/Rip-PC/`.** No 3D file comes from another
  host, and drei's defaults all point elsewhere: `useGLTF`'s Draco decoder at gstatic.com
  (`@react-three/drei/core/Gltf.js` line 8), `useKTX2`'s transcoder at cdn.jsdelivr.net, unpinned
  at `@master` (`core/Ktx2.js` line 7), and the presets at raw.githack.com.
  - **Meshopt first.** Every GLB is compressed with `gltf-transform meshopt`. Its decoder is
    three-stdlib's `MeshoptDecoder`, which `useGLTF` sets by default and which is bundled into the
    3D chunk, so it costs no request (21,758 bytes, 5,503 gzip). A delivered Draco GLB is
    re-encoded with Meshopt.
  - **Draco** is self-hosted all the same, so a stray Draco file can never reach a CDN:
    `useGLTF.setDecoderPath(import.meta.env.BASE_URL + 'decoders/draco/')`, once, at module load,
    with the files from `three/examples/jsm/libs/draco/gltf/` (`draco_wasm_wrapper.js` 58,456 bytes
    and `draco_decoder.wasm` 192,420; 75,062 gzip).
  - **The Basis transcoder for KTX2:** one shared three `KTX2Loader`
    (`three/examples/jsm/loaders/KTX2Loader.js`), with
    `setTranscoderPath(import.meta.env.BASE_URL + 'decoders/basis/')` and `detectSupport(gl)`,
    handed to `useGLTF` through `extendLoader` (`loader.setKTX2Loader(ktx2)`). It works with
    three-stdlib's glTF loader, which drei uses (`three-stdlib/loaders/GLTFLoader.js` lines 122
    and 720–741). The files come from `three/examples/jsm/libs/basis/`: `basis_transcoder.js`
    57,529 bytes and `basis_transcoder.wasm` 527,333 (262,678 gzip). Every GLB needs it, because
    gltf-transform marks `KHR_texture_basisu` as required (`@gltf-transform/cli/dist/cli.mjs` line
    614), and the glTF loader then refuses the file without a KTX2 loader
    (`three-stdlib/loaders/GLTFLoader.js` lines 732–736). `detectSupport` needs the renderer, so
    GLBs are preloaded only after the canvas exists, with the same loader settings as the load.
  - **Version-matched, never committed:** a build step copies the files from
    `node_modules/three/examples/jsm/libs/`, with their Apache 2.0 licence notes (both READMEs name
    it), and dev serves the same paths. three's own default (`new URL(..., import.meta.url)`,
    `KTX2Loader.js` lines 106–107) isn't relied on, because Vite's dependency pre-bundling can move
    the module away from the files.
  - **Budget:** the transcoder counts in the 6 MB first-build budget whenever the first build has
    a KTX2 texture: 0.58 MB raw, or 0.26 MB if the server compresses `.wasm`, which is to be
    checked on the live site. Draco counts only if a GLB needs it, and none should. QA's e2e
    network log fails on any 3D request to another host.

**The targets for each cost are to be measured,** not quoted: the shadow map, bloom, MSAA against
SMAA, the glass. qa-lead's fps probe on the reference laptop decides. The order above is a
starting point.

---

## 5. Assets: what to use

The survey's recommendation stands: **parametric representative geometry from our own millimetre
data, dressed in the shared CC0 materials, with a few CC BY detail meshes.** Exact branded models
only when they pass the survey's four checks:
- the licence is recorded and archived;
- the exact product is in the catalogue;
- the dimensions are within ±2 mm of the maker's drawing;
- the logos are acceptable to show.

**What the 2026-10-01 research added**
- **A CC BY 4.0 model of the exact GeForce RTX 5090 Founders Edition** (Sketchfab, by PolyDavid,
  2025-12-21): 46,177 faces, 22 textures, 14 materials. The 2026-09-30 survey missed it.
  - It is 1.15× the GPU budget.
  - Its author calls the geometry "pretty horrendous".
  - It carries NVIDIA's design, so it may stand only for that exact card.
  - A designee with a Sketchfab login must download it before anyone can judge it.
- **ARCTIC serves official GLBs** of the Liquid Freezer III Pro 360 and 280 on its product pages
  (both in the seed catalogue). The worker measured both, as evaluation copies kept outside the
  repo:

  | Model | Size | Triangles | Textures | Bounding box | ARCTIC's radiator spec |
  |---|---|---|---|---|---|
  | Liquid Freezer III Pro 360 | 10.43 MB | 177,501 | 3 × 2048² JPEG | 470 × 121 × 277 mm | 398 × 120 × 38 mm |
  | Liquid Freezer III Pro 280 | 8.36 MB | 130,783 | 3 × 2048² JPEG | 389 × 140 × 277 mm | 317 × 138 × 38 mm |

  - The width matches ARCTIC's spec within 1–2 mm.
  - They are 5.9× and 4.4× the cooler budget, so each needs decimating or a lighter version from
    ARCTIC.
  - **ARCTIC publishes no reuse licence** for them, so using them needs ARCTIC's written
    permission.
- **ASUS shows an official 3D view** of the TUF Gaming RTX 5070 Ti (in the seed catalogue). The
  file was not located, and using it would need ASUS's permission.
- **For 16 of the 23 seed cases, cards, coolers and fans checked, no model was found in any store
  or library searched.** The Terra has only a free SketchUp 3D Warehouse model whose licence could
  not be read. Paid models were found only for the Fractal North, the RTX 5090 Founders Edition,
  the DeepCool FC120, and an AMD-design RX 9070 XT, which is not the Sapphire Pulse in the
  catalogue. Representative models will carry most of the catalogue whatever is bought.

**The pipeline on this PC** (checked 2026-10-02 and 2026-10-03)
- **gltf-transform 4.5.1** (`@gltf-transform/cli`, a dev dependency) works: `simplify`, `meshopt`
  and `resize` were checked on 2026-10-01 (backlog item 37), and `uastc` and `etc1s` by the
  Director on 2026-10-02 (below). `inspect` and `validate` come with it.
- **KTX-Software 4.4.2 is installed** (Hazem approved it on 2026-10-02): `toktx` and `ktx` 4.4.2 in
  `C:\Program Files\KTX-Software\bin`, on the user PATH. gltf-transform 4.5.1 drives `ktx create`,
  not `toktx`, and needs KTX-Software 4.4.0 or later (`@gltf-transform/cli/dist/cli.mjs` lines
  542, 671 and 750). It finds `ktx` by name, and a terminal opened before the install doesn't see
  the new PATH, so run the pipeline from a new terminal.
- **The Director's test** on a small GLB: 8.75 KB became 2.53 KB with `etc1s` and 2.57 KB with
  `uastc`; both wrote `KHR_texture_basisu`, and `ktx validate` passed.
- **No Blender and no Python,** so no `bpy` scripts: LOD1 and any decimation come from
  `gltf-transform simplify`, and modelling and UV work belong to whoever supplies the model
  (section 8).
- **Backlog item 38 closes: textures ship as KTX2.** WebP was the plan only while KTX-Software was
  missing, and it is stored uncompressed on the GPU (22.4 MB per 2K map, section 4).
- **Per GLB, in this order:**
  1. `gltf-transform inspect` against the budgets (triangles, draw calls, texture sizes);
  2. for LOD1 only, `simplify --ratio 0.25`, raising `--error` (0.0001 by default, a fraction of
     the mesh's radius) only as far as the bounding box stays within ±2 mm of LOD0's;
  3. `resize --width 2048 --height 2048` (PNG and JPEG only, so before KTX2);
  4. `uastc --slots "normalTexture"`;
  5. `etc1s` for the remaining PNG and JPEG maps. Both KTX steps skip maps already in KTX2, and
     warn and skip a WebP or AVIF map (`cli.mjs` lines 629–635), so it would ship uncompressed on
     the GPU: that is why section 8 asks for PNG or JPEG;
  6. `meshopt`, last; its 14-bit positions (the default) step 0.03 mm on a 0.5 m case, far inside
     ±2 mm;
  7. `gltf-transform validate`, then section 8's acceptance checks.

---

## 6. Licences: why buying a model does not simply work

The question for every store is the same: may the model ship inside a GLB that the browser
downloads? A GLB in a browser is always extractable from the developer tools; Draco and Meshopt
are public formats, not protection. Quoted from each licence page; captures and URLs are listed
in section 10.

| Licence | Shipping the model in a web GLB | Branded ("editorial") items |
|---|---|---|
| **TurboSquid** Royalty Free | **No, unless TurboSquid approves in writing.** "Stock Media Products must be contained in proprietary formats so that they cannot be opened or imported in a publicly available software application or framework, or extracted without reverse engineering." It names "encrypted compression archive" formats as prohibited. | Editorial use "is limited to news reporting" |
| **CGTrader** Royalty Free | **Only with protection:** "you must take all commercially reasonable measures to prevent the end user from gaining access to the Product" | Editorial use only for "journalistic, editorial, cultural or otherwise newsworthy" purposes; brand clearance is "the sole responsibility of the Buyer" |
| **Envato** (3DOcean) Regular, Extended | **Only if not extractable:** "You must not permit an end user of the End Product to extract the Item and use it separately from the End Product." Clause 9 also bars "build it yourself" applications without a licence per final product, which may cover a PC builder. | Real products are "licensed on the basis of editorial use only" |
| **BlendKit** (formerly BlenderKit) Royalty Free | **No:** the software may not "embed any open-format 3D model" | No editorial flag; the risk stays with the user |
| **Sketchfab** Standard | **No stand-alone file access:** not "as a stand-alone file" | No commercial, promotional or advertising use |
| **Fab** (Epic) Standard | Unclear. Fab's own summary forbids redistributing an asset "on a standalone basis". The live EULA was behind a security check; a 2026-09-10 Wayback copy was read | Not read |
| **ArtStation Marketplace** Standard, Extended Commercial (its default agreement, which a seller may replace with "a custom agreement or license") | **Unclear.** A stock asset may be distributed "in works you create", but not "except as part of a Work", and clause 5(d) bars making "the Product available to others to use, download or copy", which an open GLB does. No clause covers extraction. The Standard licence covers "one commercial Work, with up to a maximum of, as applicable, 2,000 sales of the Work or 20,000 monthly views of the Work", so a public site needs Extended: "any number of commercial Works, with no limit on sales or views". The live page met a bot check; a 2026-07-11 Wayback copy was read | No editorial or trademark clause |
| **Unity Asset Store** standard EULA (Appendix 1 of its Terms, last updated 2024-12-04) | **Yes, as an embedded part, under conditions:** the asset goes, "together with substantial, original content not obtained through the Unity Asset Store", into an application "that has a purpose, features, and functions beyond the display, performance, distribution, or use of Assets", "as an embedded component of that Licensed Product, such that the Asset does not comprise a substantial portion of the Licensed Product", and may be distributed "as incorporated and embedded in that Licensed Product" (2.2.1). No clause covers extraction. Whether a hero part filling the stage is "a substantial portion" is a judgement for Hazem. A Provider's own EULA, or a "Restricted Asset", overrides this | No editorial clause. The licensor's defence against copyright and trademark claims (11.3.2.1) excludes claims predicated on "any changes or modifications of the Paid Asset by anyone other than the Licensor" or "any combination or incorporation of the Paid Asset with any other software, media, or thing", which re-materialling and shipping it in Rig Lab both are |
| *CC BY 4.0, for comparison* | Yes, with credit | CC BY never covers trademarks |

**What this means:** most marketplace purchases give a licence Rig Lab cannot honour with a plain
GLB. They would need an encrypted custom mesh format (build-lead effort, and still only
obfuscation) plus the store's written approval. Unity's EULA is the one read that allows an
embedded model without a protection clause, but its "substantial portion" test is a judgement, and
its defence against trademark claims falls away once a model is changed or combined. ArtStation's
is unclear. And the branded models, the ones that would matter on a full-screen stage, are usually
editorial-only, which bars a commercial site.

---

## 7. Paid-asset options for Hazem

**Nothing is bought, and nothing is sent.** Hazem decides; any purchase, licence or e-mail to a
maker needs his approval (CLAUDE.md, who's who).

| Option | Cost | What it covers | Conditions |
|---|---|---|---|
| **A. No cash: parametric models, CC BY, and permission letters** | **USD 0** | Phase 2's clearance model and Phase 3's parametric models for the whole catalogue. The survey's CC BY detail kit. The CC BY RTX 5090 FE if it passes review. ARCTIC's and ASUS's official models if they agree in writing. | Two permission e-mails, sent by Hazem or someone he names. A designee with a Sketchfab login to download the CC BY files: the team may not log in. ARCTIC's GLBs need decimating. |
| **B. Commission a hero set, with full rights** | **About USD 1,440, an estimate from a published rate card, not a quote** | The 2–4 parts the stage shows closest, modelled to our millimetre data and triangle budgets, delivered to section 8's spec. The estimate is 2 complex models (a case, a GPU card) at "about $400", 2 typical models (a tower cooler, a 120 mm fan) at "about $200", and 4 finishes at "from about 60 USD". | Prices from UFO3D's pricing page, which also states "You own the files" and offers GLB. A case with mesh panels and glass may price as "ultra complex", from $1,200, so get a real quote first. Copying a maker's signature design keeps the trademark question; generic hero designs avoid it. |
| **C. Buy marketplace models, with protected delivery** | **USD 66.50 as listed**, mostly unconfirmed | 4 parts: a Fractal North (CGTrader, USD 22.50), an RTX 5090 FE CAD file needing retopology (CGTrader, USD 20.00), a DeepCool FC120 (TurboSquid, USD 15), a generic DDR5 stick (3DOcean, USD 9) | The first three prices are search-index leads, because those stores block automated reads; they must be confirmed on the live page. It needs TurboSquid's written approval, an encrypted mesh format, and live checks of the editorial flags. Envato's clause 9 may still bar a builder. **Not recommended.** |

**The design lead's recommendation:**
- **A now.** Phase 2 needs no paid asset, because the clearance model is parametric.
- **Decide on B before Phase 3 starts**, and only for the parts the stage shows closest: likely
  the case and the GPU card. Ask for a quote with our budgets, our drawings and section 8
  attached.
- **Skip C.**
- **Answer three questions:**
  1. May we ask ARCTIC and ASUS for permission, and who sends the requests?
  2. Who downloads the CC BY files, with what account?
  3. Is a budget of about USD 1,500 for B open for Phase 3?

---

## 8. Delivering a model: the spec for any source

Every model that reaches the stage meets this spec, whatever its source: bought (option C),
commissioned (option B), a CC BY file, or one we make. A supplier gets this section with the brief
for its part. The 3d-artist brings a CC BY or bought file up to it before review.

**The file**

| Rule | Spec |
|---|---|
| Format | One binary glTF 2.0 file (`.glb`) per detail level, buffers and textures embedded. `gltf-transform validate` reports no errors |
| Units and axes | Metres, +Y up. Each part sits in its installed pose in an upright tower: front +Z, the glass side −X, so the board's components face −X and a GPU lies with its fans facing down (−Y) and its bracket at the rear (−Z). Placing it in a tower is then a translation |
| Scale | Real size: the bounding box matches the maker's drawing, through the catalogue's dimensions, within ±2 mm (section 5's checks) |
| Transforms | Applied: in the delivered file every node has scale 1 and no rotation, except a moving part's pivot; no negative scale |
| Origin | At the part's mounting reference. Case: its footprint's centre, on the floor. Board: the centre of the PCB's back face, on the standoffs. GPU: the PCIe connector's contact edge, at the bracket's inner face. RAM: the centre of its contact edge. Air cooler: the centre of its base's contact face. AIO: the pump's contact face, and each radiator the centre of its fan-side face. PSU: the centre of its rear face. Fan: its rotor axis, on the frame's mounting face. M.2 drive: the centre of its connector edge |
| Materials | glTF metallic-roughness only (in Blender, the Principled BSDF and nothing else), each named after the library material it stands for (section 3.3): `steel-powder`, `glass-smoked`, `aluminium-brushed`, `pcb-black`, `plastic-matte`, `cable-sleeved`, and `emissive-rgb` for anything that lights. We swap them for the shared library at load. Any other material needs design-lead's approval, as a new library entry |
| Textures | Only where a library material takes a map (section 3.3), 2K at most, PNG or JPEG. We compress them to KTX2 (section 5) |
| Nothing extra | No lights, no cameras, no animations, no empty nodes without a purpose, no hidden meshes. No text or logos on a representative part (section 1, rule 5) |
| Moving parts | Fan rotors as their own nodes, pivot on the rotor axis. A hinged side panel with its pivot on the hinge |
| Detail levels | LOD0 within the part's triangle budget (section 4: case 60k, board 40k, GPU 40k, cooler 30k, RAM 3k a stick, fan 4k, PSU 6k), and LOD1 at about a quarter of LOD0, as two files: `<part>.glb` and `<part>.lod1.glb`. drei `Detailed` switches between them |
| Draw calls | One mesh per material per detail level: everything that shares a material is merged, except moving parts |

**Acceptance.** The 3d-artist checks each model, then design-lead reviews it:
1. `gltf-transform inspect`: triangles, draw calls and texture sizes against the budgets;
   `validate` with no errors.
2. The bounding box against the catalogue's dimensions, within ±2 mm, measured in the file, not
   read from a listing.
3. Screenshots on the stage, in both themes, at the hero shot and at the part's own step shot.
4. The credits rule below.

**Credits come before shipping** (backlog item 46). A 3D asset ships only once its row in
`CREDITS.md`'s "3D models" table records:
- the model's URL, the page it came from;
- the author's display name, handle and profile link, which CC BY credit needs (the survey carries
  them for every candidate);
- the licence and its version, such as "CC BY 4.0" with the licence's URL, or a store's licence by
  name and date;
- an archived copy of the model page, a Wayback Machine URL taken on the day of the download;
- whether the model is representative.

A model we make ourselves gets a row too, saying so, and the HDRI fallback (section 3.2) gets one
if it is used. CC BY credit also appears on the in-app credits page (survey, summary point 1).
`CREDITS.md` belongs to data-lead: the 3d-artist sends the row to data-lead, and nothing ships
before it is in. Today's table has no column for the archived copy; data-lead adds it (a
cross-team change, CLAUDE.md).

---

## 9. Known gaps

- **Only ARCTIC's two GLBs were measured.** No other model file was opened. The evaluation copies
  stay in the session scratchpad, never in the repo, and may not be used without ARCTIC's
  permission.
- **CGTrader, TurboSquid and Fab block automated reads.** Their prices in option C are
  search-index leads, and TurboSquid's licence was read from its own blog's copy (the licensing
  page returned 403).
- **Fab's binding EULA** was read only as a Wayback copy of 2026-09-10; the live page sat behind
  a security check.
- **ArtStation's agreement** was read only as a Wayback copy of 2026-07-11: the live page answered
  with a Cloudflare challenge (HTTP 403), and it was not retried.
- **No Unity Asset Store or ArtStation listing for a catalogue part was searched.** Section 6
  covers their licences only.
- **RenderHub's licence** (the most permissive found) was read through WebFetch only, so its
  quotes are not byte-verified. It is left out of section 6 for that reason.
- **The frame-time costs in section 4 are targets.** None is measured until qa-lead's perf-tester
  runs the reference laptop. The render-target memory figures are arithmetic, not measurements.
- **The reference laptop's compressed texture formats are not measured** (section 4). The texture
  budget assumes 1 byte per texel until they are.
- **The inverse-Neutral backdrop is checked in arithmetic only,** by a round trip through three's
  formula. The pixel probe on real GPUs is qa-lead's.
- **Whether GitHub Pages compresses `.wasm`** isn't checked, so the transcoder's gzip figure
  (section 4) holds only if it does.
- **The orbit pad** (section 3.1) needs its entry in components.md and its button names in
  copy-guide.md.
- **The camera shot list is a first pass,** to be tuned against the real scene in Phase 2.
- **The form-factor standards** for board outlines, mounting holes, slot pitch (the 20.32 mm in
  section 1) and PSU sizes still need their sources added to data-lead's source registry before
  Phase 2 draws them.

---

## 10. Sources (read 2026-10-01 unless stated)

Captures from 2026-10-01 are kept in the session scratchpad (`3d-paid-assets/`), and those from
2026-10-02 in this worktree's `artifacts/captures/phase-1/WP-DS2/3d-licences/`, with their
`SHA256SUMS.txt`. Neither is committed: third-party pages are not republished.

| What | Publisher | URL | How it was read |
|---|---|---|---|
| Royalty Free licence, web-viewer guidance | TurboSquid | https://blog.turbosquid.com/royalty-free-license/ | Live, captured (turbosquid.com/licensing returned 403) |
| Royalty Free and Editorial licences | CGTrader | https://www.cgtrader.com/pages/terms-and-conditions | Live, captured |
| Regular and Extended licences | Envato (3DOcean) | https://3docean.net/licenses/terms/regular | Live, captured |
| Terms and licences | BlendKit | https://www.blendkit.com/terms-and-conditions-2021/ | Live, captured |
| Standard licence | Sketchfab | https://sketchfab.com/licenses | Live, captured |
| Fab EULA and licence summary | Epic Games | https://www.fab.com/eula (Wayback 2026-09-10), https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab | Wayback copy, captured; summary page live |
| Marketplace Product and Services Agreement | ArtStation (Epic Games) | https://www.artstation.com/marketplace-product-eula (Wayback: https://web.archive.org/web/20260711181929/https://www.artstation.com/marketplace-product-eula) | Wayback copy of 2026-07-11, captured 2026-10-02; the live page returned a Cloudflare challenge (HTTP 403) |
| Asset Store Terms of Service and EULA (Appendix 1: the EULA), "Last updated: December 4, 2024" | Unity Technologies | https://unity.com/legal/as-terms | Live, captured 2026-10-02 |
| 3D product modelling prices | UFO3D | https://ufo3d.com/3d-product-modeling-services/ | Live, captured by the design lead, 2026-10-01 |
| "DDR5 RAM memory module 1", USD 9 Regular and Extended | 3DOcean (FrancescoMilanese85) | https://3docean.net/item/ddr5-ram-memory-module-1/34030495 | Live, through WebFetch (direct requests met a bot check) |
| "NVIDIA RTX 5090 Founders Edition", CC BY 4.0 | Sketchfab (PolyDavid) | https://sketchfab.com/3d-models/nvidia-rtx-5090-founders-edition-5934a7ddfa144951ac66eb8cab13f220 | Sketchfab Data API |
| Liquid Freezer III Pro 360, official GLB and radiator spec | ARCTIC | https://www.arctic.de/en/Liquid-Freezer-III-Pro-360/ACFRE00180A | Live, captured; GLB measured |
| TUF Gaming RTX 5070 Ti, official 3D view | ASUS | the product page (file not located) | Live, captured |
| `monochrome_studio_02` file list and sizes | Poly Haven | https://api.polyhaven.com/files/monochrome_studio_02 | API, read 2026-10-03 |

**Package behaviour** was read in `node_modules` on 2026-10-02 and 2026-10-03 (the files and lines
are cited where each rule uses them): three 0.186.1, @react-three/fiber 9.8.1, @react-three/drei
10.7.9, @react-three/postprocessing 3.1.3, postprocessing 6.39.5, three-stdlib 2.36.1 and
@gltf-transform/cli 4.5.1. **Context7** cross-checked the same APIs: `/pmndrs/react-three-fiber`
(Canvas props, on-demand rendering), `/pmndrs/drei` (Environment, Lightformer, useGLTF, Clone,
Detailed), `/pmndrs/react-postprocessing` (EffectComposer, Bloom), the postprocessing docs
(`/websites/pmndrs_github_io_postprocessing_public`, BloomEffect), three.js docs (`/websites/threejs`,
ShadowMaterial, KTX2Loader, GLTFLoader) and React's (`/websites/react_dev`, useDeferredValue). Where
the two differ, the installed source wins: Context7's drei page names `draco/v1/decoders/`, but
drei 10.7.9's `useGLTF` uses `draco/versioned/decoders/1.5.5/`.
