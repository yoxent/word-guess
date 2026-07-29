# Version Check + Daily UTC Rollover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible Play Store update modal when installed version is below Remote Config `min_supported_version`, and invalidate stale Daily Challenge saves after UTC day rollover.

**Architecture:** Pure semver compare + Remote Config getters (fail-open). `UpdateRequiredModal` hosted in `App.tsx` after existing `fetchAndActivate`. Daily restore/continue gates in `activeGame.ts` using `getDailyDateString(startedAt)` vs today; GameScreen AppState restore reuses `shouldRestoreActiveGame`.

**Tech Stack:** Expo 57, React Native, `@react-native-firebase/remote-config`, `expo-application`, Jest, existing modal UI patterns.

**Spec:** `docs/superpowers/specs/2026-07-29-version-check-and-daily-rollover-design.md`

## Global Constraints

- Soft update only (dismissible); re-prompt on next cold start while still below floor — never persist "don't ask again"
- Fail-open: RC unreachable / unreadable installed version → no modal
- RC key `min_supported_version` (string), in-app default `"0.0.0"`
- Play package `com.vorithstudio.wordguess`
- Daily gate uses UTC via `getDailyDateString` only; no schema change to `GameSession`
- Do not commit unless the user explicitly asks

---

## File map

| File | Responsibility |
|------|----------------|
| `src/utils/semver.ts` | Parse + compare `major.minor.patch` |
| `src/utils/__tests__/semver.test.ts` | Semver unit tests |
| `src/utils/activeGame.ts` | Daily UTC date gate on offer/restore |
| `src/utils/__tests__/activeGame.test.ts` | Stale/fresh daily cases |
| `src/services/remoteConfig.ts` | `getMinSupportedVersion`, `isUpdateRequired` |
| `src/services/__tests__/remoteConfigVersion.test.ts` | Version helpers with mocked RC |
| `src/constants/store.ts` | Play Store URLs / package id |
| `src/components/ui/UpdateRequiredModal.tsx` | Dismissible update modal |
| `src/components/ui/index.ts` | Export modal |
| `src/components/ui/__tests__/UpdateRequiredModal.test.tsx` | Modal press tests |
| `src/app/App.tsx` | After fetch, set `updateRequired`; render modal |
| `src/screens/GameScreen.tsx` | AppState restore via `shouldRestoreActiveGame` |
| `package.json` | Add `expo-application` |

---

### Task 1: Semver helper

**Files:**
- Create: `src/utils/semver.ts`
- Test: `src/utils/__tests__/semver.test.ts`

**Produces:**
- `compareSemver(a: string, b: string): number` — negative if a&lt;b, 0 if equal, positive if a&gt;b
- `isVersionBelow(installed: string, minimum: string): boolean`

- [ ] **Step 1: Write failing tests**

```typescript
import { compareSemver, isVersionBelow } from '../semver';

describe('semver', () => {
  it('orders major.minor.patch', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareSemver('1.0.1', '1.0.1')).toBe(0);
    expect(compareSemver('1.1.0', '1.0.9')).toBeGreaterThan(0);
  });

  it('treats missing/non-numeric parts as 0', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('abc', '0.0.0')).toBe(0);
  });

  it('isVersionBelow only when strictly less', () => {
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('1.0.1', '1.0.1')).toBe(false);
    expect(isVersionBelow('1.0.2', '1.0.1')).toBe(false);
    expect(isVersionBelow('1.0.0', '0.0.0')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx jest src/utils/__tests__/semver.test.ts -v`

- [ ] **Step 3: Implement**

```typescript
function parsePart(raw: string | undefined): number {
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseSemver(version: string): [number, number, number] {
  const parts = String(version ?? '').trim().split('.');
  return [parsePart(parts[0]), parsePart(parts[1]), parsePart(parts[2])];
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function isVersionBelow(installed: string, minimum: string): boolean {
  return compareSemver(installed, minimum) < 0;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx jest src/utils/__tests__/semver.test.ts -v`

---

### Task 2: Daily UTC gate in `activeGame`

