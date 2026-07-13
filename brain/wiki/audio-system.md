# audio-system
updated: 2026-07-12 (volume slider hit target vs visual thumb)
tags: [audio, bgm, sfx, expo-audio, settings, lifecycle]
related: [toggle-side-effects, key-risks, architecture, tech-stack, ui-config-registry]

## Overview

`src/services/sound.ts` — expo-audio singleton. Players created once in `sound.init()` (App mount), live for the app lifetime.

| Track | Asset | Behavior |
|-------|-------|----------|
| BGM | `assets/sounds/bgm.wav` (~32s) | One looping `AudioPlayer`, `loop = true` |
| SFX | keypress / reveal / win / lose `.wav` | Four players; `seekTo(0); play()` per trigger |

Volumes: continuous `[0, 1]` via `bgmVolume` / `sfxVolume` in `settingsStore` (10% snap). Wired by [toggle-side-effects](toggle-side-effects.md) — `App.tsx` useEffect + live slider calls.

## Settings volume sliders (UI)
Implemented in `SettingsRow.tsx` `VolumeSlider`:
- Visual thumb **26px**; invisible hit target **52px** around it (same look, easier drag)
- Horizontal `sliderInset` = half hit size so thumb/hit stay inside the section at 0%/100%
- Full-track vertical touch height ≥ hit size; pan capture wins over parent `ScrollView`
- Drag uses `dx / trackWidth` from grant value (never seek with `locationX` on grant — thumb-relative coords jump to 0%)

## 0% = no playback (not muted silence)

| Slider at 0% | Behavior | Why |
|--------------|----------|-----|
| BGM | `pause()` on >0→0; `play()` only on 0→>0 | Volume=0 alone keeps decoding silence — wastes CPU/audio session |
| SFX | `play()` returns before `seekTo`/`play()` | Skip work entirely when muted |

Players stay **loaded** (instant unmute). Continuous decode/mix only when volume > 0.

Mid-range volume changes update `player.volume` only — never `play()`/`pause()` (avoids restart/static; see P34 in [key-risks](key-risks.md)).

## Lifecycle

- **Foreground:** BGM plays if `bgmVolume > 0`
- **AppState `background` / `inactive`:** `pauseBgm()`
- **AppState `active`:** `resumeBgm()` only if `bgmVolume > 0`
- **Audio mode:** `playsInSilentMode: true`, `shouldPlayInBackground: false`, `interruptionMode: 'duckOthers'`
- **SFX ducking:** while SFX plays, BGM volume → 30% of intended for ~200–2200ms, then restore (bypasses `setBgmVolume` play/pause logic)

## Intentional vs not

| Behavior | Intentional? |
|----------|--------------|
| Pause when app backgrounds / inactive | Yes |
| Stop when BGM slider → 0% | Yes (`pause`) |
| Skip SFX when SFX slider → 0% | Yes |
| BGM stops while idling on Home, app still foreground, volume > 0 | **No** — bug / OS side effect |

### Open: BGM dies while idling on Home (2026-07-12)

User reported BGM stopping after long idle on homepage with no JS errors. Code has **no idle timeout**. Likely causes to investigate:

1. `loop = true` failing silently after ~32s track end
2. Brief `inactive` AppState (notification shade, emulator focus) → pause without solid resume
3. Android audio focus loss (`duckOthers`)

No playback-status / ended listener today — only `console.warn` on thrown errors.

## Call sites

| Event | API |
|-------|-----|
| Key press | `playKeyPress()` |
| Tile reveal | `playReveal()` |
| Win / loss | `playWin()` / `playLoss()` — GameScreen fires these from `pendingStatus` **before** `finalizeRevealOutcome` / ResultModal mount (modal + sync was starving Android audio). SFX `play()` awaits `seekTo(0)` so longer clips replay reliably. |
| Volume change | `setBgmVolume` / `setSfxVolume` |
| AppState | `pauseBgm` / `resumeBgm` |
