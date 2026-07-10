# Frontend Overhaul — Bright, Playful, Modern Casual Game

**Date:** 2026-07-10
**Scope:** Visual redesign of all UI surfaces — colors, typography, components, screens, animations
**Goal:** Transform from "Wordle clone with muted earth tones" to "bright, playful, family-friendly casual game"

## Design Decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tile palette | Full bright overhaul (not Wordle-recognizable) | Differentiated identity, not a clone |
| Home screen | Mode cards + decorative elements + daily preview | Visual identity, not a button list |
| Microinteractions | Playful — spring press, card lift, color shift | Game-like feel, satisfying feedback |
| Typography | Display font (Nunito) for headings + system body | Brand personality without heavy bundle |
| Dark theme | Brighten to match new identity, keep as option | Don't remove — expand the palette |

---

## Phase 1: Design Foundation

**Goal:** New palette, fonts, tokens, dark theme update — the atomic layer everything else builds on.

### 1A. New Color Palette

Replace the entire `lightColors` / `darkColors` in `src/constants/colors.ts`.

**Light theme — new palette:**

| Token | Old (Wordle) | New (Bright) | Purpose |
|-------|-------------|-------------|---------|
| `tileCorrect` | #6aaa64 (olive) | #4CAF50 (bright green) | Correct letter + position |
| `tilePresent` | #c9b458 (mustard) | #FFD54F (bright yellow) | Correct letter, wrong spot |
| `tileAbsent` | #787c7e (dark gray) | #B0BEC5 (blue-gray) | Letter not in word |
| `tileEmpty` | #d3d6da (warm gray) | #E3F2FD (light blue) | Unrevealed tile bg |
| `tileBorder` | #878a8c (gray) | #90CAF9 (medium blue) | Unrevealed tile border |
| `keyCorrect` | #6aaa64 | #4CAF50 | Match tile correct |
| `keyPresent` | #c9b458 | #FFD54F | Match tile present |
| `keyAbsent` | #787c7e | #B0BEC5 | Match tile absent |
| `keyUnused` | #d3d6da | #E3F2FD | Unused key bg |
| `keyText` | #1a1a2e | #37474F (dark blue-gray) | Text on unused keys |
| `keySpecial` | #818384 | #CFD8DC (light blue-gray) | ENTER/BACKSPACE bg |
| `background` | #f5f5f0 (off-white) | #F0F7FF (very light blue) | Page background |
| `surface` | #ffffff | #FFFFFF | Card backgrounds |
| `textPrimary` | #1a1a2e | #263238 (dark blue-gray) | Main text |
| `textSecondary` | #787c7e | #78909C (blue-gray) | Labels, captions |
| `textInverse` | #ffffff | #FFFFFF | Text on colored bg |
| `accent` | #4a9eff | #29B6F6 (sky blue) | Primary interactive |
| `accentDark` | #357abd | #0288D1 | Pressed accent |
| `danger` | #e74c3c | #FF7043 (coral) | Error, destructive |
| `success` | #2ecc71 | #66BB6A (bright green) | Success, win |
| `headerBackground` | #f0eee9 | #E3F2FD (light blue) | Nav header bg |
| `headerText` | #1a1a2e | #263238 | Header text |
| `primary` | (new) | #42A5F5 (vibrant blue) | Buttons, CTAs |
| `primaryDark` | (new) | #1E88E5 | Pressed button |
| `secondary` | (new) | #FFA726 (orange) | Secondary actions |
| `tertiary` | (new) | #F48FB1 (pink) | Decorative accents |
| `surfaceElevated` | (new) | #FFFFFF with shadow | Cards, modals |
| `surfaceMuted` | (new) | #F5F9FF | Subtle bg sections |

**Dark theme — brightened to match identity:**

| Token | New (Bright Dark) | Purpose |
|-------|------------------|---------|
| `background` | #0D1B2A (deep navy) | Page bg |
| `surface` | #1B2838 (dark blue) | Card bg |
| `surfaceElevated` | #243447 | Elevated cards |
| `tileCorrect` | #66BB6A | Bright green (slightly lighter) |
| `tilePresent` | #FFD54F | Bright yellow |
| `tileAbsent` | #546E7A (slate) | Muted blue-gray |
| `tileEmpty` | #1E3A5F (dark blue) | Empty tile |
| `accent` | #4FC3F7 (light cyan) | Brighter accent for dark bg |
| `textPrimary` | #ECEFF1 | Near-white |
| `textSecondary` | #90A4AE | Blue-gray |

### 1B. Display Font — Nunito (rounded sans-serif)

Install via `expo install expo-font @expo-google-fonts/nunito`.

Load Nunito Bold (700) and Nunito ExtraBold (800) at startup.

