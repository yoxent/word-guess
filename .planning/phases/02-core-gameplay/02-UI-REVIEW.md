# UI Review — Phase 02: Core Gameplay

**Review date:** 2026-07-05
**Reviewer:** UI audit subagent
**Scope:** All Phase 2 game-play UI components, screens, stores, and services
**Dev server status:** Not running — code-only audit
**UI-SPEC:** None (abstract 6-pillar standards applied)

---

## 1. Pillar Scores

| Pillar | Score | Summary |
|--------|-------|---------|
| **1. Copywriting** | 3 / 4 | Clear labels, good error states. Missing onboarding/tutorial for new players. |
| **2. Visuals** | 3 / 4 | Clean layout, consistent modal design. Error toast positioning overlap; dead ResultScreen route. |
| **3. Color** | 2 / 4 | Centralized palette used well. **White confetti particles invisible on dark overlay**; **white-on-yellow tiles fail WCAG contrast (~1.5:1)**. |
| **4. Typography** | 3 / 4 | Good hierarchy, appropriate tile sizing. No fontFamily definition; monospace for emoji risky. |
| **5. Spacing** | 2 / 4 | Constants defined but inconsistently applied. 24px vs 16px padding; hardcoded margins scattered. |
| **6. Experience Design** | 2 / 4 | Animation timing solid, persistence works. **Input queue drains only 1 item (bug)**; dictionary blocks startup; no tutorial flow. |

---

## 2. Top 3 Priority Fixes

### 🥇 P1 — Input queue processing bug (Pillar 6)
**File:** `src/stores/gameStore.ts:108-122` (`flushPendingInputs`)
**Problem:** `flushPendingInputs` dequeues and processes exactly **one** pending input, then stops. If a user types multiple characters during a tile reveal animation (isRevealing = true), only the first queued key is applied after the animation completes. The remaining inputs stay in `pendingInputs[]` indefinitely because nothing triggers another `flushPendingInputs` call for letter-key presses. This causes **silent dropped keystrokes** — a significant UX defect.
**Fix:** Process all queued inputs in a loop, stopping only when encountering ENTER (which triggers a new submitGuess → new animation) or when the queue is empty. Alternatively, recursively re-trigger flush after each non-blocking input.

### 🥇 P2 — White confetti particles invisible on overlay (Pillar 3)
**File:** `src/components/game/Confetti.tsx:22`
**Problem:** The particle color array includes `'#ffffff'` (white). `ResultModal` renders `<Confetti />` inside a `<View style={styles.overlay}>` with `backgroundColor: 'rgba(0,0,0,0.5)'`. White particles on a 50%-opaque black overlay are invisible — zero visual impact for ~1/7 of the particles.
**Fix:** Remove `'#ffffff'` from `PARTICLE_COLORS`, or replace with a bright visible alternative (e.g. `'#f1c40f'`).

