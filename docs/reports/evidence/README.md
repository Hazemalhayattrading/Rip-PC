# Evidence captures — kept outside the repo

Owner: Director · Decided by Hazem on 2026-10-01.

Rig Lab's audit evidence is kept on Hazem's PC, not in this public repository. It includes the
captures of third-party pages:
- retailer price pages;
- manufacturer spec pages and manuals;
- published reviews and their charts;
- games-list sources;
- design reference sites.

It also includes test logs, Lighthouse and axe reports, and screenshots of our own pages.

This folder lists every file by SHA-256, so anyone with the local copy can prove nothing changed.

## Where it lives

`C:\Projects\rig-lab-evidence\` on Hazem's Windows PC:

| Folder | Files | Size | What |
|---|---:|---:|---|
| `data-lead-artifacts/artifacts/` | 1,167 + 21 | 560.4 MB + new | price captures (SA, US) and run logs, spec captures, benchmark pages and chart images, games-list captures, audit samples, data-lead's scratch scripts |
| `design-lead-artifacts/artifacts/` | 118 | 41.3 MB | WP-DS0 and WP-DS1 screenshots, the pinned font cache, WP-DS1 scripts and logs |
| `qa-q0-artifacts/artifacts/` | 49 | 4.7 MB | WP-Q0 Lighthouse and bundle reports |
| `qa-q1-artifacts/artifacts/` | 113 | 11.9 MB | WP-Q1 Lighthouse, web vitals, axe and screenshots |
| `build-lead-artifacts/artifacts/` | 9 | 0.4 MB | WP-B0 screenshots |
| `session-scratchpad/` | 787 | 30.6 MB | the cloud Director session's scratchpad, 2026-09-30 |
| `archives/` | 14 | 222.3 MB | the original archives committed on 2026-09-30: 9 `.tar.xz` parts and 2 git bundles, plus `SHA256SUMS.txt`, `EXCLUDED.txt` and data-lead's manifest |

The leads' worktrees hold working copies of their team's `artifacts/` folder. The price rows cite
paths such as `artifacts/prices/...`, relative to a data-lead worktree root.

## Manifests in this folder

| File | Lists | Paths relative to |
|---|---|---|
| `files.sha256` | all 2,243 extracted files | `C:\Projects\rig-lab-evidence\` |
| `archives.sha256` | the 9 archive parts and the 2 bundles (the original `SHA256SUMS.txt`) | `C:\Projects\rig-lab-evidence\archives\` |
| `data-lead-evidence-manifest.sha256.txt` | data-lead's 1,102 cited evidence files; 1,101 are kept, and 1 was excluded by design | a data-lead worktree root |
| `data-lead-evidence-2026-10-01.sha256` | the 21 files data-lead added on 2026-10-01: audit logs, the case sweep, CH560 manual renders, audit scripts and verify logs | a data-lead worktree root, or `C:\Projects\rig-lab-evidence\data-lead-artifacts\` |
| `EXCLUDED.txt` | what was deliberately not kept, and why | — |

## Verify

```bash
cd /c/Projects/rig-lab-evidence
sha256sum -c --quiet /c/Projects/Rip-PC/docs/reports/evidence/files.sha256
(cd archives && sha256sum -c /c/Projects/Rip-PC/docs/reports/evidence/archives.sha256)
```

Both passed on 2026-10-01. The data-lead manifest also passes in the data-lead worktree. The one
file it can't find is the page left out by design (see `EXCLUDED.txt`).

## Rules

- **Never commit third-party page captures.** `artifacts/` is git-ignored for this reason.
- New evidence goes in a worktree's `artifacts/`. The Director copies it here at the end of each
  phase and adds its checksums to a manifest in this folder.
- **This PC holds the only full copy.** A private backup (not this public repo) is Hazem's call.

## History

- 2026-09-30: the cloud session archived the evidence into `docs/reports/phase-0-wip/`, in the
  commit "director: preserve Phase 0 work in progress and evidence", because the container would
  be lost.
- 2026-10-01:
  - restored to `C:\Projects\rig-lab-evidence\` and checksum-verified;
  - the manifests moved here, and `docs/reports/phase-0-wip/` was removed from the branch tip;
  - the purge from branch history is planned. It needs Hazem's go-ahead before anything is
    rewritten.
