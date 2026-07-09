# planning-patterns
updated: 2026-07-08 (Phase 6 plan structure added)
tags: [planning, gsd, plans, plans, checker, nyquist]
related: [phase-structure, key-risks, dictionary-preprocessing, daily-seed]

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

## Phase 2 plan structure
| Plan | Wave | Objective | Tasks | Depends On |
|------|------|-----------|-------|------------|
| 02-01 | 1 | Core logic: dict preprocessing, wordLogic, dailySeed, sound stub, store updates | 3 | Foundation |
| 02-02 | 2 | Game UI: Tile, GuessRow, GameBoard, Keyboard, ResultModal, Confetti, GameScreen | 3 | 02-01 |
| 02-03 | 2 | Modes: LengthPickerModal, HomeScreen routing, daily tracking, Endless, defs | 3 | 02-01, 02-02 |
| 02-04 | 3 | Polish: animations, animation constants, persistence, loading screen, haptics | 3 | 02-02, 02-03 |

- 4 plans across 3 waves. Wave 2 plans are NOT fully parallel — 02-03 depends on 02-02 (shared files: ResultModal.tsx, index.ts).
65 decisions (D-25 through D-66) for Phase 2.

## Phase 4 plan structure
| Plan | Wave | Objective | Tasks | Depends On |
|------|------|-----------|-------|------------|
| 04-01 | 1 | Foundation: install deps, split maxExtraGuesses, adStore, remoteConfig service | 3 | Phase 3 complete |
| 04-02 | 2 | Settings: extend UI config with restore/purchase types, implement restore + Pro purchase flows | 3 | 04-01 |
| 04-03 | 2 | Game: interstitial + rewarded ad in ResultModal, frequency capping, extra guess mechanics | 3 | 04-01 |

- 3 plans across 2 waves. Wave 2 plans (04-02, 04-03) are fully parallel — no file overlap.
- 26 decisions (D-87 through D-112), plus UI-SPEC contract.

## Phase 3 plan structure
| Plan | Wave | Objective | Tasks | Depends On |
|------|------|-----------|-------|------------|
| 03-01 | 1 | Data layer: types, storage SQL aggregation, stats store, game completion → stats wire | 4 | Phase 2 complete |
| 03-02 | 2 | UI components: typography constants, config registry, StatCard, SettingsRow, share utility, deps | 6 | 03-01 |
| 03-03 | 3 | Screens: StatsScreen (cards, chart, share FAB, entrance animation, pull-to-refresh), SettingsScreen | 2 | 03-01, 03-02 |

- 3 plans across 3 waves, fully sequential (no parallel plans)
- 20 decisions (D-67 through D-86)
- Smallest phase: 5 requirements (STAT-01–STAT-05)

## Plan checker catches

### Phase 2 findings

| Issue | Example | Fix |
|-------|---------|-----|
| Cross-plan data contract mismatch | `getTodayDailyWords` returns `string[]` in one plan, `{date, words}` in another | Unify return type across all plans before execution |
| Missing cross-plan dependency | Plan modifies file created by another plan in same wave | Add dependency or reorganize wave ordering |
| Single-owner state lifecycle violation | Two plans both add `isRevealing` field to same store | Consolidate state lifecycle under one owning plan |
| Animation timing off-by-duration | Timer doesn't account for correct tile bounce (extra 200ms) | Include bounce duration in animation completion calculation |
| Tunable values hardcoded (violates D-31) | Animation timing literals in component file | Extract to shared constants file (`src/constants/animations.ts`) |
| Metro-incompatible bundling | Dynamic require with template literal | Use static require() with relative paths |
| Missing Nyquist artifacts | No VALIDATION.md | Create from research validation arch section |
| Partial decision implementation | Nav menu only on HomeScreen (D-18) | Add headerRight to all non-game screens |
| Scope leak into next phase | GameStore submitGuess with win/loss logic | Defer game logic to Phase 2 |
| Must-haves spanning plans | Truth requires Plan 03 but declared in Plan 01 | Keep must-haves plan-scoped |

### Phase 3 findings

