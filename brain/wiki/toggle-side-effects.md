# toggle-side-effects
updated: 2026-07-09
tags: [pattern, settings, zustand, side-effect, audio, haptics]
related: [architecture, ui-config-registry, dev-workflow]

## Pattern

Toggles that flip Zustand state alone are insufficient when the toggled feature has runtime side effects outside the store (audio, haptics, native modules, network services).

Store flip + side effect wiring required.

## Bug example (fixed 2026-07-09, commit 9ec6085)

`soundEnabled` and `hapticEnabled` were toggled in `settingsStore` but:

| Setting | Store flip | Side effect called? | Result |
|---------|-----------|---------------------|--------|
| `soundEnabled` | ✓ | ❌ never | Sounds played even when OFF |
| `hapticEnabled` | ✓ | ❌ never | Haptics fired even when OFF |

`sound.setEnabled()` was only called once on app mount in `App.tsx:39` — subsequent toggles never propagated to the sound service.
`Haptics.impactAsync()` in `Keyboard.tsx:83` and `GameScreen.tsx:215` was called unconditionally, ignoring `hapticEnabled`.

## Fix pattern

**For store-mediated side effects** (sound.setEnabled, etc.):
```typescript
// ToggleRow in SettingsRow.tsx
useEffect(() => {
  if (config.storeKey === 'soundEnabled') {
    setSoundEnabled(!!value);
  }
}, [value, config.storeKey]);
```

Side effect runs on every value change including initial mount.

**For inline side effects** (haptics, vibration):
```typescript
// Read store state at call site
if (useSettingsStore.getState().hapticEnabled) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
```

`getState()` for one-off calls; `useSettingsStore((s) => s.x)` for reactive components.

## When to apply

Whenever a toggle has a runtime side effect outside the store:
- Audio playback (sound.setEnabled, Audio.setIsEnabledAsync)
- Haptics/vibration
- Native module flags
- Network polling on/off
- Background sync on/off
- Theme application (already handled via useColors hook)

## Don't

Don't assume "toggling the state is enough". Side effects need explicit wiring. Future toggles should ship with the side effect handler in the same PR.
