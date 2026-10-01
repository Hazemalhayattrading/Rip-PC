# 3D asset survey (WP-DS0)

Owner: design-lead (3d-artist work, done by design-lead in this package) · Surveyed 2026-09-30 · Status: for review

**Nothing was downloaded into the repo.** Every figure below comes from public metadata: the
Sketchfab Data API v3 (`/v3/search`, `/v3/licenses`), the Poly Haven API (`/assets`) and the
ambientCG API (`/api/v2/full_json`), all read on 2026-09-30. Thumbnails were fetched to the
scratchpad only, to judge realism by eye. Downloading from Sketchfab needs an account login,
which Phase 0 rules forbid, so nothing has been opened, measured or inspected as a file.

## Summary

1. **No CC0 PC-part models exist on Sketchfab for our categories.** Queries filtered to
   `license=cc0` returned no case, board, GPU, RAM, cooler, fan or PSU; the only CC0 hits for
   "AIO" were insect scans. **CC BY 4.0 is the realistic tier.** Sketchfab's "CC Attribution"
   label is CC BY 4.0 (`http://creativecommons.org/licenses/by/4.0/`, per `/v3/licenses`), so
   attribution is required in `CREDITS.md` and on the in-app credits page.
2. **Current-generation parts are missing.** The best GPU models are RTX 3070, 3080 and 4090, and
   the cases are older (Meshify C, H510, 4000D). Nothing matches the RTX 50 or RX 9000 cards, or
   cases like the Fractal North or Lian Li O11 Vision in our catalogue. For most of the
   catalogue, a representative model is the norm, not the exception.
3. **Almost every good model depicts a branded product** (Corsair, MSI, ASUS ROG, NVIDIA Founders
   Edition, Noctua, Lian Li). CC BY covers the modeller's copyright, not the brand's trademarks or
   trade dress. A branded model may only stand for that exact product. Using one for another
   product would mislead, which breaks CLAUDE.md rules 8 and 9.
4. **Quality, scale and budget are inconsistent.** Face counts range from 1,104 to 818,255 per
   part and textures from none to 26 × 8K. Several single parts exceed the whole-scene budget for
   the Arc iGPU target. Real-world scale is unknown until a file is measured.
5. **Recommendation: build parametric representative geometry from our own millimetre data, dress it with CC0 materials, and borrow a few CC BY detail meshes.**
   Exact branded models are allowed only when they pass four checks (below).

## Budget the models must fit

The reference is the 60 fps target on an Intel Core Ultra 7 155H (Arc iGPU) from BUILD_PROMPT §8.

| Budget (whole scene, one build) | Target | Why |
|---|---|---|
| Triangles | ≤ 350k (hard cap 500k) | Arc iGPU at 1440p with MSAA and one shadow map |
| Draw calls | ≤ 120 | CPU submit cost on a laptop |
| Texture memory | ≤ 160 MB after KTX2, maximum 2K per map | shared VRAM on an iGPU |
| Transfer, first build | ≤ 6 MB of GLB and KTX2 before the first frame of the build | LCP and 3D chunk streaming |
| Per part | case ≤ 60k, board ≤ 40k, GPU ≤ 40k, cooler ≤ 30k, RAM ≤ 3k per stick, fan ≤ 4k, PSU ≤ 6k tris | leaves headroom for cables and looks |

These are design targets for WP-DS1 and Phase 3. qa-lead measures the real numbers on the
reference laptop.

## Candidates

Columns:
- **Faces / tex** are Sketchfab's own figures for the source file. "tex 0" means no textures.
- **Realism** is 1 to 5, judged from the thumbnail.
- **Fit** says how well the model covers what our catalogue needs.
- **Representative?** says whether it must carry the "representative model" label if used.
- **Author** gives the display name, then the Sketchfab handle and profile link that CC BY
  credit needs. They come from the Sketchfab Data API v3 (`/v3/models/{uid}`), read 2026-10-01
  (QA finding DS0-13). That day all 39 models were still "CC Attribution". The Poly Haven row's
  author and URL come from `api.polyhaven.com/info/circuit_board`.

Every Sketchfab row's licence is **CC BY 4.0** ("CC Attribution" on Sketchfab), and each is
downloadable once logged in. The Poly Haven row is CC0.