**Where it applies:**
- Title ("Word Guess") — Nunito 800
- Section headers — Nunito 700
- Button text — Nunito 700
- Modal titles — Nunito 700

**Where it does NOT apply:**
- Body text, labels, stats — system font (Roboto on Android) for readability
- Tile letters — system font (crisp at small sizes)

### 1C. Updated Typography Scale

Update `src/constants/typography.ts`:

| Role | Old | New | Font |
|------|-----|-----|------|
| display | (new) | 40px, 800, 1.1 | Nunito |
| heading | (new) | 24px, 700, 1.2 | Nunito |
| cardTitle | 18px, 700 | 18px, 700 | Nunito |
| settingsRow | 16px, 400 | 16px, 500 | System |
| body | 14px, 400 | 15px, 400 | System |
| statValue | 32px, 700 | 32px, 800 | Nunito |
| statLabel | 12px, 600 | 12px, 600, uppercase | System |
| button | (new) | 17px, 700 | Nunito |
| small | (new) | 13px, 500 | System |

### 1D. Layout Token Updates

Update `src/constants/layout.ts`:

| Token | Old | New | Why |
|-------|-----|-----|-----|
| `tileBorderRadius` | 6 | 8 | More rounded, playful |
| `keyboardKeyBorderRadius` | 6 | 8 | Match tiles |
| `cardBorderRadius` | 12 | 16 | Softer cards |
| `buttonBorderRadius` | 12 | 20 | Pill-shaped buttons |
| `screenPadding` | 20 | 20 | Keep |

### 1E. Theme System Updates

Update `src/types/theme.ts` — add new semantic groups:

```typescript
// Add to ThemeColors:
brand: {
  primary: string;    // #42A5F5
  primaryDark: string; // #1E88E5
  secondary: string;  // #FFA726
  tertiary: string;   // #F48FB1
};
surface: {
  // ... existing ...
  elevated: string;   // raised cards
  muted: string;      // subtle sections
};
```

Update `src/hooks/useTheme.ts` — map new raw colors to semantic groups.

---

## Phase 2: Component Overhaul

**Goal:** Make every component feel playful — spring press, soft shadows, rounded shapes, color accents.

### 2A. Button Component (major rewrite)

`src/components/ui/Button.tsx`

**Changes:**
- Pill-shaped (borderRadius: 20)
- Nunito 700 font
- Spring press animation: scale 1.0 → 0.95 on press, spring back to 1.0 on release
- Color shift on press: bg darkens slightly (accent → accentDark)
- Shadow on resting state (soft, colored)
- Loading state with spinner
- Disabled state: reduced opacity + desaturated
- Primary variant: solid sky blue bg
- Secondary variant: outlined with accent border
- Danger variant: coral bg
- Ghost variant: text only with underline

**Implementation:**
```tsx
// Use Animated API for spring press
const scale = useRef(new Animated.Value(1)).current;

const onPressIn = () => {
  Animated.spring(scale, {
    toValue: 0.95,
    useNativeDriver: true,
    friction: 4,
  }).start();
};

const onPressOut = () => {
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
    friction: 4,
  }).start();
};

// Wrap in Animated.View with transform: [{ scale }]
```

### 2B. StatCard Component

`src/components/ui/StatCard.tsx`

**Changes:**
- borderRadius: 16 (was 12)
- Soft colored shadow (not generic black)
- Left border accent (4px colored strip)
- Subtle gradient background option
- Hover/lift effect on press (if tappable)

### 2C. Modal Overlays

`src/components/ui/HowToPlayModal.tsx`, `src/components/game/LengthPickerModal.tsx`, `src/components/game/ResultModal.tsx`

**Changes:**
- Card borderRadius: 24 (was 16-20)
- Soft shadow with colored tint
- Title uses Nunito display font
- "Got it!" button: pill-shaped, sky blue, spring press
- Background dim: slightly warmer (not pure black overlay)

### 2D. SettingsRow Component

`src/components/ui/SettingsRow.tsx`

**Changes:**
- Toggle track: rounded (already is), brighter active color
- Segmented control: pill-shaped segments, spring animation on switch
- Volume slider: brighter fill, larger thumb, colored thumb shadow
- Purchase row: more prominent "Buy" button with accent color
- Row hover state: subtle background shift on press

### 2E. New: Decorative Components

Create `src/components/ui/`:

- `Badge.tsx` — Small colored badge (e.g., "PRO", "NEW", streak number)
- `ProgressRing.tsx` — Circular progress for daily completion
- `GradientCard.tsx` — Card with subtle linear gradient background

---

## Phase 3: Home Screen Redesign

