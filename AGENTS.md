# Word Guess — Agent Context

## Git conventions (inherited from user config)

- **Commit only, don't push automatically.** Stage and commit changes locally. Push only when explicitly told to push.
- **`main` is a protected release-only branch.** Never push to `main` unless the user explicitly says "push to main" or "release". Even then, confirm. The default assumption is `develop` is always the target for pushes.
- **`develop`** is the latest branch — all feature branches merge here.

## Context files to read before starting work

- `.planning/ROADMAP.md` — project roadmap and phase structure
- `.planning/STATE.md` — current project state
- `brain/wiki/index.md` — full wiki index
- `brain/wiki/git-conventions.md` — detailed git conventions
- `.pi/CODEBASE.md` — codebase overview
- `.pi/KNOWLEDGE.md` — agent knowledge
- `.pi/FRONTEND.md` — mobile game UI design principles (read before any frontend/UI work)

## Agent skills

### Issue tracker

Issues track on GitHub Issues via `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles with default names (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. Project knowledge lives in `brain/wiki/` with decision records in `.planning/`. See `docs/agents/domain.md`.
