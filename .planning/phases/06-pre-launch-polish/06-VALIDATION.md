---
phase: 6
slug: pre-launch-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for testing feedback during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (Expo default) + React Native Testing Library |
| **Config file** | `jest.config.js` at project root |
| **Quick run command** | `npx jest --bail --passWithNoTests` |
| **Full suite command** | `npx jest --bail --verbose` |
| **Estimated runtime** | ~60s |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --bail --passWithNoTests` (unit tests only)
- **After every plan wave:** Run full suite + `npx expo run:android` (smoke test on emulator)
- **Before verification:** Full suite green + emulator smoke test

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirements | Test Type | Description |
|---------|------|------|-------------|-----------|-------------|
| 06-01-01 | 01 | 1 | D-181, D-182 | automated | Install expo-av, create assets/sounds/.gitkeep |
| 06-01-02 | 01 | 1 | D-155, D-163, D-184 | automated | Extend AppSettings + settingsStore with 3 new fields |
| 06-01-03 | 01 | 1 | D-155, D-163, D-184 | automated | Extend config registry (themeSelector type) + animation constants |
| 06-02-01 | 02 | 1 | D-184–D-187 | automated | colors.ts restructured to lightColors+darkColors + useColors() hook |
| 06-02-02 | 02 | 1 | LAUNCH-03 (D-161) | automated | typography.ts PixelRatio font scaling applied |
| 06-02-03 | 02 | 1 | D-181–D-183 | automated | sound.ts wired with expo-av + init() in App.tsx |
| 06-03-01 | 03 | 2 | LAUNCH-01, LAUNCH-02, LAUNCH-04 (D-155–D-160, D-163–D-180) | automated + visual | Tile.tsx: textures, TalkBack, contrast fix, reduceMotion (direct store reads) |
| 06-03-02 | 03 | 2 | LAUNCH-02, LAUNCH-04 (D-159, D-164, D-179–D-183) | automated | Keyboard.tsx TalkBack + sound; Confetti.tsx fix + reduceMotion; ResultModal.tsx sound |
| 06-03-03 | 03 | 2 | LAUNCH-04, LAUNCH-05 (D-167, D-178–D-183) | automated | GameScreen.tsx playReveal; delete ResultScreen; remove from types/navigation.ts |
| 06-04-01 | 04 | 3 | D-175–D-177, D-192–D-194 | automated + visual | Home stagger animation + ? icon + HowToPlayModal + App.tsx setTimeout removal |
| 06-04-02 | 04 | 3 | D-156, D-163, D-191 | automated | SettingsRow.tsx ThemeSelectorRow + toggle dispatch cases |
| 06-04-03 | 04 | 3 | LAUNCH-05 (D-165–D-167), D-178, D-189–D-190 | automated | Navigation.tsx: BackHandler (setIsRevealing+flushPendingInputs), Result route removal, Nav theme; App.tsx StatusBar |
| 06-05-01a | 05 | 3 | D-188 | automated | Screen files migration: 6 screens (Home, Game, Stats, Settings, Leaderboard, Loading) |
| 06-05-01b | 05 | 3 | D-188 | automated | Game component files migration: Tile, Keyboard, Confetti, ResultModal, LengthPickerModal, GameBoard |
| 06-05-01c | 05 | 3 | D-188 | automated | UI components + app files: Button, StatCard, SettingsRow, Navigation, App |
| 06-06-01 | 06 | 3 | LAUNCH-06 (D-168), LAUNCH-07 (D-169–D-171) | automated + manual | Privacy policy creation + performance markers in App/GameScreen/StatsScreen |
| 06-06-02 | 06 | 3 | LAUNCH-08 (D-172–D-173), LAUNCH-09 (D-174) | manual | Build checklist + offline-first test procedure |

---

## Wave 0 Requirements

- [ ] N/A — existing Jest infrastructure covers all phase needs. No new test framework installs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TalkBack labels | LAUNCH-02 | Requires TalkBack Android screen reader | Enable TalkBack, navigate game, verify tile and key announcements |
| Font scaling | LAUNCH-03 | Requires system font size change | Settings → Display → Font Size → Large, verify app text scales |
| Sound playback | D-181–D-183 | Requires audio hardware + .wav files | Place test .wav in assets/sounds/, verify keypress plays on tap |
| EAS build | LAUNCH-08 | Requires EAS cloud build | `eas build --platform android --profile production` and install AAB |
| Offline mode | LAUNCH-09 | Requires airplane mode | Enable airplane mode, launch app, play a full game |
| Privacy policy | LAUNCH-06 | Requires Play Store | Submit to Play Console, verify privacy policy link in listing |
| Performance markers | LAUNCH-07 | Requires dev build console | Run dev build, check Metro console for time/timeEnd output |
| Texture overlays | LAUNCH-01 | Visual check | Toggle colorBlindMode ON, verify dots/stripes/solid visible on tiles |
| Home stagger animation | D-175–D-177 | Visual check | Verify title → buttons → icons stagger sequence on app launch |
| How to Play modal | D-192–D-194 | Visual check | Tap ? icon, verify tile examples + rules + dismiss button |

---

## Validation Sign-Off

- [ ] All tasks have manual or visual verification defined
- [ ] Sampling continuity: no 3 consecutive tasks without verification path
- [ ] Wave 0 not required — existing infrastructure covers all
- [ ] Feedback latency < 60s (unit tests)
- [ ] `nyquist_compliant: true` set in frontmatter after execution

**Approval:** pending