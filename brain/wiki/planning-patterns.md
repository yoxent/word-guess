# planning-patterns
updated: 2026-07-04
tags: [planning, gsd, plans, plans, checker, nyquist]
related: [phase-structure, key-risks, dictionary-preprocessing]

## Phase 1 plan structure
| Plan | Wave | Objective | Tasks | Depends On |
|------|------|-----------|-------|------------|
| 01-01 | 1 | Scaffold + types + colors + dictionary | 3 | Nothing |
| 01-02 | 2 | Storage layer + Zustand stores | 2 | 01-01 (types) |
| 01-03 | 2 | Navigation + screens + App.tsx | 2 | 01-01 (types, colors) |

- 3 plans across 2 waves. Wave 2 plans are parallel.
- Walking Skeleton mode (Phase 1 of MVP project): produce SKELETON.md alongside plans.

## Decision coverage (D-XX traceability)
Every locked decision in CONTEXT.md gets a D-XX identifier. Plans reference these IDs in task actions. Plan checker verifies:
- Every decision has a task implementing it
- No task implements deferred ideas
- Cross-plan data contracts are consistent

24 decisions (D-01 through D-24) for Phase 1.

## Plan checker catches
| Issue | Example | Fix |
|-------|---------|-----|
| Metro-incompatible bundling | Dynamic require with template literal | Use static require() with relative paths |
| Missing Nyquist artifacts | No VALIDATION.md | Create from research validation arch section |
| Partial decision implementation | Nav menu only on HomeScreen (D-18) | Add headerRight to all non-game screens |
| Scope leak into next phase | GameStore submitGuess with win/loss logic | Defer game logic to Phase 2 |
| Must-haves spanning plans | Truth requires Plan 03 but declared in Plan 01 | Keep must-haves plan-scoped |

## Nyquist validation requirements
- When `nyquist_validation: true` in config, VALIDATION.md is required in phase directory
- VALIDATION.md maps each requirement to: test type, automated command, test file
- Includes Wave 0 test gaps (files that need creation)
- Updated during execution as tests are written

## Walking Skeleton (MVP Phase 1)
For first phase of new project with `**Mode:** mvp`:
- Scaffold project + routing + one real DB interaction + one real UI interaction
- Dev deployment working (EAS Build or direct `npx expo run:android`)
- SKELETON.md documents what the skeleton proves
