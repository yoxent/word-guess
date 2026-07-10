# agent-skills-setup
updated: 2026-07-10
tags: [skills, matt-pocock, setup, agent-config]
related: [git-conventions, dev-workflow]

## Summary
Matt Pocock's agent skills installed and configured for this repo. 38 skills in `~/.agents/skills/`. Per-repo config in `docs/agents/`.

## Installation
```bash
npx skills@latest add -y --global mattpocock/skills
```
Installs all skills to `~/.agents/skills/` (symlinked to the skills.sh cache). pi discovers them automatically from `~/.agents/skills/`. Skills stay updated via `git pull` of the upstream repo.

## Per-repo config files

| File | Purpose |
|------|---------|
| `docs/agents/issue-tracker.md` | GitHub Issues via `gh` CLI — create, read, comment, label, close |
| `docs/agents/triage-labels.md` | 5 canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix |
| `docs/agents/domain.md` | Points skills to `brain/wiki/` + `.planning/` instead of CONTEXT.md + docs/adr/ |

## AGENTS.md integration
```
## Agent skills

### Issue tracker
Issues track on GitHub Issues via `gh` CLI. External PRs are not a triage surface.

### Triage labels
Five canonical roles with default names.

### Domain docs
Single-context repo. Knowledge in `brain/wiki/` with decision records in `.planning/`.
```

## Key decisions
| Decision | Rationale |
|----------|-----------|
| **GitHub Issues** | Repo is GitHub-hosted; gh CLI handles everything |
| **PRs as surface: no** | Solo project — no external PRs to triage |
| **Default triage labels** | No existing labels; defaults match skill conventions |
| **brain/wiki/ for domain docs** | Already established knowledge store; no need for parallel CONTEXT.md |
| **Single-context** | One app, one codebase |

## How to re-run
Edit `docs/agents/*.md` directly any time. Re-run `/setup-matt-pocock-skills` only if switching issue trackers or restarting from scratch.