### 🥇 P3 — Color contrast failure on present/yellow tiles (Pillar 3)
**File:** `src/components/game/Tile.tsx:142` and `src/components/game/Keyboard.tsx:155-159`
**Problem:** Revealed present (yellow) tiles and keyboard keys with `feedback='present'` use `colors.textInverse` (#ffffff, white) as the text/letter color on background `colors.tilePresent` / `colors.keyPresent` (#c9b458, golden yellow). The WCAG contrast ratio is approximately **1.5:1** — far below the 4.5:1 minimum for normal text. This affects both the tile letter display in `Tile.tsx` and key legends in `Keyboard.tsx`.
**Fix:** Use dark text (`#1a1a2e` or `#000`) on present/yellow tiles/keys, or darken the present color to a shade that supports white text at ≥4.5:1.

---

## 3. Detailed Findings

### Pillar 1: Copywriting — Score: 3/4 🟡

| Finding | File:Line | Severity |
|---------|-----------|----------|
| Mode names are clear and game-appropriate ("Free Play", "Random", "Daily Challenge", "Endless") | `HomeScreen.tsx:58-76` | OK |
| Error messages are specific: "Not in word list" and "Must reuse confirmed tiles" | `gameStore.ts:67,74` | OK |
| Result state text ("You Won!" / "Game Over") is appropriate and consistent with Wordle conventions | `ResultModal.tsx:90-95` | OK |
| Loading states: "Loading dictionary..." is informative | `LoadingScreen.tsx:15` | OK |
| **No onboarding or tutorial** — first-time players see no instructions, "How to Play" flow, or example. The game assumes Wordle familiarity. | `HomeScreen.tsx` | Minor |
| "Complete all 6 lengths!" subtitle on daily picker is a stretch goal label — could be rephrased as "Pick a length to complete" | `LengthPickerModal.tsx:43` | Minor |
| Placeholder screens ("Stats will display here (Phase 3)") are acceptable for Phase 2 scope but should route to a proper "Coming Soon" view | `StatsScreen.tsx:16`, `SettingsScreen.tsx:16` | Info |
| **Dead route copy** — ResultScreen says "Game result will display here (Phase 2)" but Phase 2 is complete and this screen is never navigated to | `ResultScreen.tsx:24` | Minor |

### Pillar 2: Visuals — Score: 3/4 🟡

| Finding | File:Line | Severity |
|---------|-----------|----------|
| HomeScreen layout: vertical mode stack with nav row beneath is visually balanced | `HomeScreen.tsx:50-96` | OK |
| Game screen layout: header at top, centered board, keyboard docked at bottom — correct structure | `GameScreen.tsx:180-205` | OK |
| Modal overlays (ResultModal, LengthPickerModal) use consistent semi-transparent backdrop | `ResultModal.tsx:172-173`, `LengthPickerModal.tsx:102-103` | OK |
| Confetti particles burst from center — good visual celebration | `Confetti.tsx` | OK |
| **Error toast overlaps attempts label** — errorToast is `position: 'absolute', top: 0, zIndex: 10` while attemptsContainer sits above the grid with `marginBottom: 8`. On some screen sizes, the absolute-positioned toast may overlay the attempts label partially. | `GameBoard.tsx:97-107` | Minor |
| **Keyboard bottom padding hardcoded** — `paddingBottom: 16` in `styles.container` should reference a layout constant | `Keyboard.tsx:138` | Minor |
| **HomeScreen navRow spacing inconsistency** — uses inline `{ width: 12 }` Views while mode buttons use `<View style={styles.spacer}>` with `height: 12`. Inconsistency in gap pattern. | `HomeScreen.tsx:83-94` | Minor |
| **Dead ResultScreen component** — registered in Navigation.tsx but never navigated to (results shown via modal). 30 lines of dead code with misleading placeholder. | `Navigation.tsx:66-69`, `ResultScreen.tsx` | Minor |
| Checkmark positioning on completed daily lengths uses absolute `top: -28, right: -28` — may clip on the card's edge | `LengthPickerModal.tsx:169-171` | Minor |

### Pillar 3: Color — Score: 2/4 🔴

| Finding | File:Line | Severity |
|---------|-----------|----------|
| **CRITICAL: White confetti invisible on dark overlay** — see P2 above | `Confetti.tsx:22` | **P2** |
| **CRITICAL: White-on-yellow contrast failure** — see P3 above | `Tile.tsx:142`, `Keyboard.tsx:155-159` | **P3** |
| Color constants centralized in `colors.ts` — all components import from there, no hardcoded hexes found. Very good. | All UI files | OK |
| Keyboard color mapping uses `KEY_COLOR_MAP` for correct/present/absent → constant colors | `Keyboard.tsx:25-30` | OK |
| Keyboard text color for ENTER/BACKSPACE special keys uses `colors.textInverse` (#ffffff) on `colors.keySpecial` (#818384). Contrast ratio ~4.9:1 — barely acceptable. | `Keyboard.tsx:155-159` | Minor |
| Accent color (#4a9eff) used for primary CTA buttons — good blue that contrasts well with white text (~4.4:1) | `Button.tsx`, `colors.ts:13` | OK |
| Background (#f5f5f0) is a warm off-white — gentle on eyes, appropriate for a word game | `colors.ts:12` | OK |
| Tile empty border (#878a8c) on tileEmpty (#d3d6da) — subtle, usable | `colors.ts:6` | OK |
| Danger (#e74c3c) used for error toasts and loss state — good red with white text (~4.0:1 borderline) | `colors.ts:16` | OK |
| Success (#2ecc71) used for win state — bright green, white text (~1.5:1 contrast issue similar to yellow) | `colors.ts:17` | Minor |

### Pillar 4: Typography — Score: 3/4 🟡

| Finding | File:Line | Severity |
|---------|-----------|----------|
| Tile letter at 28px / weight 700 in 56×56 tile — well-proportioned for the cell size | `Tile.tsx:141-142` | OK |
| Result word at 32px / weight 800 — appropriate emphasis | `ResultModal.tsx:189-190` | OK |
| Header mode label at 16px / 600, attempts at 14px / 500 — clear secondary hierarchy | `GameScreen.tsx:213-220` | OK |
| Screen titles (Stats, Settings, Leaderboard) at 28px / 700 — consistent across placeholder screens | Stats/Settings/Leaderboard screens | OK |
| Length picker numbers at 28px / 700 — clear and clickable | `LengthPickerModal.tsx:155-156` | OK |
| **Emoji grid uses `fontFamily: 'monospace'`** — React Native on Android may substitute a monospace font that doesn't support emoji, causing alignment or rendering issues. The emoji grid is a shareable result; rendering matters. | `ResultModal.tsx:218` | Minor |
| **No fontFamily defined globally** — relies on platform defaults (San Francisco on iOS, Roboto on Android). This is acceptable for Phase 2 but creates visual drift between platforms. | No `fontFamily` in any style sheet | Info |
| **7 distinct font sizes** (36, 32, 28, 20, 16, 14, 12) — more than a strict type scale would recommend. Could collapse to a 5-step scale (36, 28, 20, 16, 12) for tighter consistency. | All files | Info |

### Pillar 5: Spacing — Score: 2/4 🔴

| Finding | File:Line | Severity |
|---------|-----------|----------|
| Layout constants defined: tileSize=56, tileGap=4, keyboardKeyHeight=48, keyboardKeyMinWidth=28, keyboardKeyGap=4, screenPadding=16 | `layout.ts` | OK |
| **Inconsistent screen padding** — HomeScreen and LoadingScreen use `padding: 24`; GameScreen uses `paddingHorizontal: layout.screenPadding` (16) on sub-views; Stats/Settings/Leaderboard use `padding: 24`. Three different padding approaches. | Compare screens | Minor |
| **Keyboard row marginBottom is hardcoded** — `marginBottom: 4` on each row, plus `gap: layout.keyboardKeyGap` (4) → effective row gap is 8px, but intent was likely 4px (or vice versa). | `Keyboard.tsx:142-147` | Minor |
| **Keyboard container paddingBottom hardcoded** — `paddingBottom: 16` should be a named constant | `Keyboard.tsx:139` | Minor |
| **HomeScreen spacer inconsistency** — mode buttons use `<View style={styles.spacer}>` (height:12), nav buttons use inline `{ width: 12 }` | `HomeScreen.tsx:61-94` | Minor |
| GameBoard attemptsContainer uses hardcoded `marginBottom: 8` | `GameBoard.tsx:130` | Minor |
| ResultModal card uses hardcoded `padding: 24`, `borderRadius: 16` | `ResultModal.tsx:177-181` | OK |
| LengthPickerModal grid uses hardcoded `gap: 12` | `LengthPickerModal.tsx:128` | OK |
| Tile gap (4px) correctly references `layout.tileGap` in GuessRow | `GuessRow.tsx:85` | OK |

### Pillar 6: Experience Design — Score: 2/4 🔴

| Finding | File:Line | Severity |
|---------|-----------|----------|
| **CRITICAL: Input queue processes only 1 item per flush** — see P1 above | `gameStore.ts:108-122` | **P1** |
| **Startup blocking** — dictionary data loaded via synchronous `require()` calls at module import time in dictionaryStore.ts. Six 5-10.json files (~12K target words total) + six valid-*.json files (~184K total) are parsed synchronously. The 500ms timer in App.tsx is a fixed delay, not actual readiness detection. On slower devices this could cause a visible frozen splash or ANR. | `dictionaryStore.ts:6-17`, `App.tsx:10-13` | Minor |
| **Dead ResultScreen route** — Navigation.tsx registers a ResultScreen that was the pre-modal design. It is never reached; results show via overlay. If the route is accidentally triggered, the user sees "Game result will display here (Phase 2)" — confusing. | `Navigation.tsx:66-69` | Minor |
| **No tutorial/How to Play** — New players see zero instruction. The game assumes Wordle familiarity. No "?" help icon accessible from GameScreen. | `GameScreen.tsx`, `HomeScreen.tsx` | Minor |
| **NavMenuButton uses Alert.alert** — The header menu in Navigation.tsx uses a native `Alert` dialog for navigation. This is non-standard UX. A bottom sheet, dropdown, or slide-out drawer would feel more cohesive. | `Navigation.tsx:24-41` | Minor |
| Animation timing: Reanimated worklets used correctly with stagger (50ms), flip (200ms), bounce (100+100ms), buffer (50ms) — all from constants | `GameScreen.tsx:83-107` | OK |
| Hard Mode validation with shake animation + toast — correct feedback path | `GuessRow.tsx:15-30`, `gameStore.ts:69-75` | OK |
| AppState persistence: save on background, restore on foreground — correct | `GameScreen.tsx:52-78` | OK |
| Daily completion tracking per length per date — prevents replay of completed puzzles | `storage.ts:90-100` | OK |
| Result modal "Play Next" for Endless mode — seamless continuation | `ResultModal.tsx:127-145` | OK |
| Haptic feedback on key press (Light) and reveal completion (Medium) — good tactile polish | `Keyboard.tsx:45`, `GameScreen.tsx:100` | OK |
| Pending inputs use queue pattern rather than silent drop — good intent, but implementation incomplete | `gameStore.ts:108-122` | See P1 |

---

## 4. Files Audited

### Screens
- `src/screens/HomeScreen.tsx`
- `src/screens/GameScreen.tsx`
- `src/screens/ResultScreen.tsx`
- `src/screens/LoadingScreen.tsx`
- `src/screens/StatsScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/LeaderboardScreen.tsx`

### Game Components
- `src/components/game/Tile.tsx`
- `src/components/game/GuessRow.tsx`
- `src/components/game/GameBoard.tsx`
- `src/components/game/Keyboard.tsx`
- `src/components/game/ResultModal.tsx`
- `src/components/game/LengthPickerModal.tsx`
- `src/components/game/Confetti.tsx`

### UI Components
- `src/components/ui/Button.tsx`

### App Shell
- `src/app/App.tsx`
- `src/app/Navigation.tsx`

### Stores
- `src/stores/gameStore.ts`
- `src/stores/dictionaryStore.ts`
- `src/stores/settingsStore.ts`

### Services
- `src/services/wordLogic.ts`
- `src/services/dailySeed.ts`
- `src/services/storage.ts`
- `src/services/sound.ts`

### Constants
- `src/constants/colors.ts`
- `src/constants/layout.ts`
- `src/constants/animations.ts`
- `src/constants/config.ts`

### Types
- `src/types/game.ts`
- `src/types/navigation.ts`
- `src/types/stats.ts`
- `src/types/settings.ts`

---

## 5. Residual Risks

1. **Input queue underflow** — If `flushPendingInputs` is enhanced to drain the full queue, it must still stop on ENTER (which triggers submitGuess → new animation). A naive loop that processes ENTER + letters in the same tick would bypass animation blocking.

2. **Dictionary startup delay** — On older Android devices (4GB RAM or less), parsing six JSON arrays at module import time could push JS thread execution past 1-2 seconds. Consider lazy-loading per-length word lists instead of eagerly requiring all 6.

3. **ResultScreen dead route** — If the route remains in the stack navigator, a future code path could accidentally navigate to it. Either remove the route (and screen component) or update it as a working secondary entry point.

4. **Contrast not tested on actual device** — Code-only audit cannot verify real-world rendering on various screen technologies (AMOLED, LCD). The white-on-yellow contrast issue is a calculated ratio, but actual readability should be verified on device.

5. **emoji monospace rendering** — `fontFamily: 'monospace'` on Android uses Droid Sans Mono (or similar), which does not include emoji. Emoji characters would fall back to the system emoji font, but the monospace constraint on non-emoji characters (⬛🟩🟨) could cause misalignment. Verify on device.

---

## UI REVIEW COMPLETE

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Conducted full 6-pillar audit of Phase 2: Core Gameplay UI without scope expansion. No UI-SPEC exists for Phase 2 — audit applied abstract standards. All 16 UI files, 4 store files, 4 service files, 4 constant files, and 3 type files reviewed."
    }
  ],
  "changedFiles": [
    ".planning/phases/02-core-gameplay/02-UI-REVIEW.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read (30+ files)",
      "result": "passed",
      "summary": "Read all Phase 2 UI component files, stores, services, constants, types, and planning context"
    },
    {
      "command": "grep (typography)",
      "result": "passed",
      "summary": "Found all fontSize/fontWeight/fontFamily/letterSpacing/lineHeight usages across 41 style declarations"
    }
  ],
  "validationOutput": [
    "6 pillars scored: Copywriting 3/4, Visuals 3/4, Color 2/4, Typography 3/4, Spacing 2/4, Experience Design 2/4",
    "3 priority fixes identified: P1 input queue bug, P2 invisible confetti, P3 yellow-contrast failure",
    "Total findings: 2 critical (P1, P2), 1 high (P3), 12 minor, 3 info"
  ],
  "residualRisks": [
    "Input queue processing loop must stop on ENTER to preserve animation blocking",
    "Dictionary startup delay on low-RAM Android devices from synchronous require()",
    "ResultScreen dead route in navigator could be accidentally triggered",
    "White-on-yellow contrast ratio calculated mathematically — verify on physical device",
    "emoji monospace fontFamily may misalign on Android"
  ],
  "noStagedFiles": true,
  "diffSummary": "Created 02-UI-REVIEW.md with pillar scores, top 3 fixes, detailed findings per pillar, file audit list, and structured acceptance report",
  "reviewFindings": [
    "blocker: gameStore.ts:108-122 — flushPendingInputs processes only 1 item per call; queued keystrokes are silently dropped",
    "blocker: Confetti.tsx:22 — white (#ffffff) particles invisible on rgba(0,0,0,0.5) overlay",
    "high: Tile.tsx:142 + Keyboard.tsx:155-159 — white text on yellow (#c9b458) tiles fails WCAG 4.5:1 contrast",
    "minor: GameBoard.tsx:97-107 — error toast absolute positioning may overlap attempts label",
    "minor: Keyboard.tsx:139 — paddingBottom hardcoded to 16 instead of layout constant",
    "minor: HomeScreen spacing inconsistency (height:12 vs width:12 inline gaps)",
    "minor: ResultModal.tsx:218 — fontFamily 'monospace' used for emoji text, risky on Android",
    "minor: Navigation.tsx:66-69 — dead ResultScreen route never navigated to",
    "minor: App.tsx:10-13 — 500ms fixed delay instead of readiness detection",
    "minor: Navigation.tsx:24-41 — Alert.alert-based nav menu is non-standard UX",
    "minor: No tutorial/onboarding for new players"
  ],
  "manualNotes": "Code-only audit — no dev server running, no screenshots captured. Scores may shift after real-device verification. All font sizes and spacing values checked from source. Pillars 1, 2, and 4 scored 3/4 (good with minor issues). Pillars 3, 5, and 6 scored 2/4 (needs work). The input queue bug (P1) is the most impactful finding — it causes silent dropped keystrokes."
}
```

## UI REVIEW COMPLETE
