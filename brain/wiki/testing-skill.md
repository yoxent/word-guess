# testing-skill
updated: 2026-07-10
tags: [testing, skill, qa, automation]
related: [architecture, tech-stack]

## Overview
Global testing skill for layered test generation. Project-agnostic core with project-specific profiling.

## Skill Location
- Source: `C:\Users\Xent\.agents\skills\testing\`
- Symlink: `C:\Users\Xent\.pi\agent\skills\testing\` (manual copy, no admin for symlinks)
- Files: SKILL.md, layers/{unit,component,integration,e2e}.md, reference/STRATEGY.md

## Four Layers

| Layer | Tool | Purpose | Status |
|-------|------|---------|--------|
| Unit | Jest | Pure logic, stores, services | ✅ Done |
| Component | Jest + RNTL | Individual components | ⚠️ Skipped (native deps) |
| Integration | Jest + RNTL | Multi-component flows | ⏭️ Skipped |
| E2E | Maestro | User journeys | 🔜 Next |

**Gate enforcement:** Originally blocked skipping layers. Decision: skip to E2E for game (see testing-decisions.md)

## Project Files

| File | Location | Purpose |
|------|----------|---------|
| TESTING-PROFILE.md | Project root | Auto-generated on first use. Stack, conventions, mock registry, skip list |
| TESTING-STATE.md | Project root | Coverage tracking per file per layer. Updated after generation |

## Flow
1. Check for TESTING-PROFILE.md → create if missing (auto-detect from package.json)
2. Read TESTING-STATE.md → check existing coverage
3. Determine layer from what's being tested
4. Enforce gate → block if prerequisites missing
5. Load only relevant layer doc (token efficiency)
6. Generate tests → provide run command → offer to run

## Conventions
- Test location: `__tests__/` next to source (or per profile)
- Test suffix: `.test.ts`
- Auto-run off by default → user runs `npm test -- [file]`

## Skill Discovery
Requires YAML frontmatter in SKILL.md:
```yaml
---
name: testing
description: ...
---
```

## Gotchas
- Windows: no symlink creation without admin → manual copy
- Skills in `.agents/skills/`, symlinks in `.pi/agent/skills/`
- Token efficiency: don't load all layer docs, load only requested
