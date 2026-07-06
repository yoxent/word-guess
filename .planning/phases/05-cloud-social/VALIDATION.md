# Phase 5: Cloud & Social — VALIDATION.md

**Generated:** 2026-07-06
**Nyquist Validation:** Enabled

## Verification Strategy

### Wave 0 — Foundation Verification (pre-execution)

| Check | Command | File | Pass Condition |
|-------|---------|------|----------------|
| TypeScript compiles | `npx tsc --noEmit` | All plans | Zero errors |
| Deps installed | `node -e "const p=require('./package.json'); ['@react-native-firebase/auth','@react-native-firebase/firestore','@react-native-google-signin/google-signin'].forEach(d => {if(!p.dependencies[d]) process.exit(1)})"` | package.json | All 3 deps present |
| Expo SDK compat | `npx expo install --check` | package.json | No mismatches |
| Config plugins | `node -e "const a=require('./app.json'); ['@react-native-firebase/auth','@react-native-firebase/firestore','@react-native-google-signin/google-signin'].forEach(p => {if(!a.expo.plugins.includes(p)) process.exit(1)})"` | app.json | All 3 plugins present |

### Wave 1 — 05-01 Verification (Services Foundation)

| Task | Verify Command | Pass Condition | Feedback Latency |
|------|---------------|----------------|------------------|
| 1 — Deps install | `npx tsc --noEmit && npx expo install --check` | Clean compile, no version mismatches | Immediate (compile time) |
| 2 — firestoreService.ts | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/services/firestoreService.ts','utf-8'); console.log(c.includes('updatePlayerStats')&&c.includes('submitLeaderboardScore')&&c.includes('getLeaderboard')&&c.includes('merge: true'))"` | All 4 functions exported + merge:true | Immediate (static analysis) |
| 3 — syncQueue.ts | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/services/syncQueue.ts','utf-8'); console.log(c.includes('enqueueEvent')&&c.includes('drainQueue')&&c.includes('retryCount')&&c.includes('AsyncStorage'))"` | Queue ops + retry + AsyncStorage | Immediate (static analysis) |

### Wave 2 — 05-02 Verification (Auth)

| Task | Verify Command | Pass Condition | Feedback Latency |
|------|---------------|----------------|------------------|
| 1 — authService.ts | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/services/authService.ts','utf-8'); console.log(c.includes('signInWithGoogle')&&c.includes('signOutFromGoogle')&&c.includes('signInSilently')&&c.includes('WEB_CLIENT_ID'))"` | All auth ops + Web client ID | Immediate (static analysis) |
| 2 — authStore.ts | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/stores/authStore.ts','utf-8'); console.log(c.includes('googleSignIn')&&c.includes('googleSignOut')&&c.includes('drainQueue'))"` | Google Sign-In actions + queue drain | Immediate (static analysis) |
| 3 — Settings UI | `node -e "const fs=require('fs'); const sr=fs.readFileSync('src/components/ui/SettingsRow.tsx','utf-8'); const ss=fs.readFileSync('src/screens/SettingsScreen.tsx','utf-8'); console.log(sr.includes('signInButton')&&ss.includes('handleGoogleSignIn'))"` | Sign-in row renders + handler wired | Immediate (static analysis) |

### Wave 3 — 05-03 Verification (Leaderboards)

| Task | Verify Command | Pass Condition | Feedback Latency |
|------|---------------|----------------|------------------|
| 1 — leaderboardService.ts | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/services/leaderboardService.ts','utf-8'); console.log(c.includes('submitScore')&&c.includes('updateLeaderboardAfterGame')&&c.includes('getLeaderboardData'))"` | All 3 functions exported | Immediate (static analysis) |
| 2 — LeaderboardScreen.tsx | `node -e "const fs=require('fs'); const c=fs.readFileSync('src/screens/LeaderboardScreen.tsx','utf-8'); console.log(c.includes('daily_streak')&&c.includes('endless_streak')&&c.includes('endless_total')&&c.includes('RefreshControl')&&c.includes('useFocusEffect'))"` | 3 tabs + pull-to-refresh + focus refresh | Immediate (static analysis) |
| 3 — Game completion wire | `node -e "const fs=require('fs'); const gs=fs.readFileSync('src/screens/GameScreen.tsx','utf-8'); const rm=fs.readFileSync('src/components/game/ResultModal.tsx','utf-8'); console.log(gs.includes('updateLeaderboardAfterGame')&&gs.includes('updatePlayerStats')&&rm.includes('incrementEndlessTotalWords'))"` | Score submission + stats sync + endless counter | Immediate (static analysis) |

### Sampling Continuity

| Wave | Verification Timing | Who Verifies |
|------|-------------------|--------------|
| 0 | Before plan execution begins | Executor agent |
| 1 | After 05-01 tasks complete | Per-task verify commands |
| 2 | After 05-02 tasks complete | Per-task verify commands |
| 3 | After 05-03 tasks complete | Per-task verify commands |
| E2E | At phase completion | gsd-verifier agent |

### End-to-End Verification (Phase Completion)

| Scenario | Manual/E2E Test | Pass Condition |
|----------|----------------|----------------|
| Google Sign-In flow | Manual on device | User taps "Sign in with Google" → Google dialog → returns to app → Settings shows player name |
| Silent sign-in restart | Manual on device | Sign in → kill app → reopen → Settings still shows player name (no re-auth needed) |
| Leaderboard display | Manual on device | Sign in → navigate to Leaderboard → all 3 tabs render with data |
| Offline stats sync | Manual on device | Play game offline → come online → stats show in Firestore after sync |
| Deferred score submission | Manual on device | Play game without signing in → sign in → score appears on leaderboard |

### Wave 0 — Test File Coverage

| File to Create/Modify | Testing Approach | Status |
|-----------------------|-----------------|--------|
| `src/services/firestoreService.ts` | Static verification via TypeScript + verify commands | Wave 1 |
| `src/services/syncQueue.ts` | Static verification + verify commands | Wave 1 |
| `src/services/authService.ts` | Static verification + verify commands | Wave 2 |
| `src/stores/authStore.ts` | Static verification + verify commands | Wave 2 |
| `src/screens/LeaderboardScreen.tsx` | Static verification + verify commands | Wave 3 |
| `src/services/leaderboardService.ts` | Static verification + verify commands | Wave 3 |
| `src/screens/GameScreen.tsx` (modified) | Static verification + verify commands | Wave 3 |
| `src/components/game/ResultModal.tsx` (modified) | Static verification + verify commands | Wave 3 |
