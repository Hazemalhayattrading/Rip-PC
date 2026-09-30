# RIG LAB — Build Prompt

> Paste this into the first message of a Claude Code session (Opus, max effort) opened on this repo,
> or tell the session: **"Read BUILD_PROMPT.md and CLAUDE.md, then start Phase 0."**

---

## 0. Mission

Build **Rig Lab**, a PC-builder website. A visitor walks in knowing nothing and walks out **ready to buy**:
they pick every part and every look, watch the PC assemble in live, photoreal 3D, and get a full,
sourced picture of what that exact build will do:

- FPS in the most popular games at 1080p / 1440p / 4K, across quality presets, with and without upscaling
- Creator performance: Blender render time, Cinebench, video export, code compile, AI (tokens/s, images/min)
- Full compatibility check: CPU ↔ motherboard, RAM ↔ motherboard, GPU ↔ case, cooler ↔ case, PSU ↔ load, and more
- Bottleneck analysis that explains, in plain English, which part holds the build back and in which workloads
- Price per part and total in **SAR and USD** (toggle), with source and date on every price
- A final "Buy Sheet": the parts list, total, links, and the reasons each part is right (or wrong)

English only. Accuracy beats flash. Smoothness beats feature count. But the target is both, at the top level.

---

## 1. How you work — the organisation

You (the main session) are the **Director**. Agent teams are enabled in `.claude/settings.json`
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

```
                        DIRECTOR (you, the lead session)
       ┌──────────────┬──────────────┬──────────────┬──────────────┐
   data-lead      build-lead     design-lead      qa-lead
   (teammate)     (teammate)     (teammate)       (teammate)
      │               │              │                │
  hardware-       frontend-      ui-designer      e2e-tester
  researcher      engineer       motion-designer  visual-tester
  benchmark-      engine-        3d-artist        perf-tester
  researcher      engineer                        data-auditor
  price-          3d-engineer
  researcher
                 (workers = subagents each lead spawns)
```

### Spawning
1. Spawn exactly four teammates, **named exactly** `data-lead`, `build-lead`, `design-lead`, `qa-lead`,
   each using the agent type of the same name from `.claude/agents/`. Use Opus for all of them.
2. Each lead spawns its own workers as subagents, using the worker agent types in `.claude/agents/`.
   Teammates cannot spawn teammates. That is expected: workers are subagents, leads are teammates.
3. Give every lead a spawn prompt that includes: the phase goal, the files it owns, the acceptance
   criteria from this document, and what it must hand back.

### The review chain (non-negotiable)
```
worker produces → lead reviews against the spec, sends back until it passes
               → lead hands to DIRECTOR with evidence (screenshots, test output, sources)
               → DIRECTOR reviews → accept, or reject with exact reasons
               → qa-lead verifies every accepted item independently before a phase closes
```
- Nothing merges into `main` without Director acceptance **and** a green QA report.
- Every hand-off to the Director contains **evidence**, not claims: a screenshot path, a test log,
  a source URL, a measured number.
- Workers never talk to the Director directly. Leads may talk to each other (e.g. build-lead asks
  data-lead for a schema change).

### The Director's standard
You are a senior PC hardware engineer and a senior product lead in one person. You know sockets,
chipsets, BIOS generations, memory topology, PCIe lane sharing, transient power spikes, airflow,
and how game engines scale with CPU and GPU. You reject work that is:
- **Numerically unsourced** (any spec, FPS, render time or price without a source and date)
- **Physically wrong** (a 360 mm radiator in a case that only fits 280 mm, a DDR4 kit on an AM5 board)
- **Visually generic** (the default "AI website" look: purple gradient, centered hero, stock cards)
- **Janky** (dropped frames, layout shift, a spinner where an optimistic UI belongs)
- **Unverified** (no test, no screenshot, "should work")

When in doubt, reject and say exactly why. Make the rejection specific enough that the lead can fix it in one pass.

### Fallback if teammates don't spawn
If agent teams are unavailable in this environment (no teammates appear), keep the same hierarchy
with subagents: you spawn a lead-type subagent per team for each work package, the lead-type subagent
does the work and self-reviews, then you spawn a **fresh** `qa-lead` subagent to verify, then you review.
Never skip the independent QA step.

---

## 2. Phases

Work phase by phase. Each phase ends with a Director review and a short written report in
`docs/reports/phase-N.md` (what shipped, evidence, open issues).

### Phase 0 — Foundations (no UI yet)
- **data-lead**: data schemas (`src/data/schema/*.ts` with Zod), source registry, first seed data (see §4).
- **design-lead**: research the best builder / configurator experiences (§6), write `docs/design/direction.md`
  with 3 distinct visual directions and screenshots of references; Director picks one.
- **build-lead**: scaffold the stack (§7), CI, GitHub Pages deploy, test harness, empty routes.
- **qa-lead**: test plan (`docs/qa/test-plan.md`), Playwright set-up, performance budget checks in CI.

