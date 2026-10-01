# Studio 3D brief (Phases 2 and 3)

Owner: design-lead (art direction) · For: build-lead's 3d-engineer, design-lead's 3d-artist, and
Hazem for section 7 · Date: 2026-10-01 · Status: ready for review

Studio puts the build full-screen under studio light ([direction.md §4](direction.md#4-direction-c-studio)).
That makes the 3D the product's face, and its three known risks are all 3D risks:
- **quality:** no faithful free models of current parts exist;
- **cost:** it is the heaviest of the three directions for a laptop GPU;
- **timing:** it looks weak until the 3D exists.

This brief sets what the stage must show, an early model for Phase 2, the camera, light and
material direction, the performance limits, and the paid-asset options Hazem decides on.

It builds on the [3D asset survey](3d-asset-survey.md) of 2026-09-30 (free CC0 and CC BY models),
and on a 3d-artist worker's research of paid options on 2026-10-01 (section 7). The design lead
reviewed that research before it went in here.

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
   measurement (section 3.3), and also in the UI with its icon, word and reason
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

**Budget:** under 20k triangles, under 30 draw calls, no textures, one contact shadow. It must hold
60 fps on anything that runs WebGL 2, so it doubles as the fallback.

**Without WebGL 2** (the scaffold already detects this): show the stage background
([tokens.md §2.1](tokens.md#21-colour)) and a static isometric drawing of the case at its real
size, built like the WP-DS0 placeholder ([`tools/iso-case.mjs`](tools/iso-case.mjs)), with the
same callouts.

---

## 3. Camera, light and materials (art direction)

The mood is unchanged from the survey: a product film, a dark cyclorama, a strong key and a rim,
glossy glass, RGB that glows ([3d-asset-survey.md](3d-asset-survey.md#lighting-and-material-mood-per-direction)).

### 3.1 Camera

- **Lens:** perspective, 30° vertical field of view (34° on phones). It is a long product lens, so
  the case does not bend at the edges. Never wider than 40°.
- **Framing:** the build fills the free area: below the top bar, above the dock, and left of the
  rail from `lg` (`--topbar`, `--dock` and `--rail-width` in [tokens.md §2.5](tokens.md#25-layout)).
  Shift the camera's view offset rather than move the camera, so perspective stays true when the
  rail opens.
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
  queues.
- **Reduced motion:** no camera moves. A 200 ms crossfade (`--dur-cut`) cuts to the next shot.
- **The visitor's orbit:** drag to orbit, within yaw ±160° and pitch 0–35°; scroll or pinch to zoom
  within limits; double-click or the Reset button to return to the step's shot. The round tool
  buttons (orbit, explode, side, light, reset) do the same from the keyboard.
- **Nothing moves on its own.** No idle turntable: motion.md's rule 4 bars looping motion, and a
  still scene costs no power.

### 3.2 Light

- **Environment:** one CC0 Poly Haven studio HDRI at 1K, for reflections only:
  `monochrome_studio_02` or `cyclorama_hard_light` ([survey](3d-asset-survey.md#cc0-materials-and-lighting-safe-to-use-as-they-are)).
- **The background is the token, not the HDRI.** The cyclorama is `--stage` above the horizon and
  `--stage-floor` below, so the 3D and the page around it are the same colour. Re-read the tokens
  when the theme changes ([tokens.md §1.3](tokens.md#13-the-theme-switch)).
- **Key:** one directional light, upper left front, with the scene's only shadow map (1024²).
  **Rim:** one directional light, back right, no shadow. **Fill** comes from the environment.
- **Tone mapping:** AgX or Neutral, with exposure tuned so the floor shadow and the stage match
  the CSS stage at the horizon.
- **Light theme:** the same rig, with the cyclorama light grey, the key softer and the shadow
  lighter.
- **RGB:** emissive strips and fan rings take `--scene-light`, or the build's chosen colour. The
  colour changes in the shader over 400 ms (`--dur-light`). A half-resolution bloom with a high
  threshold makes only the emissive parts glow.
- **The interior light** (a Phase 3 look option): one point light inside the case, no shadow.

### 3.3 Materials

**One material library for every part.** Mixed conventions from different authors are what makes
a composite scene look cheap ([survey](3d-asset-survey.md#what-this-means-for-art-direction)).

| Material | Built as | Texture |
|---|---|---|
| Powder-coated steel (case; black or white per the case's `colors`) | Standard PBR, roughness about 0.6, a shared roughness noise | None, or one 512² noise |
| Smoked tempered glass | Transparent Standard PBR, opacity about 0.18, roughness 0.05, reflections from the HDRI. **No transmission:** it costs a second render pass | None |
| Brushed aluminium (fins, heatsinks) | Standard PBR, metal | CC0 ambientCG brushed metal, 1K |
| PCB black | Standard PBR, roughness 0.7 | None |
| Matte plastic (fans, shrouds) | Standard PBR, roughness about 0.8 | None |
| Sleeved cable | Standard PBR | CC0 fabric normal map, 512² |

Textures ship as KTX2, 2K at most, 1K or none for most. Physical materials (clearcoat,
transmission) only where a material needs them, and none in the Phase 2 model.

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
| Texture memory after KTX2 | ≤ 160 MB, 2K per map at most | |
| Transfer before the build's first frame | ≤ 6 MB of GLB and KTX2 | |
| Per part | case 60k, board 40k, GPU 40k, cooler 30k, RAM 3k per stick, fan 4k, PSU 6k triangles | |

**How Studio keeps 60 fps on an iGPU**
- **Render on demand.** The scene draws a frame only when something changes: a camera move, a
  part seating, an RGB change, the visitor's orbit. A still stage costs nothing, and the UI stays
  responsive.
- **Fans spin only in the Looks and Review steps**, while visible, and never with reduced motion.
  That is the only continuous rendering.
- **Device pixel ratio** starts at the screen's own, capped at 1.5. The ladder below may raise it
  to 2 when there is headroom, or drop it to 1.
- **A step-down ladder** for when the measured frame time stays above 16.7 ms (95th percentile)
  for 2 s. Each rung is tried in turn:
  1. bloom off;
  2. the shadow map becomes a baked contact shadow;
  3. pixel ratio 1.0;
  4. lower-detail models;
  5. the clearance model (section 2).

  It steps back up only after 10 s of headroom, so it never oscillates. drei's
  `PerformanceMonitor` and `AdaptiveDpr` cover most of this; check their current APIs with
  Context7 first.
- **Load per part, lazily,** after the first frame of the clearance model. The photoreal part
  replaces its volume with a 200 ms fade, so the stage is never empty and never waits.

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

---

## 6. Licences: why buying a model does not simply work

The question for every store is the same: may the model ship inside a GLB that the browser
downloads? A GLB in a browser is always extractable from the developer tools; Draco and Meshopt
are public formats, not protection. Quoted from each licence page; captures and URLs are listed
in section 9.

| Licence | Shipping the model in a web GLB | Branded ("editorial") items |
|---|---|---|
| **TurboSquid** Royalty Free | **No, unless TurboSquid approves in writing.** "Stock Media Products must be contained in proprietary formats so that they cannot be opened or imported in a publicly available software application or framework, or extracted without reverse engineering." It names "encrypted compression archive" formats as prohibited. | Editorial use "is limited to news reporting" |
| **CGTrader** Royalty Free | **Only with protection:** "you must take all commercially reasonable measures to prevent the end user from gaining access to the Product" | Editorial use only for "journalistic, editorial, cultural or otherwise newsworthy" purposes; brand clearance is "the sole responsibility of the Buyer" |
| **Envato** (3DOcean) Regular, Extended | **Only if not extractable:** "You must not permit an end user of the End Product to extract the Item and use it separately from the End Product." Clause 9 also bars "build it yourself" applications without a licence per final product, which may cover a PC builder. | Real products are "licensed on the basis of editorial use only" |
| **BlendKit** (formerly BlenderKit) Royalty Free | **No:** the software may not "embed any open-format 3D model" | No editorial flag; the risk stays with the user |
| **Sketchfab** Standard | **No stand-alone file access:** not "as a stand-alone file" | No commercial, promotional or advertising use |
| **Fab** (Epic) Standard | Unclear. Fab's own summary forbids redistributing an asset "on a standalone basis". The live EULA was behind a security check; a 2026-09-10 Wayback copy was read | Not read |
| *CC BY 4.0, for comparison* | Yes, with credit | CC BY never covers trademarks |

**What this means:** a marketplace purchase gives a licence Rig Lab cannot honour with a plain GLB.
It would need an encrypted custom mesh format (build-lead effort, and still only obfuscation)
plus the store's written approval. And the branded models, the ones that would matter on a
full-screen stage, are usually editorial-only, which bars a commercial site.

---

## 7. Paid-asset options for Hazem

**Nothing is bought, and nothing is sent.** Hazem decides; any purchase, licence or e-mail to a
maker needs his approval (CLAUDE.md, who's who).

| Option | Cost | What it covers | Conditions |
|---|---|---|---|
| **A. No cash: parametric models, CC BY, and permission letters** | **USD 0** | Phase 2's clearance model and Phase 3's parametric models for the whole catalogue. The survey's CC BY detail kit. The CC BY RTX 5090 FE if it passes review. ARCTIC's and ASUS's official models if they agree in writing. | Two permission e-mails, sent by Hazem or someone he names. A designee with a Sketchfab login to download the CC BY files: the team may not log in. ARCTIC's GLBs need decimating. |
| **B. Commission a hero set, with full rights** | **About USD 1,440, an estimate from a published rate card, not a quote** | The 2–4 parts the stage shows closest, modelled to our millimetre data and triangle budgets, delivered as GLB. The estimate is 2 complex models (a case, a GPU card) at "about $400", 2 typical models (a tower cooler, a 120 mm fan) at "about $200", and 4 finishes at "from about 60 USD". | Prices from UFO3D's pricing page, which also states "You own the files" and offers GLB. A case with mesh panels and glass may price as "ultra complex", from $1,200, so get a real quote first. Copying a maker's signature design keeps the trademark question; generic hero designs avoid it. |
| **C. Buy marketplace models, with protected delivery** | **USD 66.50 as listed**, mostly unconfirmed | 4 parts: a Fractal North (CGTrader, USD 22.50), an RTX 5090 FE CAD file needing retopology (CGTrader, USD 20.00), a DeepCool FC120 (TurboSquid, USD 15), a generic DDR5 stick (3DOcean, USD 9) | The first three prices are search-index leads, because those stores block automated reads; they must be confirmed on the live page. It needs TurboSquid's written approval, an encrypted mesh format, and live checks of the editorial flags. Envato's clause 9 may still bar a builder. **Not recommended.** |

**The design lead's recommendation:**
- **A now.** Phase 2 needs no paid asset, because the clearance model is parametric.
- **Decide on B before Phase 3 starts**, and only for the parts the stage shows closest: likely
  the case and the GPU card. Ask for a quote with our budgets and drawings attached.
- **Skip C.**
- **Answer three questions:**
  1. May we ask ARCTIC and ASUS for permission, and who sends the requests?
  2. Who downloads the CC BY files, with what account?
  3. Is a budget of about USD 1,500 for B open for Phase 3?

---

## 8. Known gaps

- **Only ARCTIC's two GLBs were measured.** No other model file was opened. The evaluation copies
  stay in the session scratchpad, never in the repo, and may not be used without ARCTIC's
  permission.
- **CGTrader, TurboSquid and Fab block automated reads.** Their prices in option C are
  search-index leads, and TurboSquid's licence was read from its own blog's copy (the licensing
  page returned 403).
- **Fab's binding EULA** was read only as a Wayback copy of 2026-09-10; the live page sat behind
  a security check.
- **RenderHub's licence** (the most permissive found) was read through WebFetch only, so its
  quotes are not byte-verified. It is left out of section 6 for that reason.
- **The frame-time costs in section 4 are targets.** None is measured until qa-lead's perf-tester
  runs the reference laptop.
- **The camera shot list is a first pass,** to be tuned against the real scene in Phase 2.
- **The form-factor standards** for board outlines, mounting holes, slot pitch (the 20.32 mm in
  section 1) and PSU sizes still need their sources added to data-lead's source registry before
  Phase 2 draws them.

---

## 9. Sources (read 2026-10-01 unless stated)

Captures are kept in the session scratchpad (`3d-paid-assets/`), never committed: third-party
pages are not republished.

| What | Publisher | URL | How it was read |
|---|---|---|---|
| Royalty Free licence, web-viewer guidance | TurboSquid | https://blog.turbosquid.com/royalty-free-license/ | Live, captured (turbosquid.com/licensing returned 403) |
| Royalty Free and Editorial licences | CGTrader | https://www.cgtrader.com/pages/terms-and-conditions | Live, captured |
| Regular and Extended licences | Envato (3DOcean) | https://3docean.net/licenses/terms/regular | Live, captured |
| Terms and licences | BlendKit | https://www.blendkit.com/terms-and-conditions-2021/ | Live, captured |
| Standard licence | Sketchfab | https://sketchfab.com/licenses | Live, captured |
| Fab EULA and licence summary | Epic Games | https://www.fab.com/eula (Wayback 2026-09-10), https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab | Wayback copy, captured; summary page live |
| 3D product modelling prices | UFO3D | https://ufo3d.com/3d-product-modeling-services/ | Live, captured by the design lead, 2026-10-01 |
| "DDR5 RAM memory module 1", USD 9 Regular and Extended | 3DOcean (FrancescoMilanese85) | https://3docean.net/item/ddr5-ram-memory-module-1/34030495 | Live, through WebFetch (direct requests met a bot check) |
| "NVIDIA RTX 5090 Founders Edition", CC BY 4.0 | Sketchfab (PolyDavid) | https://sketchfab.com/3d-models/nvidia-rtx-5090-founders-edition-5934a7ddfa144951ac66eb8cab13f220 | Sketchfab Data API |
| Liquid Freezer III Pro 360, official GLB and radiator spec | ARCTIC | https://www.arctic.de/en/Liquid-Freezer-III-Pro-360/ACFRE00180A | Live, captured; GLB measured |
| TUF Gaming RTX 5070 Ti, official 3D view | ASUS | the product page (file not located) | Live, captured |
