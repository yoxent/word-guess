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

| Task ID | Plan | Wave | Requirement | Test Type | Verification Method |
|---------|------|------|-------------|-----------|-------------------|
| 06-01-01 | 01 | 1 | D-155–D-162 | visual | Theme switch renders correctly on emulator |
| 06-01-02 | 01 | 1 | D-181–D-183 | manual | sound.ts init + playback in dev build |
| 06-02-01 | 02 | 1 | LAUNCH-01 | visual | Texture overlays visible when toggle ON |
| 06-02-02 | 02 | 1 | LAUNCH-02 | manual | TalkBack reads correct labels |
| 06-02-03 | 02 | 1 | LAUNCH-03 | visual | Font scales with system font size |
| 06-02-04 | 02 | 1 | LAUNCH-04 | visual | All animations skip when toggle ON |
| 06-02-05 | 02 | 1 | LAUNCH-05 | manual | Back button skips-to-final-state during animation |
| 06-03-01 | 03 | 2 | D-175–D-177 | visual | Stagger entrance on Home screen |
| 06-03-02 | 03 | 2 | D-192–D-194 | manual | How to Play modal renders correctly |
| 06-03-03 | 03 | 2 | D-156, D-163, D-191 | visual | Settings rows appear and toggle correctly |
| 06-03-04 | 03 | 2 | D-178–D-180 | code | ResultScreen.tsx deleted, confetti color changed |
| 06-04-01 | 04 | 2 | LAUNCH-06 | manual | Privacy policy URL reachable, Play Console listing |
| 06-04-02 | 04 | 2 | LAUNCH-07 | manual | console.time markers show in dev build |
| 06-04-03 | 04 | 2 | LAUNCH-08 | manual | AAB builds via EAS, installs on device |
| 06-04-04 | 04 | 2 | LAUNCH-09 | manual | Airplane mode → game works fully |

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
| Ad display | LAUNCH-06 | Requires real ad units | Swap to test IDs, verify interstitial/rewarded ads display correctly |

---

## Validation Sign-Off

- [ ] All tasks have manual or visual verification defined
- [ ] Sampling continuity: no 3 consecutive tasks without verification path
- [ ] Wave 0 not required — existing infrastructure covers all
- [ ] Feedback latency < 60s (unit tests)
- [ ] `nyquist_compliant: true` set in frontmatter after execution

**Approval:** pending