### Phase 1 — The engine (the brain, no 3D yet)
- Compatibility engine (§5.1), power estimator (§5.2), performance model (§5.3), bottleneck analyser (§5.4).
- Pure TypeScript in `src/engine/`, 100% unit-tested, with golden tests against published review numbers.
- QA's data-auditor spot-checks 10% of all numbers against their sources.

### Phase 2 — The builder UI
- Step flow: Use case → Budget → CPU → Motherboard → RAM → GPU → Storage → PSU → Cooling → Case → Fans/Looks → Review.
- Every step: filter, sort, compare up to 3, live compatibility badges, live total, live FPS preview.
- Incompatible parts are shown but disabled with the exact reason ("Needs AM5 — your board is LGA1851").

### Phase 3 — The 3D garage
- Photoreal 3D case that assembles live as parts are picked: motherboard drops in, CPU seats, RAM clicks,
  GPU slides into the slot, cables route, fans spin, RGB follows the chosen colour.
- Look options per part (colour, RGB mode, glass side on/off, vertical GPU mount where supported).
- Orbit, zoom, exploded view, "open side panel", interior light.

### Phase 4 — Results & Buy Sheet
- Performance dashboard: per game, per resolution, per preset, upscaling on/off; creator workloads.
- Bottleneck page with plain-English verdict and "fix it" suggestions (same budget, better balance).
- Buy Sheet: shareable URL (build encoded in the URL), print/PDF-friendly, SAR/USD toggle, every link and date.

### Phase 5 — Polish & hardening
- Performance pass against the budget (§8), accessibility pass, empty/error states, mobile layout.
- Full regression run, final Director audit, release.

---

## 3. Product scope details

### Parts categories (v1)
CPU · CPU cooler (air / AIO) · Motherboard · RAM · GPU · Storage (NVMe / SATA) · PSU · Case · Case fans · Thermal paste (optional) · OS (optional line item)

### Look options
Case colour, glass panel, RGB colour and effect, fan style, GPU orientation, cable type (standard / sleeved).
Only offer an option if the real product supports it.

### Use-case presets
Competitive esports · AAA 1440p · 4K max · Streaming + gaming · Video editing · 3D / Blender · Local AI · Budget office.
A preset pre-fills a sensible build the user can change; it is never a hidden recommendation engine.

### Games list (initial — data-lead confirms the current top titles by player count before locking it)
Counter-Strike 2, Valorant, Fortnite, Apex Legends, Call of Duty (current title), Cyberpunk 2077,
Baldur's Gate 3, Black Myth: Wukong, Alan Wake 2, Red Dead Redemption 2, GTA V, EA Sports FC (current),
Marvel Rivals, Elden Ring, Minecraft (Java + shaders).

---

## 4. Data — the heart of accuracy