Dimensions are deliberately not quoted here. No model file has been measured, and a spec number
needs a source (CLAUDE.md rule 1). "Unverified" means: measure the file against the manufacturer's
drawing, or the form-factor standard, before use.

### Mid-tower case

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Corsair 4000D Airflow (Free)](https://sketchfab.com/3d-models/34df3ba96cf94e71accdb5779c4b8694) | Kirigami ([@kirigami318](https://sketchfab.com/kirigami318)) | 98,464 / 43,267 | 1 × 1K | 4.3 MB | 3: clean mesh front | Claims the 4000D. Unverified; compare with Corsair's drawing | Only if it is not the 4000D | Good if the 4000D is in the catalogue. Decimate to about 60k |
| [Corsair 4000D PC case](https://sketchfab.com/3d-models/bc15e007d6634579bc0e8ffdf238e665) | SzaBa ([@SzaBa](https://sketchfab.com/SzaBa)) | 7,686 / 4,145 | 9 × 2K | 19.6 MB | 3: low poly, detail baked in | Claims the 4000D. Unverified | As above | Excellent budget; textures need KTX2 |
| [Fractal Design Meshify C](https://sketchfab.com/3d-models/a46526af2ac84fa098edc3f01c012450) | MUSHROOM_BUILDS ([@MUSHROOM_BUILDS](https://sketchfab.com/MUSHROOM_BUILDS)) | 224,234 / 146,292 | none | 12.3 MB | 3: untextured, stylised | Claims the Meshify C (older model). Unverified | Yes for any other case | Over budget ×4 |
| [Computer Case (Based off of NZXT 510B)](https://sketchfab.com/3d-models/d2279335aac944da90d05b33c606e178) | Up1x ([@alexlh2003](https://sketchfab.com/alexlh2003)) | 211,714 / 111,899 | none | 12.5 MB | 2.5 | "Based off", so not faithful | Yes | Weak |
| [Ncase M1](https://sketchfab.com/3d-models/bf11cc4a694a40238a2f95d4db92b590) | Vivien Deroche ([@blue-odym](https://sketchfab.com/blue-odym)) | 286,366 / 212,678 | 1 × 512 | 17.3 MB | 3.5 | Claims the Ncase M1 (Mini-ITX). Unverified | Yes for other ITX cases | Over budget ×5 |
| [Basic PC case](https://sketchfab.com/3d-models/2869fb18575d49128a3115d42d5d3826) | Sousinho ([@sousinho](https://sketchfab.com/sousinho)) | 26,832 / 13,670 | 7 × 4K | 51.1 MB | 3: RGB fans, glass | Generic | Yes | Good mesh, textures far too heavy |

### ATX motherboard

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [X570 Prime motherboard [HQ PBR]](https://sketchfab.com/3d-models/25b3659935774b1e9d73d8954be065d8) | Igor.Jop ([@Igor.Jop](https://sketchfab.com/Igor.Jop)) | 34,975 / 17,845 | 10 × 2K | 10.2 MB | 4: best of the set | Claims an ASUS Prime X570 (AM4). Check the outline against the ATX standard | Yes for AM5 and LGA1851 boards | Best candidate for a representative board |
| [B550 AORUS ELITE V2 model](https://sketchfab.com/3d-models/59f6b9b39f5d401b8beee8ff0c28e88e) | exitmonad ([@exitmonad](https://sketchfab.com/exitmonad)) | 36,034 / 17,085 | 15 × 1K | 4.4 MB | 3.5 | Claims the Gigabyte B550 Aorus Elite V2. Unverified | Yes | Good budget |
| [ARDOR GAMING B550M-HDVAR](https://sketchfab.com/3d-models/4c0a2a3008d9402ab9bfd05b2f0cd093) | BlenderFace ([@BlenderFace1](https://sketchfab.com/BlenderFace1)) | 20,866 / 11,025 | 3 × 1K | 2.5 MB | 3 | mATX. Check against the microATX standard | Yes | mATX representative |
| [Asus Z170-P Motherboard](https://sketchfab.com/3d-models/b998596cfc4945a0bc7b016005c39321) | Lassi Kaukonen ([@thesidekick](https://sketchfab.com/thesidekick)) | 312,196 / 155,906 | 3 × 8K | 92.1 MB | 4.5: photoreal | 2015 board, wrong socket for our catalogue | Yes | Reference quality only; far over budget |
| [Asus Strix B550-F Gaming, realistic](https://sketchfab.com/3d-models/3eba5f45bed74fbeb2647de38047000f) | MUSHROOM_BUILDS ([@MUSHROOM_BUILDS](https://sketchfab.com/MUSHROOM_BUILDS)) | 818,255 / 428,036 | 26 × 8K | 111.7 MB | 4 | Claims the B550-F | Yes | Unusable at this size |
| [Circuit Board](https://polyhaven.com/a/circuit_board) (Poly Haven `circuit_board`) | Benny Weimer | 14,430 polys | CC0 textures | n/a | 3.5 | Generic PCB, not ATX | Yes | CC0 detail prop only |

### Graphics card

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [GeForce RTX 3080 Graphics Card](https://sketchfab.com/3d-models/8b947ee1bf7a4e3d8ffa1c24893ac160) | _surovic_ ([@samuelsurovic](https://sketchfab.com/samuelsurovic)) | 105,536 / 53,290 | 4 × 4K | 12.0 MB | 4 | Founders Edition design (NVIDIA trade dress). Unverified | Yes: the FE look must not stand for partner cards | Over budget ×2.5 |
| [MSI GeForce RTX 3080 Gaming X Trio](https://sketchfab.com/3d-models/e5356746dcec48f9868164bb9674ab9a) | M E U ([@meu9MM98](https://sketchfab.com/meu9MM98)) | 64,760 / 34,179 | 8 × 2K | 4.8 MB | 4 | Claims the Gaming X Trio. Unverified | Yes: MSI branding | Good triple-fan shape for "long card" |
| [Asus ROG GeForce RTX 4090 v2.0](https://sketchfab.com/3d-models/6f527569f14b4efc94c7072842bd41ac) | MajdyModels ([@MG990](https://sketchfab.com/MG990)) | 163,798 / 84,754 | 3 × 2K | 9.4 MB | 3.5 | Claims the ROG Strix 4090. Unverified | Yes: ROG branding | Over budget ×4 |
| [Nvidia GeForce RTX 3070, updated](https://sketchfab.com/3d-models/29da4e10eb6c427cb72f3ebdf822f89e) | DatSketch ([@DatSketch](https://sketchfab.com/DatSketch)) | 53,969 / 28,015 | 1 × 512 | 3.0 MB | 3.5 | FE design | Yes | Dual-fan short card shape |
| [MSI RTX 3080 Graphics card](https://sketchfab.com/3d-models/e5c384afae914d548a591f722e1878fc) | Kaif.3D ([@kaif.3d](https://sketchfab.com/kaif.3d)) | 21,917 / 12,311 | 12 × 2K | 24.1 MB | 3 | Unverified | Yes | Good mesh budget, textures heavy |

### RAM stick

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Random Access Memory, RAM Stick, PC](https://sketchfab.com/3d-models/ab2b1c25c31b44c1a757911734bdf942) | Diego G. ([@empty_mirror](https://sketchfab.com/empty_mirror)) | 3,699 / 1,908 | 2 × 2K | 1.8 MB | 3: bare green PCB | Generic DIMM. Check length against the JEDEC outline | Yes | Good base for a bare low-profile stick |
| [g_skill trident z neo](https://sketchfab.com/3d-models/59a8b153475444da99dcd86e7d878e63) | BlenderFace ([@BlenderFace1](https://sketchfab.com/BlenderFace1)) | 1,104 / 680 | 2 × 1K | 0.2 MB | 3 | Claims the Trident Z Neo. Unverified | Yes: G.Skill branding | Excellent budget |
| [RAM Corsair Vengeance LPX](https://sketchfab.com/3d-models/ee11e1926e514075a70642ecb5dc5c2d) | supahot ([@supahot](https://sketchfab.com/supahot)) | 5,428 / 3,059 | 6 × 2K | 1.5 MB | 3 | Claims the LPX (low profile). Unverified | Yes | Low-profile shape |
| [Crucial BALLISTIX 8GB DDR4 3600](https://sketchfab.com/3d-models/1fce4935471e46cab6ee57ba140c87f9) | BlackCube ([@blackcube4](https://sketchfab.com/blackcube4)) | 5,374 / 3,992 | 8 × 4K | 15.6 MB | 3.5 | Discontinued product | Yes | Textures far too heavy |
| [Corsair DOMINATOR RGB RAM](https://sketchfab.com/3d-models/8995a60d2dcc46b3be14c35c1c016c0a) | MajdyModels ([@MG990](https://sketchfab.com/MG990)) | 97,070 / 48,668 | 2 × 1K | 4.7 MB | 3.5 | Claims the Dominator (tall, RGB) | Yes | Over budget ×30 per stick |

### Air cooler

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Cooler Master CPU Cooler](https://sketchfab.com/3d-models/e54651982f524644a2144b52a6b36e89) | BlenderFace ([@BlenderFace1](https://sketchfab.com/BlenderFace1)) | 93,460 / 46,574 | 1 × 2K | 5.5 MB | 3.5 | Tower with heatpipes, model unnamed | Yes | Decimate to about 30k |
| [HYPER 212 SPECTRUM](https://sketchfab.com/3d-models/83ee9f97dd5646bfbbba60fd68563f96) | BlenderFace ([@BlenderFace1](https://sketchfab.com/BlenderFace1)) | 34,954 / 17,424 | 15 × 1K | 5.7 MB | 3.5 | Claims the Hyper 212 Spectrum. Unverified | Yes | Good budget |
| [CPU Cooler](https://sketchfab.com/3d-models/672a0a74a98c452a862016bee99f3579) | Fochdog ([@bazyaev08](https://sketchfab.com/bazyaev08)) | 6,504 / 3,354 | 6 × 1K | 4.6 MB | 3 | Generic | Yes | Cheap generic tower |
| [Noctua NH-D15 CPU cooler](https://sketchfab.com/3d-models/23e225925e174a9f929d995cd9bd22e2) | SzaBa ([@SzaBa](https://sketchfab.com/SzaBa)) | 10,676 / 5,624 | none | 0.6 MB | 2: blocky | Claims the NH-D15. Unverified | Yes | Too crude for a photoreal look |
| [NH-P1 Passive CPU Cooler](https://sketchfab.com/3d-models/b287b18c8c0b4c7eb5fc707af72a6de8) | anachro19 ([@anachro19](https://sketchfab.com/anachro19)) | 15,858 / 8,012 | none | 0.7 MB | 3 | Claims the NH-P1 | Yes | Niche |

### AIO liquid cooler

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Corsair H150i Elite CPU Liquid Cooler](https://sketchfab.com/3d-models/faa8f55407404fd2870e35ab6a8f03bb) | MajdyModels ([@MG990](https://sketchfab.com/MG990)) | 499,484 / 343,873 | 1 × 1K | 19.7 MB | 4 | Claims a 360 mm H150i Elite. Unverified | Yes | Over budget ×16. Radiator and fans should be parametric |
| [Liquid CPU Cooling](https://sketchfab.com/3d-models/7a0014c1141a4c25bc69912075526ee5) | Denzerru ([@Denzerru](https://sketchfab.com/Denzerru)) | 107,910 / 54,755 | 1 × 256 | 7.7 MB | 2.5 | Generic | Yes | Weak |

### Case fan

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Computer cooler, pc fan](https://sketchfab.com/3d-models/50adf2b7b06f42588825ab7f31f7ca87) | Neutrino ([@itrek47](https://sketchfab.com/itrek47)) | 14,948 / 7,451 | 2 × 4K | 7.6 MB | 3.5 | Generic 120 mm fan (standard size, easy to verify) | Yes | Best generic fan. Downsize textures to 1K |
| [computer fan](https://sketchfab.com/3d-models/5360bd331c5848eeb9338b4f894e78e5) | Temoor ([@Temooor](https://sketchfab.com/Temooor)) | 61,940 / 30,582 | none | 4.4 MB | 3.5 | Generic | Yes | Decimate to about 4k |
| [Simple computer fan](https://sketchfab.com/3d-models/87e0b81409ca4a5cbf5ab194c73ba33a) | Javkal ([@Javkal](https://sketchfab.com/Javkal)) | 3,082 / 1,565 | 2 × 8K | 26.2 MB | 3 | Generic | Yes | Mesh budget ideal, textures absurd |
| [Lian Li UNI FAN SL120 RGB BLACK](https://sketchfab.com/3d-models/5abd0d8e89ea4241b7216f4b6d5a2ca4) | DIEKO ([@DIEKO](https://sketchfab.com/DIEKO)) | 4,648 / 2,686 | none | 0.3 MB | 3 | Claims the SL120 | Yes | Good budget, RGB ring shape |
| [RGB Cooling fan animated](https://sketchfab.com/3d-models/c2ae5f971caa45288f830e843ca9544e) | AJ Fatz ([@ManLikeAJ](https://sketchfab.com/ManLikeAJ)) | 91,016 / 51,500 | none | 4.6 MB | 3 | Generic, animated | Yes | Over budget |
| [Noctua fan](https://sketchfab.com/3d-models/61d0bfab147743138ab9b79d4316bc21) | BlackCube ([@blackcube4](https://sketchfab.com/blackcube4)) | 5,632 / 2,833 | 5 × 4K | 20.9 MB | 3.5 | Noctua colours are trade dress | Only as that fan | Heavy textures |

### Power supply

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Power Supply, Basic](https://sketchfab.com/3d-models/02db33d66a784c82a6202a3ec6850498) | Up1x ([@alexlh2003](https://sketchfab.com/alexlh2003)) | 25,016 / 11,095 | none | 1.4 MB | 2.5 | Generic ATX box | Yes | Hidden under a shroud in most cases |
| [PSU Power Supply Unit](https://sketchfab.com/3d-models/69ccd1be3a77497cb2acc9e39e7c52b3) | Groovex ([@dhafintaufiqi21](https://sketchfab.com/dhafintaufiqi21)) | 12,488 / 7,895 | none | 0.7 MB | 2.5 | Generic, modular sockets | Yes | Fine for the "open side" view |
| [Power supply Aerocool KCAS 500W ATX](https://sketchfab.com/3d-models/bfb1f77fffb0410f9ee0d0be6fb5fc88) | nofurion ([@nofurion](https://sketchfab.com/nofurion)) | 35,694 / 12,866 | 3 × 4K | 25.5 MB | 3 | Older product with a large logo | Yes | Poor fit |

### M.2 SSD (bonus, needed for the storage step)

| Model | Author | Faces / verts | Tex | GLB | Realism | Dimensional fidelity | Representative? | Fit |
|---|---|---|---|---|---|---|---|---|
| [Storage (SSD, HDD, M.2)](https://sketchfab.com/3d-models/bdd5fd67a7674359ab8648204b5c0575) | Vivien Deroche ([@blue-odym](https://sketchfab.com/blue-odym)) | 110,561 / 55,602 | 7 × 1K | 7.0 MB | 3.5 | Generic 2280 stick, so size is easy to verify | Yes | Split the M.2 out and decimate |
| [M.2 NVME SSD Samsung 990 Pro 1TB](https://sketchfab.com/3d-models/41b7bfda7eab40f8b13330913fd66fc2) | lime.ball.animations ([@lime.ball.animations.official](https://sketchfab.com/lime.ball.animations.official)) | 2,052 / 1,506 | 4 × 1K | 1.9 MB | 3 | Claims the 990 Pro | Only as that drive | Excellent budget |

## CC0 materials and lighting (safe to use as they are)

- **Poly Haven HDRIs** (CC0, all authors credited voluntarily). The `studio` category has 96 HDRIs. Useful ones:
  - `pav_studio_01` (white infinity cove), `monochrome_studio_01` and `_02` (Grzegorz Wronkowski);
  - `ferndale_studio_04` and `_08` (Dimitrios Savva, Jarod Guest; dark ceiling, umbrella softbox);
  - `cyclorama_hard_light` (Sergej Majboroda).

  Use the 1K or 2K HDR, never the 16K source.
- **ambientCG materials** (CC0): brushed aluminium `Metal009`–`Metal012`, circular brushed
  `Metal051A`/`Metal051C`, rubber `Rubber001`–`Rubber004`, fabric `Fabric004` (sleeved cables).
  Powder-coated steel and matte plastic are better made as flat PBR parameters with a shared
  roughness noise, with no texture at all.

## Not surveyed, and why

- **BlenderKit, TurboSquid Free, CGTrader Free, Free3D.** They use their own royalty-free or
  personal-use licences, not CC0 or CC BY. They are out of scope unless Hazem approves a licence
  (CLAUDE.md: paid or non-CC licences need him).
- **GrabCAD, Printables, Thingiverse.** Licences are per model and often non-commercial, and they
  are mostly CAD or STL without materials. They could be a dimensional reference, but not a visual
  asset, without clearance.
- **Manufacturer CAD (STEP or 3D PDF from case and cooler makers).** Terms vary by vendor. This is
  the best source for dimensional truth, and worth asking about in Phase 3.
- **Sketchfab "Free Standard" licence.** Commercial use is allowed under "basic restrictions",
  but it is not CC. It is listed only so nobody assumes it is CC BY. Hazem decides.

## What this means for art direction

**Build the build from our own numbers.** The site's promise is that clearance is shown truthfully
("GPU 304 mm of 355 mm"). No downloaded model is verified to the millimetre, and most don't even
depict the product in the catalogue. So:

1. **Parametric representative geometry** (built in `src/three/`, by build-lead's 3d-engineer)
   comes from catalogue fields. Case: `lengthMm`, `widthMm`, `heightMm`, radiator mounts, glass
   side. Board: form factor outline, socket position, DIMM and slot positions. GPU: `lengthMm`,
   `heightMm`, slot width, fan count. RAM: `heightMm`. Cooler: `heightMm`, radiator size. PSU:
   `lengthMm`. It is labelled "representative model" with the real product's name. This is
   accurate by construction, consistent in style, and a few KB of code instead of MBs of GLB. It
   also carries no trademark risk.
2. **A small CC BY detail kit** is reused everywhere:
   - one 120/140 mm fan (Neutrino or Temoor, decimated to about 4k);
   - one tower fin stack (Cooler Master or Fochdog);
   - one bare DIMM (Diego G.);
   - one M.2 stick (Vivien Deroche).

   Each is re-materialled to the shared CC0 library and credited in `CREDITS.md`.
3. **Exact branded models, only when all four checks pass:**
   - the licence is CC BY and recorded with an archived copy of the model page;
   - the exact product is in the catalogue;
   - its dimensions match the manufacturer's drawing within ±2 mm;
   - the logos are acceptable to show.

   Otherwise use the representative model.
4. **One material library for everything:** brushed aluminium, powder-coated steel, smoked glass,
   PCB black, matte plastic and sleeved cable. Mixed PBR conventions from different authors are
   what makes a composite scene look cheap.

### Lighting and material mood per direction

| | A Bench | B Folio | C Studio |
|---|---|---|---|
| Light | Flat, even, near-shadowless: large overhead softbox plus fill, HDRI `pav_studio_01` | Soft key from the upper left, one large softbox, gentle contact shadow (drei `ContactShadows`), HDRI `ferndale_studio_04` | Dark cyclorama, strong key plus rim, HDRI `monochrome_studio_02` or `cyclorama_hard_light` |
| Camera | Orthographic option; fixed iso view; measurement overlays in 3D | Fixed three-quarter "plate" view; turntable only on request | Moves to the part each step (about 700 ms); close-ups |
| Materials | Slightly desaturated; selected part outlined in the trace colour, others at 30% ("x-ray") | Matte, restrained reflections; true colours | Glossy glass with reflections, emissive RGB with a half-resolution bloom pass |
| iGPU cost | Lowest: no dynamic shadows, baked AO | Low: one contact shadow, no bloom | Highest: bloom, reflections, camera moves; must be budgeted first |

## Risks

- **Licence drift.** Sketchfab licences can change. Record each licence at download time, archive
  the model page (Wayback), and keep the licence text with the entry in `CREDITS.md`.
- **Downloads need an account.** Someone Hazem designates must download, since the team may not
  log in.
- **Trademark and trade dress** (NVIDIA Founders Edition shroud, Noctua colours, ROG logos).
  Strip or avoid them unless the model is the exact product.
- **Dimensional truth is unknown** until each file is measured against the manufacturer's drawing.
- **Performance.** 17 of the 37 part candidates listed (the two SSDs aside) exceed their per-part
  triangle budget by 2× or more: 3 cases, 2 boards, 2 GPUs, 1 RAM, 1 air cooler, 2 AIOs, 3 fans
  and 3 PSUs. Decimation can wreck hard-surface shading. Budget Studio's bloom and reflections
  first.
- **Coverage.** Current-generation GPUs and cases are absent, so representative models will cover
  most of the catalogue. The UI must make the "representative model" label clear without
  cluttering the view.
