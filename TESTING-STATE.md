# TESTING-STATE.md
Last updated: 2026-07-10

| File | Unit | Component | Integration | E2E | Updated |
|------|------|-----------|-------------|-----|---------|
| src/services/wordLogic.ts | ✅ | — | — | — | 2026-07-10 |
| src/services/dailySeed.ts | ✅ | — | — | — | 2026-07-10 |
| src/services/storage.ts | ✅ | — | — | — | 2026-07-10 |
| src/stores/gameStore.ts | ⚠️ | — | — | — | 2026-07-10 |
| src/stores/settingsStore.ts | ✅ | — | — | — | 2026-07-10 |
| src/stores/statsStore.ts | ✅ | — | — | — | 2026-07-10 |
| src/utils/share.ts | ✅ | — | — | — | 2026-07-10 |

## Component Tests Status
Layer 2 component tests created but failing due to:
- Complex native module dependencies (MMKV, Reanimated, Expo modules)
- Need additional mock configuration for React Native Testing Library

**Files created:**
- src/components/game/__tests__/Tile.test.tsx
- src/components/game/__tests__/Keyboard.test.tsx
- src/components/game/__tests__/GuessRow.test.tsx
- src/components/game/__tests__/GameBoard.test.tsx
- src/components/game/__tests__/LengthPickerModal.test.tsx
- src/components/game/__tests__/ResultModal.test.tsx
- src/components/game/__tests__/Confetti.test.tsx
- src/components/ui/__tests__/Button.test.tsx
- src/components/ui/__tests__/StatCard.test.tsx
- src/components/ui/__tests__/SettingsRow.test.tsx
- src/components/ui/__tests__/HowToPlayModal.test.tsx
- src/components/ui/__tests__/ProgressRing.test.tsx
- src/components/home/__tests__/ModeCard.test.tsx
- src/components/home/__tests__/HardModePill.test.tsx

**Next steps:**
- Fix native module mocking in src/__tests__/testSetup.ts
- Consider using detox for integration tests instead
