# Credits & Licences

Every dataset, benchmark source and 3D model used by Rig Lab is listed here.

## Datasets
| Dataset | Licence | Use | Notes |
|---|---|---|---|
| docyx/pc-part-dataset | MIT | Not used so far | Snapshot July 2025, scraped from PCPartPicker. The 2026-09-30 seed batch took no part list, spec or file from it: every part was chosen and specified from its maker's own pages. If a later batch commits a subset, its MIT notice goes with it. |
| Blender Open Data (opendata.blender.org) | Its About page: "License-free - Data is not subject to any copyright, patent, trademark or trade secret regulation." | 9 creator anchors: Blender 5.2.0 GPU medians (OptiX, HIP, oneAPI), read 2026-09-30 | Medians and sample sizes as the query pages show them |
| Steam Web API and Steam store API (Valve) | Public endpoints; each figure is cited with its request URL | Games list: current player counts, app IDs and release dates, read 2026-09-30 | |

## Benchmark sources
| Source | Publisher | Use | Access | Notes |
|---|---|---|---|---|
| "AMD Radeon RX und Nvidia GeForce RTX im Benchmark (Gaming-Grafikkarten 2026 im Test)", pages 4 and 5, published 2026-05-06 | ComputerBase | 80 GPU-bound game rows (1440p and 4K) | Live pages, read 2026-09-30 | Numbers only, with their test conditions; no text or charts copied |
| "AMD Ryzen 7 9850X3D Review", page 18 (Game Tests 1080p/RTX 5090), published 2026-01-28 | TechPowerUp | 36 CPU-bound game rows (1080p) | Wayback Machine snapshots (the live site answers our fetcher with HTTP 403) | Numbers read from the chart images; no charts copied |
| "AMD Ryzen 7 9800X3D Review", page 9 (Rendering), published 2024-11-06 | TechPowerUp | 18 Cinebench 2024 rows | Wayback Machine snapshots | As above |

## Spec, price and games-list sources
| Role | Publishers | Use | Notes |
|---|---|---|---|
| Manufacturers | AMD, Intel, ASUS, NVIDIA, PNY Technologies, Sapphire Technology, G.SKILL, TEAMGROUP, Sandisk, Samsung Electronics, DeepCool, NZXT, ARCTIC, Fractal Design | Every spec value: spec pages, manuals, CPU support lists, BIOS release notes, datasheets, press releases | Facts cited with links; no text, images or logos copied. Where a maker's live page did not serve our fetcher (most AMD product pages, Samsung), a Wayback Machine snapshot was read and its `archiveUrl` recorded. |
| Retailers | Amazon.com and Newegg (US), Amazon.sa (SA) | Prices only, read from live product pages on 2026-09-30 | Page captures stay in the local `artifacts/` folder as audit evidence; they are never committed or republished. |
| Games-list sources | Steam Charts, Riot Games, KitGuru, Esports News UK, Windows Central | Player counts for the games list | Dated figures, cited with links |

## 3D models
| Model | Author | Source URL | Licence | Representative? |
|---|---|---|---|---|