| Issue | Example | Fix |
|-------|---------|-----|
| Cross-plan data contract across sequential plans | Share utility needs `GuessFeedback[][]` but `lastGameResult` didn't have it — `guesses: []` passed as workaround | Trace data contract end-to-end through all 3 plans: types → storage → store → screen → utility |
| Share pipeline missing source data | `generateShareText()` needs per-guess feedback for emoji grid rows; `recordGame()` wasn't receiving it from GameScreen | Pass `currentSession.feedback` in `recordGame()` call; store in `lastGameResult.feedback` for StatsScreen share handler |
| Issue | Example | Fix |
|-------|---------|-----|
| Cross-plan data contract mismatch | `getTodayDailyWords` returns `string[]` in one plan, `{date, words}` in another | Unify return type across all plans before execution |
| Missing cross-plan dependency | Plan modifies file created by another plan in same wave | Add dependency or reorganize wave ordering |
| Single-owner state lifecycle violation | Two plans both add `isRevealing` field to same store | Consolidate state lifecycle under one owning plan |
| Animation timing off-by-duration | Timer doesn't account for correct tile bounce (extra 200ms) | Include bounce duration in animation completion calculation |
| Tunable values hardcoded (violates D-31) | Animation timing literals in component file | Extract to shared constants file (`src/constants/animations.ts`) |
| Metro-incompatible bundling | Dynamic require with template literal | Use static require() with relative paths |
| Missing Nyquist artifacts | No VALIDATION.md | Create from research validation arch section |
| Partial decision implementation | Nav menu only on HomeScreen (D-18) | Add headerRight to all non-game screens |
| Scope leak into next phase | GameStore submitGuess with win/loss logic | Defer game logic to Phase 2 |
| Must-haves spanning plans | Truth requires Plan 03 but declared in Plan 01 | Keep must-haves plan-scoped |

## Key lesson: data contract alignment across parallel plans
When 2+ plans in the same wave modify the same store/service:
1. One plan creates the initial implementation
2. Other plans add features to the same artifact
3. **Must** agree on exact function signatures, return types, and import paths
4. Plan checker must verify all cross-plan call sites are compatible

## Key lesson: single-owner pattern for state lifecycle
For shared state fields (like `isRevealing` on gameStore):
1. Only one plan should add the field definition + lifecycle management
2. Other plans reference the field as already-existing (don't re-declare)
3. Violation: two plans both add the same field → merge conflicts or double-initialization

## Key lesson: animation completion timing
When computing the total duration of a staggered animation sequence:
```
totalTime = (lastTileIndex * staggerDelay) + flipDuration + buffer
if (any correct tile) totalTime += bounceTotal  // extra 200ms
```

## Phase 6 plan structure (tentative — pending plan creation)
| Plan | Wave | Objective | Depends On |
|------|------|-----------|------------|
| 06-01 | 1 | Foundation: theme system (colors.ts restructure, useColors hook, Navigation theme, settingsStore.themeMode), deps (expo-av), sound.ts wiring | CONTEXT.md decisions D-155–D-194 |
| 06-02 | 1 | Accessibility: TalkBack props (Tile, Keyboard, buttons), color blindness texture overlays, reduce motion toggle, PixelRatio font scaling, centralized BackHandler | 06-01 |
| 06-03 | 2 | UI polish: home screen stagger animation, How to Play modal, settings rows (color blindness, reduce motion, theme selector), dead code cleanup (ResultScreen, confetti, contrast) | 06-01 |
| 06-04 | 2 | Compliance + build: GitHub Pages privacy policy, console.time perf markers, production AAB build config, offline-first verification | 06-02, 06-03 |

- 4 plans across 2 waves. Wave 2 plans (06-03, 06-04) are fully parallel — no file overlap.
- 40 decisions (D-155 through D-194), plus UI-SPEC contract expected.

### Phase 4 findings

| Issue | Example | Fix |
|-------|---------|-----|
| Missing purchase flow (AD-03) | Plans covered interstitial + rewarded ad + restore, but no task created Pro purchase button or called `requestPurchase()` | Add `purchase` row type to SettingsRowConfig, wire `requestPurchase()` + `purchaseUpdatedListener` in SettingsScreen |
| Requirement traceability gap (AD-07) | AD-07 substantively implemented (TestIds in dev, Remote Config in prod) but not listed in any plan's `requirements:` frontmatter | Add AD-07 to 04-01 requirements field |
| Stale product ID in REQUIREMENTS.md | AD-03 had `com.wordguess.pro` but CONTEXT.md D-95 locked `com.vorithstudio.wordguess.pro` | Fixed product ID to match locked decision |

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
