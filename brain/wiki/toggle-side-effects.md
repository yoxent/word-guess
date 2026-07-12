# toggle-side-effects
updated: 2026-07-12
tags: [pattern, settings, zustand, side-effect, audio, haptics]
related: [architecture, ui-config-registry, dev-workflow, audio-system]

## Pattern

Settings (toggles or numeric values) that flip Zustand state alone are insufficient when the setting has runtime side effects outside the store (audio, haptics, native modules, network services).

Store update + side effect wiring required.

## Evolution

This pattern started as "toggle-side-effects" (binary toggles). It now generalizes to **any setting** that controls a runtime subsystem — toggles (boolean), sliders (numeric), theme modes (enum), etc.

## Bug example (fixed 2026-07-09, commit 9ec6085)

`soundEnabled` and `hapticEnabled` were toggled in `settingsStore` but:

| Setting | Store flip | Side effect called? | Result |
|---------|-----------|---------------------|--------|
| `soundEnabled` | ✓ | ❌ never | Sounds played even when OFF |
| `hapticEnabled` | ✓ | ❌ never | Haptics fired even when OFF |

`sound.setEnabled()` was only called once on app mount in `App.tsx:39` — subsequent toggles never propagated to the sound service.
`Haptics.impactAsync()` in `Keyboard.tsx:83` and `GameScreen.tsx:215` was called unconditionally, ignoring `hapticEnabled`.

## Fix pattern

### Reactive: useEffect in App.tsx (preferred for volume sliders, theme)

```typescript
// app/App.tsx — one useEffect per setting that has a side effect
const bgmVolume = useSettingsStore((s) => s.bgmVolume);
useEffect(() => {
  sound.setBgmVolume(bgmVolume);
}, [bgmVolume]);
```

The useEffect runs on every value change (including initial mount). **This is the recommended pattern for any new setting** because:
- The store is the single source of truth
- The effect always reflects the current store value, even if a future code path changes the store directly
- No risk of forgetting the wiring in a new call site

### Immediate: at the call site (used in addition to the useEffect for instant feedback)

```typescript
// In the volume slider's onPress handler (SettingsRow.tsx)
const handleSelect = (v: VolumeLevel) => {
  if (config.storeKey === 'bgmVolume') {
    setBgm(v);          // store
    setBgmVolume(v);    // immediate audio side effect
  }
};
```

The call-site wiring provides instant feedback without waiting for the next React render cycle. The useEffect in App.tsx acts as a safety net (idempotent — calling setBgmVolume twice with the same value is harmless).

### Inline one-offs (haptics, vibration — no stored volume)

```typescript
// Read store state at call site
if (useSettingsStore.getState().hapticEnabled) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
```

`getState()` for one-off calls; `useSettingsStore((s) => s.x)` for reactive components.

## When to apply

Whenever a setting has a runtime side effect outside the store:
- **Audio** — `sound.setBgmVolume` / `sound.setSfxVolume` (Phase 6 BGM)
- **Haptics** — `Haptics.impactAsync` gated by `hapticEnabled`
- **Native module flags** — same pattern, just call the module directly
- **Network polling on/off** — start/stop interval based on store value
- **Background sync on/off** — same
- **Theme application** — already handled via the `useTheme()` hook (not a side effect, more of a derived value)
- **App lifecycle** — `AppState` listener calls `sound.pauseBgm()` / `sound.resumeBgm()`

## Migration history

- **2026-07-09 (this update)**: Replaced the `soundEnabled: boolean` toggle with two numeric volume sliders (`bgmVolume`, `sfxVolume`). The call-site `useEffect` in `SettingsRow` was removed (no longer needed since the sliders are direct `setBgmVolume` calls). The reactive `useEffect` in `App.tsx` is now the primary wiring. Old `setSoundEnabled` API was removed.
- **2026-07-09 (9ec6085)**: Initial fix for `soundEnabled` / `hapticEnabled` — added the `useEffect` in `ToggleRow` to call `setSoundEnabled`.

## Volume 0% semantics (2026-07-12)

0% is **no playback**, not muted silence. See [audio-system](audio-system.md).

| Setting | At 0 | Mechanism |
|---------|------|-----------|
| `bgmVolume` | Pause BGM player | `setBgmVolume`: `pause()` on >0→0, `play()` only on 0→>0 |
| `sfxVolume` | Skip SFX | `play()` early-returns before `seekTo`/`play()` |

Do not "mute" by leaving players running at volume 0 — that keeps decoding and holding the audio session.

## Don't

- Don't assume "toggling the state is enough". Side effects need explicit wiring.
- Don't wire the side effect ONLY at the call site. The reactive useEffect in `App.tsx` is the safety net that ensures the audio player stays in sync even if a future code path changes the store directly (e.g. remote config, deep links).
- Future settings should ship with the side effect handler in the same PR.
- Don't treat volume=0 as silent playback for BGM — always `pause()`.