**Files:**
- Modify: `src/utils/activeGame.ts`
- Modify: `src/utils/__tests__/activeGame.test.ts`

**Consumes:** `getDailyDateString` from `src/services/dailySeed.ts`  
**Produces:** Date-aware `shouldOfferContinue` / `shouldRestoreActiveGame`

- [ ] **Step 1: Add failing tests** for yesterday daily vs today daily; random ignores date

```typescript
it('does not restore a daily save from a previous UTC day', () => {
  const saved = makeSession({
    mode: 'daily',
    letterCount: 5,
    guesses: ['CRANE'],
    startedAt: '2020-01-01T12:00:00.000Z',
  });
  expect(shouldRestoreActiveGame(saved, 'daily', 5, false)).toBe(false);
  expect(shouldOfferContinue(saved, 'daily', 5, false)).toBe(false);
});

it('restores a daily save from today UTC', () => {
  const saved = makeSession({
    mode: 'daily',
    letterCount: 5,
    guesses: ['CRANE'],
    startedAt: new Date().toISOString(),
  });
  expect(shouldRestoreActiveGame(saved, 'daily', 5, false)).toBe(true);
  expect(shouldOfferContinue(saved, 'daily', 5, false)).toBe(true);
});

it('ignores startedAt for non-daily modes', () => {
  const saved = makeSession({
    mode: 'endless',
    letterCount: 6,
    guesses: ['CRANES'],
    startedAt: '2020-01-01T12:00:00.000Z',
  });
  expect(shouldRestoreActiveGame(saved, 'endless', 6, false)).toBe(true);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/utils/__tests__/activeGame.test.ts -v`

- [ ] **Step 3: Implement gate**

```typescript
import { getDailyDateString } from '../services/dailySeed';

function isDailySaveCurrent(saved: GameSession): boolean {
  if (saved.mode !== 'daily') return true;
  return getDailyDateString(new Date(saved.startedAt)) === getDailyDateString();
}
```

Use in both `shouldOfferContinue` and `shouldRestoreActiveGame` (and keep existing mode/length/progress checks).

- [ ] **Step 4: Run — expect PASS**

---

### Task 3: Store constants + Remote Config version APIs + `expo-application`

**Files:**
- Create: `src/constants/store.ts`
- Modify: `src/services/remoteConfig.ts`
- Create: `src/services/__tests__/remoteConfigVersion.test.ts`
- Modify: `package.json` via `npx expo install expo-application`

**Produces:**
- `PLAY_STORE_PACKAGE`, `PLAY_STORE_MARKET_URL`, `PLAY_STORE_HTTPS_URL`
- `getMinSupportedVersion(): string`
- `isUpdateRequired(installedVersion: string | null | undefined): boolean`

- [ ] **Step 1: Install**

Run: `npx expo install expo-application`

- [ ] **Step 2: Add store constants**

```typescript
export const PLAY_STORE_PACKAGE = 'com.vorithstudio.wordguess';
export const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_HTTPS_URL =
  `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
```

- [ ] **Step 3: Extend remoteConfig**

After existing getters, add:

```typescript
import { isVersionBelow } from '../utils/semver';

const DEFAULT_MIN_SUPPORTED_VERSION = '0.0.0';

export function getMinSupportedVersion(): string {
  try {
    const fromRc = getValue(rc, 'min_supported_version').asString()?.trim();
    if (fromRc) return fromRc;
  } catch {
    // fall through
  }
  return DEFAULT_MIN_SUPPORTED_VERSION;
}

