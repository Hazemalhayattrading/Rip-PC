# Reference captures (WP-DS0)

**Design study only; trademarks belong to their owners.** These are screenshots of other companies'
websites, kept so the team can discuss interaction patterns. Rig Lab never copies their logos, text,
imagery or other assets (CLAUDE.md rule 9). The pattern notes are in
[`../reference-study.md`](../reference-study.md).

How they were made:
- Headless Chromium (Playwright 1.56.1, bundled build 1194), one browser, one request at a time per
  host. No login, no form submission, no cart action. Non-essential cookies were declined where a
  clear button existed, and one marketing modal (NZXT) was closed with its own close button.
- PCPartPicker, Tesla and Framework block or time out on headless browsers here, so they were
  studied through Wayback Machine snapshots (the snapshot date is in each caption).
- Viewports: desktop 1440 × 900 at 1×; phone 390 × 844 at 2×. Committed copies are downscaled to
  1280 px (desktop) or 585 px (phone) wide, JPEG, all under 120 KB. Each image carries its caption
  in a strip at the bottom, so it stays attributed when viewed on its own.
- Full-size PNGs and the capture log stay in `artifacts/screenshots/phase-0/WP-DS0/references/`
  (git-ignored).

| File | Site | What it shows | Source | Captured (UTC) | Size |
|---|---|---|---|---|---|
| [pcpp-list-1440.jpg](pcpp-list-1440.jpg) | PCPartPicker (archived) | Empty part list: category rows, compatibility bar, estimated wattage | [archive](https://web.archive.org/web/20260929203119/https://pcpartpicker.com/list/) of https://pcpartpicker.com/list/ (snapshot 2026-09-29) | 2026-09-30 | 1280×864, 68 KB |
| [pcpp-guide-list-1440.jpg](pcpp-guide-list-1440.jpg) | PCPartPicker (archived) | Filled part list: compatibility status, wattage, price breakdown per row | [archive](https://web.archive.org/web/20260327195740/https://pcpartpicker.com/guide/jd2Ff7/great-amd-gaming-build) of https://pcpartpicker.com/guide/jd2Ff7/great-amd-gaming-build (snapshot 2026-03-27) | 2026-09-30 | 1280×864, 110 KB |
| [pcpp-cpu-1440.jpg](pcpp-cpu-1440.jpg) | PCPartPicker (archived) | CPU category page: compatibility filter, part-list summary, compare controls (rows were not archived) | [archive](https://web.archive.org/web/20260913081842/https://pcpartpicker.com/products/cpu/) of https://pcpartpicker.com/products/cpu/ (snapshot 2026-09-13) | 2026-09-30 | 1280×864, 51 KB |
| [pcpp-gpu-1440-rows.jpg](pcpp-gpu-1440-rows.jpg) | PCPartPicker (archived) | Category table rows: compare checkbox, spec columns, rating, price, add. The archive served case rows into this page; the table pattern is what matters | [archive](https://web.archive.org/web/20260929000057/https://pcpartpicker.com/products/video-card/) of https://pcpartpicker.com/products/video-card/ (snapshot 2026-09-29) | 2026-09-30 | 1280×864, 113 KB |
| [pcpp-list-390.jpg](pcpp-list-390.jpg) | PCPartPicker (archived) | Part list at 390 px | [archive](https://web.archive.org/web/20260929203119/https://pcpartpicker.com/list/) of https://pcpartpicker.com/list/ (snapshot 2026-09-29) | 2026-09-30 | 585×1327, 54 KB |
| [pcpp-gpu-390.jpg](pcpp-gpu-390.jpg) | PCPartPicker (archived) | Category table at 390 px: each row becomes a stacked card with a spec grid | [archive](https://web.archive.org/web/20260929000057/https://pcpartpicker.com/products/video-card/) of https://pcpartpicker.com/products/video-card/ (snapshot 2026-09-29) | 2026-09-30 | 585×1344, 90 KB |
| [nzxt-player-1440.jpg](nzxt-player-1440.jpg) | NZXT | Prebuilt configurator: series, model, colour, specs, sticky price | https://nzxt.com/products/player-three | 2026-09-30 | 1280×864, 91 KB |
| [nzxt-player-perf-1440.jpg](nzxt-player-perf-1440.jpg) | NZXT | Estimated FPS block: single numbers per game, resolution toggle | https://nzxt.com/products/player-three | 2026-09-30 | 1280×864, 76 KB |
| [nzxt-player-390.jpg](nzxt-player-390.jpg) | NZXT | Configurator at 390 px: price and action docked | https://nzxt.com/products/player-three | 2026-09-30 | 585×1327, 74 KB |
| [apple-mbp-1440.jpg](apple-mbp-1440.jpg) | Apple | Mac configurator first view: one decision, progress rail at the right edge | https://www.apple.com/shop/buy-mac/macbook-pro | 2026-09-30 | 1280×864, 57 KB |
| [apple-mbp-select-1440.jpg](apple-mbp-select-1440.jpg) | Apple | After choosing a size: selection state and advancing progress rail | https://www.apple.com/shop/buy-mac/macbook-pro | 2026-09-30 | 1280×864, 51 KB |
| [apple-mbp-390.jpg](apple-mbp-390.jpg) | Apple | Configurator at 390 px | https://www.apple.com/shop/buy-mac/macbook-pro | 2026-09-30 | 585×1327, 49 KB |
| [porsche-1440-colour.jpg](porsche-1440-colour.jpg) | Porsche | After picking a colour: render updates in place, header price updates | https://configurator.porsche.com/en-US/mode/model/992142 | 2026-09-30 | 1280×864, 112 KB |
| [porsche-390.jpg](porsche-390.jpg) | Porsche | Configurator at 390 px: render on top, options below, price docked | https://configurator.porsche.com/en-US/mode/model/992142 | 2026-09-30 | 585×1327, 85 KB |
| [puget-cpu-1440.jpg](puget-cpu-1440.jpg) | Puget Systems | PC configurator: option lists with price deltas and stock badges | https://www.pugetsystems.com/products/workstations/configure/ | 2026-09-30 | 1280×864, 81 KB |
| [owid-1440.jpg](owid-1440.jpg) | Our World in Data | Chart with its source line and licence directly underneath | https://ourworldindata.org/grapher/life-expectancy | 2026-09-30 | 1280×864, 95 KB |
| [owid-390.jpg](owid-390.jpg) | Our World in Data | Chart at 390 px, source line kept with the chart | https://ourworldindata.org/grapher/life-expectancy | 2026-09-30 | 585×1327, 88 KB |
| [framework-1440.jpg](framework-1440.jpg) | Framework (archived) | Laptop configurator: segmented choices, save, stock state, compare | [archive](https://web.archive.org/web/20260514034910/https://frame.work/products/laptop-diy-13-gen-amd/configuration/new) of https://frame.work/products/laptop-diy-13-gen-amd/configuration/new (snapshot 2026-05-14) | 2026-09-30 | 1280×864, 57 KB |
| [framework-390.jpg](framework-390.jpg) | Framework (archived) | Configurator at 390 px | [archive](https://web.archive.org/web/20260514034910/https://frame.work/products/laptop-diy-13-gen-amd/configuration/new) of https://frame.work/products/laptop-diy-13-gen-amd/configuration/new (snapshot 2026-05-14) | 2026-09-30 | 585×1344, 75 KB |
| [linear-1440.jpg](linear-1440.jpg) | Linear | First view: type, restraint, product UI as the image | https://linear.app/ | 2026-09-30 | 1280×864, 66 KB |
| [linear-390.jpg](linear-390.jpg) | Linear | First view at 390 px | https://linear.app/ | 2026-09-30 | 585×1327, 60 KB |
| [vercel-1440.jpg](vercel-1440.jpg) | Vercel | First view: monochrome, one mark, generous space | https://vercel.com/ | 2026-09-30 | 1280×864, 37 KB |
| [vercel-390.jpg](vercel-390.jpg) | Vercel | First view at 390 px | https://vercel.com/ | 2026-09-30 | 585×1327, 39 KB |
| [stripe-1440.jpg](stripe-1440.jpg) | Stripe | First view: type scale and grid (its gradient is a pattern Rig Lab avoids) | https://stripe.com/ | 2026-09-30 | 1280×864, 90 KB |
| [stripe-390.jpg](stripe-390.jpg) | Stripe | First view at 390 px | https://stripe.com/ | 2026-09-30 | 585×1327, 80 KB |
| [raycast-1440.jpg](raycast-1440.jpg) | Raycast | First view: dark, keyboard-first product | https://www.raycast.com/ | 2026-09-30 | 1280×864, 72 KB |
| [raycast-390.jpg](raycast-390.jpg) | Raycast | First view at 390 px | https://www.raycast.com/ | 2026-09-30 | 585×1327, 69 KB |

Not captured (reasons in [`../reference-study.md`](../reference-study.md#sites-not-studied)):
Tesla (the archived design studio renders an empty page), Polestar (empty page in headless Chromium
after 20 s), and a live PCPartPicker session (blocked here).
