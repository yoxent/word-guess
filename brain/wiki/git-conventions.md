# git-conventions
updated: 2026-07-04
tags: [git, workflow, conventions]
related: [dictionary-preprocessing, phase-structure, planning-patterns]

## Tracked
| Path | Why |
|------|-----|
| `README.md` | Project readme |
| `.planning/` | GSD planning: roadmap, requirements, phases, research. Authored content, not generated. |
| `brain/` | Wiki archive. Richer than CLAUDE.md, queried via `/read-brain`. |
| `.gitignore` | Ignore rules themselves |

## Ignored
| Pattern | Why |
|---------|-----|
| `dictionary.full.enriched.json` | Source dictionary (3.4MB). Preprocessing input, kept local only. |
| `assets/dictionary/*.json` | Generated per-length word lists. Regenerated via postinstall script. |
| `.pi-subagents/` | Agent session artifacts (runtime temp data, not project content) |
| `.claude/` | Machine-specific agent config (CLAUDE.md). Regenerable from brain + planning. |
| `node_modules/`, `.expo/`, `dist/`, `web-build/` | Standard build outputs |
| `android/`, `ios/` | Generated native projects (via `npx expo prebuild`) |
| `*.apk`, `*.aab` | EAS build artifacts |
| `.env*`, `*.jks`, `*.p8`, `*.p12`, `*.key` | Secrets, keystores, signing keys |
| `.vscode/`, `.idea/`, `*.swp`, `.DS_Store`, `Thumbs.db` | IDE/OS junk |
| `nul`, `*.log`, `*.tmp` | Temp files |

## Brain vs CLAUDE.md
Both contain project context but serve different agents:
- `brain/` — Deep, structured wiki. Used via `/read-brain` command. Preferred knowledge source.
- `.claude/CLAUDE.md` — Auto-discovered by Claude Code / Cursor on startup. Contains GSD workflow enforcement rules ("don't make direct edits outside GSD commands"). Primarily for other tools.
- With pi as the only agent: brain + AGENTS.md is sufficient. CLAUDE.md only needed if other tools join.

## Workflow
- Commit only, no auto-push
- **`main` is protected — release-only.** Never push to `main` unless explicitly instructed. All feature work targets `develop`.
- GSD commands own planning artifacts: `/gsd-plan-phase`, `/gsd-execute-phase`, etc.
- Phase plan files tracked (no sub-gitignore for them) — they're authored planning output
- Brain updates committed as `brain: update [scope]`
- `.planning/phases/` tracked — locks decisions alongside code they produced