**Goal:** Transform from "3 flat buttons" to "mode cards with visual identity and daily preview."

### 3A. Mode Cards (replace flat buttons)

Instead of `<Button title="Daily Challenge" />`, create mode cards:

```
┌─────────────────────────┐
│  🌅 Daily Challenge     │  ← sky blue gradient bg
│  6 puzzles today        │  ← subtitle
│  ▓▓▓▓░░ 3/6 complete   │  ← progress bar
└─────────────────────────┘

┌─────────────────────────┐
│  🔄 Endless             │  ← green gradient bg
│  Streak: 5 🔥           │  ← streak display
└─────────────────────────┘

┌─────────────────────────┐
│  🎲 Random              │  ← orange gradient bg
│  Surprise word length   │  ← subtitle
└─────────────────────────┘
```

**Each card:**
- borderRadius: 20
- Gradient background (subtle, not garish)
- Icon + title + subtitle + optional status
- Spring press animation (scale 0.98)
- Soft shadow
- Min height: 80px (large touch target)

### 3B. Daily Preview Section

Below the mode cards, show today's daily progress:

```
Today's Challenge
━━━━━━━━━━━━━━━━━━
5 letters  ✓  6 letters  ✓  7 letters  ○
8 letters  ○  9 letters  ○  10 letters ○
```

Six small pill badges showing completion status per length. Completed = green checkmark pill. Incomplete = outline pill.

### 3C. Title & Branding

- "Word Guess" in Nunito 800, 40px
- Below: "Guess the word!" tagline in textSecondary
- Optional: subtle wave or pattern behind title (not heavy, just texture)

### 3D. Top Bar Icons

- Larger touch targets (44×44 → 48×48)
- Circular bg on each icon (surface card bg)
- Spring press on each

### 3E. Hard Mode Toggle

- Move below mode cards, styled as a pill toggle (not raw Switch)
- Icon: 🔥 or ⚡
- Label: "Hard Mode"
- Track: orange when active (signals difficulty)

---

## Phase 4: Game Screen Polish

**Goal:** Make the game screen feel alive — brighter header, playful keyboard, better feedback.

### 4A. Header

- Sky blue background (not gray)
- "Daily · 5 Letters" text in Nunito
- Back button: circular bg, spring press

### 4B. Keyboard