### Rules
1. **Every number has a source.** Each record carries `sources: [{url, publisher, retrievedAt}]`.
2. **Specs** come from the manufacturer's official spec page first. Datasets are seeds, not truth.
3. **Benchmarks** come from reputable, published reviews (e.g. TechPowerUp, Hardware Unboxed, Gamers Nexus,
   Tom's Hardware, Puget Systems, Blender Open Data). Store the test conditions: resolution, preset,
   upscaling, the CPU/GPU used, driver/game version, date.
4. **Prices** are stored per market (`SA`, `US`) with currency, retailer, URL and `retrievedAt`.
   Show "Price as of <date>" everywhere. Never invent a price. If there is no price, say so.
5. Licensing: record the licence for every dataset and 3D model in `CREDITS.md`.
   Seed specs may use `docyx/pc-part-dataset` (MIT, snapshot July 2025, scraped from PCPartPicker):
   treat it as a starting list only, verify against manufacturers, and add 2025–2026 parts it lacks.
6. Scope v1 to a **curated** catalogue (≈ 30–60 CPUs, 40–80 GPUs, 60 boards, 40 RAM kits, 40 cases,
   30 PSUs, 30 coolers, 30 SSDs), current generation plus the most-sold previous generation.
   Quality over size.

### Required fields (minimum)
- **CPU**: socket, cores/threads, clocks, cache (incl. 3D V-Cache), TDP/PPT, memory support, iGPU, PCIe gen/lanes, launch date
- **Motherboard**: socket, chipset, form factor, BIOS version needed per CPU family, DIMM slots, max RAM, memory type,
  M.2 slots with PCIe gen and **lane-sharing rules** (which M.2 disables which SATA/PCIe slot), PCIe slots, rear I/O, Wi-Fi
- **RAM**: type, capacity, kit size, speed, timings, voltage, EXPO/XMP, height (for cooler clearance)
- **GPU**: chip, VRAM, TBP, recommended PSU, power connectors (8-pin / 12V-2x6), length / width / slot thickness, outputs
- **Case**: form factors supported, max GPU length, max cooler height, radiator support per position, fan mounts, PSU length, drive bays
- **PSU**: wattage, efficiency rating, ATX 3.x, native 12V-2x6, length, modularity
- **Cooler**: type, height or radiator size, socket support, rated TDP class
- **Storage**: interface, PCIe gen, capacity, read/write, DRAM/HMB, endurance

---

## 5. The engine

### 5.1 Compatibility (every rule is a test)
Socket match · chipset supports CPU · **BIOS flashback needed?** · RAM type and slot count · RAM speed vs
board/CPU support (warn above officially supported, explain EXPO/XMP) · GPU length vs case · GPU thickness vs
slot spacing · cooler height vs case · RAM height vs air-cooler overhang · radiator size and position vs case ·
PSU form factor and length vs case · PSU wattage vs estimated load with transient headroom · 12V-2x6 availability ·
M.2 count and lane-sharing side effects · form factor board vs case · front-panel USB-C header present.

Each result is `ok | warn | block` with a one-sentence human reason and a source/rule id.

### 5.2 Power
Sum of realistic gaming and worst-case loads (CPU PPT, GPU TBP, board, RAM, drives, fans, pump), plus
transient headroom per GPU class. Recommend a PSU range, not a single number.

### 5.3 Performance model
- FPS is **estimated**, and the UI says so. Show a range (e.g. 142–158 fps) and a confidence level.
- Method: anchor tables of measured results → GPU-limited estimate per game/resolution/preset;
  CPU-limited estimate from CPU-bound tests (low resolution) → **final = min(GPU-limited, CPU-limited)**,
  adjusted for RAM speed/capacity and VRAM limits (flag when a game at that setting exceeds VRAM).
- Upscaling (DLSS/FSR/XeSS) and frame generation shown separately and clearly labelled; frame-gen
  numbers are never mixed into native numbers.
- Creator workloads: Blender (Open Data scores → render time for a named scene), Cinebench R24 single/multi,
  video export (PugetBench-style), code compile, local AI (tokens/s for a named model size, gated by VRAM).
- Golden tests: for every anchor configuration, the model must reproduce the published number within ±5%.
  For interpolated configurations, cross-validate with held-out reviews; report the error in `docs/reports`.

### 5.4 Bottleneck analyser
Per workload, say which component is the limiter and by how much. Plain English:
"At 1440p High in Cyberpunk 2077 your GPU is the limit. A faster CPU would add ~2%, a GPU one tier up would add ~28%."
Offer 1–3 rebalanced builds at the same total price.

---

## 6. Design direction — study the best, then do better

design-lead's team studies these with Playwright screenshots before proposing directions
(study interaction patterns, never copy branding or assets):
- **PCPartPicker**: compatibility clarity, dense but readable part tables
- **NZXT BLD / builder flows**: guided, step-based configuration
- **Apple product configurators**: calm step flow, live price, one decision per screen
- **Linear, Vercel, Stripe, Raycast**: motion quality, typography, speed, polish
- **Car configurators (Porsche, Tesla)**: live 3D product that reacts instantly to every choice

Principles: one decision in focus at a time; the 3D build is always visible on desktop; instant feedback
(<100 ms) on every pick; numbers animate between states; no modal where a panel works; dark theme first,
light theme supported; the design must look like a premium hardware brand, not a template.

---

## 7. Stack

- Vite + React 19 + TypeScript (strict) + Tailwind CSS v4
- 3D: three.js via React Three Fiber + drei, postprocessing; GLB assets compressed with gltf-transform
  (Meshopt/Draco, KTX2 textures); lazy-load per part
- Motion: Motion (Framer Motion) for UI, GSAP only if needed for timelines
- State: Zustand; build encoded in the URL for sharing
- Validation: Zod for all data
- Tests: Vitest (engine, data), Playwright (e2e, visual, performance)
- Deploy: GitHub Pages via GitHub Actions on push to `main`
- Use the Context7 MCP to check current library APIs before writing code against them.

### 3D models
CC0 / CC-BY models first (Sketchfab, Poly Haven, etc.). Paid models only after Hazem approves the licence.
Every model listed in `CREDITS.md` with licence and author. Where no real model exists for a product,
use a clearly generic model of the right dimensions and label it "representative model".

---

## 8. Quality bars (qa-lead enforces)

- **60 fps** in the 3D garage on a mid laptop iGPU (reference: Intel Core Ultra 7 155H with Arc iGPU, Chrome with hardware
  acceleration on) and on desktop; 120 fps on a high-end desktop GPU. Measured, not guessed.
- Lighthouse performance ≥ 90 on the landing page; LCP < 2.5 s; CLS < 0.05; INP < 200 ms.
- Initial JS < 250 KB gzip before the 3D chunk; the 3D scene streams in progressively.
- Zero console errors. Zero unhandled promise rejections.
- Every compatibility rule has a passing positive and negative test.
- WCAG 2.1 AA for all non-3D UI; full keyboard path through the builder.
- Visual regression screenshots for every step at 390 px, 768 px, 1440 px.

---

## 9. Definition of done (v1)

A new visitor can, in under 5 minutes: pick a use case and budget, build a full PC with looks, see it assembled in 3D,
read sourced FPS/creator estimates and a bottleneck verdict, switch SAR/USD, and leave with a shareable Buy Sheet.
Every number on screen links to its source. QA report is green. Director signs off in `docs/reports/release-v1.md`.
