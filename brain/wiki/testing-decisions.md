# testing-decisions
updated: 2026-07-10
tags: [testing, architecture, decisions, tradeoffs]
related: [testing-skill, architecture]

## Layer Coverage Decision

| Layer | Status | Rationale |
|-------|--------|-----------|
| Unit (Jest) | ✅ Done | High ROI, pure logic testing |
| Component (RNTL) | ⚠️ Created but failing | Native module mocking too complex |
| Integration | ⏭️ Skipped | Not worth investment for game |
| E2E (Maestro) | 🔜 Next | Real user flows, highest ROI |

## Why Component Tests Failed

**Root cause:** Tight coupling to native modules

Components directly import:
- `react-native-mmkv` (storage)
- `react-native-reanimated` (animations)
- `expo-font`, `expo-haptics`, `expo-linear-gradient`
- `@react-navigation` (navigation)

Each requires complete API mocks. ~10 modules × ~14 components = massive mock surface.

**Time to fix:** 2-4 hours

## Architecture Tradeoff

**Question asked:** Should we decouple and use DI?

**Decision:** No, not now

**Rationale:**
- Mid-project refactoring is risky
- Adds abstraction layers for a game
- Game UI is simple — E2E tests are sufficient
- Layer 1 already covers business logic

**When DI would make sense:**
- New project from scratch
- Complex app with many shared components
- Team of 5+ developers

## Maestro vs Detox

| | Maestro | Detox |
|---|---------|-------|
| Setup | Simple | Complex |
| Recompile | No | Yes |
| Language | YAML | JS/TS |
| Maintenance | Low | High |

**Decision:** Maestro — simpler, no recompile, YAML flows

## Testing Philosophy for Games

1. **Business logic first** — Layer 1 (pure functions) = highest ROI
2. **User flows second** — Layer 4 (Maestro) = real user experience
3. **Skip middle layers** — Component/Integration not worth complexity for simple UI
4. **Ship > perfect tests** — Get game to users, iterate later

## Files Created

**Layer 1 (passing):**
- src/services/__tests__/wordLogic.test.ts
- src/services/__tests__/dailySeed.test.ts
- src/services/__tests__/storage.test.ts
- src/stores/__tests__/gameStore.test.ts
- src/stores/__tests__/settingsStore.test.ts
- src/stores/__tests__/statsStore.test.ts
- src/utils/__tests__/share.test.ts

**Layer 2 (created, failing):**
- 14 component test files in __tests__/ directories

**Config:**
- jest.config.js
- src/__tests__/testSetup.ts
- TESTING-PROFILE.md
- TESTING-STATE.md