- Key borderRadius: 8 (was 6)
- Unused keys: light blue bg (#E3F2FD) — not gray
- Press animation: key shrinks to 0.92 + color shift
- Used keys: brighter correct/present/absent colors
- Action keys (ENTER/BACKSPACE): slightly different shade, icon or label

### 4C. Tile Improvements

- Empty tile: light blue bg with blue border (not gray)
- Border: 2px solid blue-gray
- Reveal animation: same Reanimated flip, but with brighter colors
- Correct tile bounce: slightly larger scale (1.15 → 1.2)

### 4D. Error Toast

- Coral/red bg (#FF7043)
- Rounded (borderRadius: 12)
- Slide-in animation (not instant)
- Icon: warning triangle

---

## Phase 5: Stats/Leaderboard/Settings

**Goal:** Make secondary screens feel cohesive with the new playful identity.

### 5A. Stats Screen

- Cards: rounded (16px), soft colored shadows
- Overview stats: larger numbers, Nunito 800
- Win rate: circular progress ring (green fill)
- Streak: fire emoji + orange number
- Chart: brighter bar colors (sky blue active bars)
- Share FAB: pill-shaped, sky blue, shadow, spring press

### 5B. Leaderboard Screen

- Tabs: pill-shaped segmented control (not flat underline)
- Active tab: sky blue bg
- Entry rows: rounded cards with rank medal
- Top 3: gold/silver/bronze medal icons
- Current player: highlighted row with accent bg
- Score: bold, colored by rank

### 5C. Settings Screen

- Section headers: Nunito 700
- Section cards: rounded (16px), soft shadow
- Toggle: brighter active color, larger track
- Volume slider: sky blue fill, larger thumb
- Theme selector: pill-shaped segments
- Purchase button: prominent, sky blue bg
- Toast: rounded, colored (green success, coral error)

---

## Phase 6: Dark Theme Alignment

**Goal:** If light theme works well, brighten dark theme to match — or simplify to 1 theme.

### 6A. Brighten Dark Palette

Update `darkColors` in `src/constants/colors.ts`:
- Background: deep navy (#0D1B2A) — not pure black
- Surface: dark blue (#1B2838) — not flat gray
- Tile colors: same bright green/yellow (just slightly lighter for dark bg)
- Accent: light cyan (#4FC3F7) — brighter than light theme accent
- Text: near-white (#ECEFF1) with good contrast

### 6B. Decision Point

After implementing light theme, evaluate:
- If dark theme feels cohesive → keep both
- If dark theme feels like a compromise → remove it, ship light-only

**Recommendation:** Keep both but ship light as default. Dark is a power-user feature.

---

## Phase 7: Microinteraction Pass

**Goal:** Every tap gets satisfying feedback. Game-like, not enterprise.

### 7A. Button Press

- Spring scale: 1.0 → 0.95 → 1.0 (friction: 4)
- Color darkens on press (bg → bgDark)
- Haptic: light impact on press

### 7B. Card Press

- If card is tappable: scale 1.0 → 0.98 on press
- Shadow lifts (elevation increases)
- Spring back on release

### 7C. Toggle Switch

- Thumb slides with spring animation (not instant)
- Track color transitions smoothly

### 7D. Modal Open/Close

- Card scales from 0.9 → 1.0 with spring
- Background fades in
- Close: scale down + fade out

### 7E. Game Win

- Confetti (existing)
- Result card: scale from 0.8 → 1.0 with bounce
- Word reveal: letter-by-letter color pop
- Streak counter: number rolls up

### 7F. Key Press (Keyboard)

- Key shrinks to 0.92 briefly
- Color flash (brief lighter shade)
- Haptic: light impact

---

## Implementation Order

```
Phase 1: Foundation (colors, fonts, tokens, theme)
  ↓
Phase 2: Components (Button, Card, Modal, SettingsRow)
  ↓
Phase 3: Home Screen (mode cards, daily preview, branding)
  ↓
Phase 4: Game Screen (header, keyboard, tiles, toast)
  ↓
Phase 5: Secondary Screens (Stats, Leaderboard, Settings)
  ↓
Phase 6: Dark Theme Alignment
  ↓
Phase 7: Microinteraction Polish
```

Each phase builds on the previous. Phase 1 is the foundation. Phase 2 makes components reusable. Phases 3-5 apply them to screens. Phases 6-7 polish.

---

## Files Modified

| Phase | Files | Change Type |
|-------|-------|-------------|
| 1A | `src/constants/colors.ts` | Full rewrite |
| 1B | `package.json`, `src/app/App.tsx` | Add font, load at startup |
| 1C | `src/constants/typography.ts` | New scale + font refs |
| 1D | `src/constants/layout.ts` | Updated radii |
| 1E | `src/types/theme.ts`, `src/hooks/useTheme.ts` | New semantic groups |
| 2A | `src/components/ui/Button.tsx` | Major rewrite |
| 2B | `src/components/ui/StatCard.tsx` | Style update |
| 2C | `src/components/ui/HowToPlayModal.tsx`, `src/components/game/LengthPickerModal.tsx`, `src/components/game/ResultModal.tsx` | Style update |
| 2D | `src/components/ui/SettingsRow.tsx` | Style update |
| 3A-E | `src/screens/HomeScreen.tsx` | Major rewrite |
| 4A-D | `src/screens/GameScreen.tsx`, `src/components/game/Keyboard.tsx`, `src/components/game/Tile.tsx` | Style + animation update |
| 5A-C | `src/screens/StatsScreen.tsx`, `src/screens/LeaderboardScreen.tsx`, `src/screens/SettingsScreen.tsx` | Style update |
| 6A | `src/constants/colors.ts` (dark) | Dark palette update |
| 7 | Multiple files | Animation additions |

---

## Risk Notes

1. **Font loading latency** — Nunito must load before first render. Show LoadingScreen until `Font.loadAsync` completes. Already have `isReady` gate in App.tsx — add font loading there.

2. **Dark theme tile contrast** — Bright green/yellow on dark navy bg needs WCAG AA verification. May need to lighten tile colors further for dark bg.

3. **Gradient performance** — LinearGradient requires `expo-linear-gradient`. Verify it works with Expo SDK 57 dev client.

4. **Press animation jank** — Spring animations must use `useNativeDriver: true`. Never animate layout properties (width, height, padding) with native driver off.

5. **Font bundle size** — Nunito 700+800 is ~100KB. Acceptable for a game. If too large, fall back to system font with adjusted weights.

---

## Testing Checklist

- [ ] All tile feedback colors pass WCAG AA (4.5:1) on both themes
- [ ] Button press animation runs at 60fps (no JS thread frame drops)
- [ ] Keyboard press animation doesn't interfere with tile reveal
- [ ] Font loads before first render (no flash of unstyled text)
- [ ] Dark theme: all text readable on all backgrounds
- [ ] Reduce Motion toggle disables all new animations
- [ ] Color Blind Mode textures still visible on new tile colors
- [ ] All touch targets ≥ 44×44
- [ ] Modal open/close animations smooth on mid-range device
