# Word Guess — Agent Context

## Documentation home

**Canonical project docs:** `E:\Projects\Docs\project-docs\App\word-guess`  
See also [DOCS.md](./DOCS.md).

## Git conventions (inherited from user config)

- **Commit only, don't push automatically.** Stage and commit changes locally. Push only when explicitly told to push.
- **`main` is a protected release-only branch.** Never push to `main` unless the user explicitly says "push to main" or "release". Even then, confirm. The default assumption is `develop` is always the target for pushes.
- **`develop`** is the latest branch — all feature branches merge here.

## Context files to read before starting work

Read these from the docs home (not under this repo):

- `E:\Projects\Docs\project-docs\App\word-guess\planning\ROADMAP.md`
- `E:\Projects\Docs\project-docs\App\word-guess\planning\STATE.md`
- `E:\Projects\Docs\project-docs\App\word-guess\brain\wiki\index.md`
- `E:\Projects\Docs\project-docs\App\word-guess\brain\wiki\git-conventions.md`
- `E:\Projects\Docs\project-docs\App\word-guess\pi\CODEBASE.md`
- `E:\Projects\Docs\project-docs\App\word-guess\pi\KNOWLEDGE.md`
- `E:\Projects\Docs\project-docs\App\word-guess\pi\FRONTEND.md`

## Agent skills

### Issue tracker

Issues track on GitHub Issues via `gh` CLI. External PRs are not a triage surface. See `E:\Projects\Docs\project-docs\App\word-guess\docs\agents\issue-tracker.md`.

### Triage labels

Five canonical roles with default names (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `E:\Projects\Docs\project-docs\App\word-guess\docs\agents\triage-labels.md`.

### Domain docs

Single-context app. Project knowledge lives in project-docs `brain/` with decision records in `planning/`. See `E:\Projects\Docs\project-docs\App\word-guess\docs\agents\domain.md`.