/** Fail-open: empty/null installed version → false. */
export function isUpdateRequired(installedVersion: string | null | undefined): boolean {
  if (!installedVersion || !String(installedVersion).trim()) return false;
  const minimum = getMinSupportedVersion();
  if (!minimum || minimum === DEFAULT_MIN_SUPPORTED_VERSION) {
    // Still compare — 0.0.0 never prompts for real app versions ≥ 0.0.0
  }
  return isVersionBelow(installedVersion, minimum);
}
```

Prefer keeping the `0.0.0` behavior purely via `isVersionBelow` (real apps are never below `0.0.0`).

- [ ] **Step 4: Tests** mocking `getValue` / module, covering empty RC → no update for `1.0.0`, RC `1.0.2` → update required for `1.0.1`, null installed → false.

- [ ] **Step 5: Run tests**

Run: `npx jest src/services/__tests__/remoteConfigVersion.test.ts src/utils/__tests__/semver.test.ts -v`

---

### Task 4: `UpdateRequiredModal` + App wiring

**Files:**
- Create: `src/components/ui/UpdateRequiredModal.tsx`
- Modify: `src/components/ui/index.ts`
- Create: `src/components/ui/__tests__/UpdateRequiredModal.test.tsx`
- Modify: `src/app/App.tsx`

**Consumes:** store URLs, `isUpdateRequired`, `Application.nativeApplicationVersion`

- [ ] **Step 1: Modal component** — transparent fade Modal; title “Update available”; body “A newer version is available on the Play Store.”; primary Update; secondary Later; `onRequestClose` → onLater.

Update handler:

```typescript
async function openPlayStore() {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
  } catch {
    await Linking.openURL(PLAY_STORE_HTTPS_URL);
  }
}
```

Style like `HowToPlayModal` (overlay, card, theme, typography, layout).

- [ ] **Step 2: Modal tests** — renders when visible; Later calls `onLater`; Update calls Linking (mock).

- [ ] **Step 3: Wire `App.tsx`**

```typescript
const [updateRequired, setUpdateRequired] = useState(false);

// inside init, after await fetchAdUnitIds():
try {
  const installed = Application.nativeApplicationVersion;
  setUpdateRequired(isUpdateRequired(installed));
} catch {
  // fail-open
}

// in ready return:
<>
  <StatusBar ... />
  <Navigation />
  <UpdateRequiredModal
    visible={updateRequired}
    onLater={() => setUpdateRequired(false)}
  />
</>
```

Import `* as Application from 'expo-application'`.

- [ ] **Step 4: Run modal + related tests**

---

### Task 5: GameScreen AppState restore uses shared gate

**Files:**
- Modify: `src/screens/GameScreen.tsx` (AppState `active` branch ~374–382)

**Consumes:** `shouldRestoreActiveGame`

Replace raw `if (saved && saved.status === 'playing')` restore with:

```typescript
const hardMode = useSettingsStore.getState().hardModeEnabled;
const len = letterCount ?? currentSession?.letterCount ?? randomLength();
const slot = toActiveGameSlot(mode, len, hardMode);
const saved = getActiveGame(slot);
if (shouldRestoreActiveGame(saved, mode, len, hardMode)) {
  useGameStore.getState().restoreSession(saved);
} else if (saved) {
  clearActiveGame(slot);
}
```

- [ ] **Step 1: Apply change**
- [ ] **Step 2: Run** `npx jest src/utils/__tests__/activeGame.test.ts -v` and `npx tsc --noEmit` (or `npm run ts:check`)

---

### Task 6: Verification + optional wiki note

- [ ] **Step 1:** Run full targeted suite:

```
npx jest src/utils/__tests__/semver.test.ts src/utils/__tests__/activeGame.test.ts src/services/__tests__/remoteConfigVersion.test.ts src/components/ui/__tests__/UpdateRequiredModal.test.tsx -v
```

- [ ] **Step 2:** `npm run ts:check`

- [ ] **Step 3 (optional):** One-line mention in `brain/wiki/daily-seed.md` that restore requires same UTC day via `startedAt`, and in monetization/architecture RC keys list add `min_supported_version`.

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| RC `min_supported_version` + default `0.0.0` | 3 |
| Semver strictly-less prompt | 1, 3 |
| Fail-open offline / bad version | 3, 4 |
| Dismissible modal + Play URLs | 4 |
| Cold-start only (no AppState re-prompt) | 4 (state only set in init) |
| Daily UTC invalidate offer/restore | 2 |
| GameScreen AppState uses same gate | 5 |
| Tests listed in spec | 1, 2, 3, 4 |
