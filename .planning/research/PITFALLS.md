# Domain Pitfalls

**Domain:** React Native Word-Guessing Puzzle Game (Android)
**Researched:** 2026-07-04
**Overall confidence:** HIGH — most findings verified via npm registry and library documentation; some based on established RN community patterns.

---

## Critical Pitfalls

Mistakes that cause rewrites, store rejection, or player abandonment.

### Pitfall 1: Animating Tile Reveals on the JS Thread Instead of the UI Thread

**What goes wrong:** Tile flip/reveal animations (the signature moment of a Wordle-style game) stutter, jitter, or drop frames on mid-range Android devices. All tile animations run on the JS thread, blocking on React reconciliation cycles and causing visible lag during the 3-6 simultaneous tile reveals after each guess.

**Why it happens:** React Native's built-in `Animated` API defaults to JS-driven animations. Newcomers from Unity/Flutter (who are used to GPU-accelerated animations) assume RN handles this automatically. The JS thread is also handling dictionary lookup, word validation, keyboard color updates, and state updates simultaneously.

**Consequences:**
- Animations visibly stutter on ~30% of Android devices (especially <8GB RAM)
- Players perceive the game as "cheap" or poorly built
- Negative Play Store reviews citing lag
- Rewrite required if using `Animated.timing` sequentially for 5-6 tiles

**Prevention:**
- Use `react-native-reanimated` (v4.5.1) with worklets for ALL tile animations — runs animations on the UI thread
- Keep JS thread work minimal during the animation sequence
- Batch state updates: update all tile states before triggering the animation sequence, not during
- Use `useSharedValue` + `withTiming`/`withSequence` for tile flip animations
- Pre-compute all tile colors before starting the reveal sequence
- Run keyboard color updates through `runOnUI` to avoid JS thread hopping

**Detection:**
- Profile with Flipper or RN Debugger during the tile reveal sequence
- Look for JS thread >16ms frame drops during animations
- Test on a Moto G Power or similar mid-range Android device (not just Pixel/Flagship)

**Phase to address:** Phase 1 or Phase 2 (Core Gameplay) — must be designed in from the start; retrofitting reanimated after using `Animated` throughout is a major refactor.

---

### Pitfall 2: Daily Puzzle Seed Discovery via APK Decompilation

**What goes wrong:** Players reverse-engineer the APK, extract the private seed, and pre-compute all future daily words. Leaderboards become meaningless; the game's core value (same word, same challenge for everyone) is destroyed.

**Why it happens:** The seed needs to be in the app binary to deterministically generate the daily word offline. Storing it as a hardcoded string or in a resource file means `apktool` + `strings` or `jadx` can extract it in minutes.

**Consequences:**
- Daily challenge integrity destroyed
- Leaderboards invalidated (cheaters always get a "perfect game")
- Players lose trust — the game feels rigged
- Store reviews tank
- Requires a forced-update to all clients with a new seed, which only works until the next decompilation

**Prevention:**
- **Obfuscate the seed:** Split the seed across multiple sources — part in native Android code (Kotlin/C++ via JNI), part derived from the app signing key fingerprint at runtime
- **Add ProGuard/R8 obfuscation:** Enable full minification and obfuscation in `android/app/build.gradle` — `minifyEnabled true`, `proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')`
- **Avoid hardcoded strings:** Compute the seed from multiple sources (e.g., `SHA256(packageSignature + appVersion + buildTimestamp)`) so each build has a different effective seed
- **Use a two-factor approach:** The word is `seed + date` → word index; the seed itself is never plainly stored as a string constant
- **Server-side validation (future):** When cloud sync is implemented, validate that the daily word is correct before accepting leaderboard scores; reject submissions with the wrong word
- **Accept the limit:** Ultimately, any client-side seed system can be reverse-engineered by a determined attacker. The goal is to raise the bar high enough that casual cheating isn't trivial.

**Detection:**
- Decompile your own APK: `apktool d app-release.apk` then `grep -r "seed" ./` or `strings app-release.apk | grep -i "seed"`
- If visible in plaintext or simple XOR, it's extractable

**Phase to address:** Phase 2 (Daily Challenge) — seed design must be secure from the first daily puzzle build. Can't retrofit after launch.

---

### Pitfall 3: Play Store Rejection — Missing or Improper Ad & IAP Compliance

**What goes wrong:** App rejected during Google Play review because:
- Interstitial ads appear before the "Continue" button in the testing flow (violating AdMob policy for accidental clicks)
- Rewarded ads don't have clear terms shown to the user before viewing
- IAP products don't match the store listing's "In-App Products" setup
- App lacks a privacy policy URL linked in the Play Console
- Ads SDK not declared in Play Console's "Ads" declaration

**Why it happens:** Google Play has become significantly stricter since 2024. Indie developers often skip the Play Console declarations, submit with test ads still configured, or don't realize that AdMob policies require clear disclosure and user-initiated ad viewing.

**Consequences:**
- App stuck in "In Review" for 3-14 days, then rejected
- Resubmission requires fixing + another review cycle (3-7 more days)
- If ads are shown to testing accounts that are set up as "testers" but the ads aren't in test mode, the AdMob account can be suspended
- Worst case: Developer account banned for policy violations

**Prevention:**
- **Ads declaration:** In Play Console → Policy → App Content → Ads, declare YES and link AdMob
- **Privacy policy:** Create a privacy policy that mentions ad serving and data collection (AdMob/Google). Host at a URL. Link in Play Console store listing and inside the app
- **Test ads FIRST:** Use `TestIds.INTERSTITIAL` and `TestIds.REWARDED` during development and testing. Switch to real Ad Unit IDs only when ready for production
- **IAP products:** Create ALL products (consumable and non-consumable) in Play Console BEFORE the release build. Product IDs must match exactly between code and Play Console
- **Rewarded ad flow:** Show a clear "Watch an ad for +1 extra guess?" dialog with confirm/cancel before showing the rewarded ad. This satisfies "user-initiated" policy
- **Interstitial placement:** Never auto-play interstitials. Show after a "Continue" or "Next" button press following game completion. 1-second delay minimum after button press before loading/interstitial
- **Content rating:** Complete the Play Console content rating questionnaire honestly. A word game is typically "Everyone," but the questionnaire must be filled out

**Detection:**
- Run through the Play Console "Production" pre-launch checklist
- Run the app through Google's internal test tracks (Closed/Open Testing) for at least 1-2 weeks before production
- Use the Play Console's policy checker

**Phase to address:** Phase 3 (Monetization) and Phase 6 (Distribution) — must be handled before any production release.

---

### Pitfall 4: Google Sign-In `DEVELOPER_ERROR` / Configuration Hell

**What goes wrong:** Google Sign-In fails silently or with `DEVELOPER_ERROR` (code 10) on actual devices despite the code being correct. Users cannot sign in, cannot access leaderboards, and cannot cloud-sync. The app appears broken.

**Why it happens:** The `@react-native-google-signin/google-signin` (v16.1.2) relies on the legacy Google Sign-In SDK on Android, which requires exact configuration alignment across:
1. Firebase project (linked to Play Console)
2. SHA-1 certificate fingerprint (must match the signing key used for the build)
3. Web client ID (from Firebase, not Android client ID — this is the most common mistake)
4. Play Console app signing key vs local upload key (if Play App Signing is enabled, the SHA-1 is different!)
5. OAuth consent screen must be configured (internal testing vs production)

**Consequences:**
- Debug builds work (because they use the debug keystore's SHA-1) but release builds fail
- Users on production can never sign in
- Developer spends days/weeks debugging configuration
- Many developers have abandoned Google Sign-In entirely due to this specific issue

**Prevention:**
- **Web Client ID is key:** In `GoogleSignin.configure()`, pass the **Web** client ID from the Firebase console (under "Web application" credentials), NOT the Android client ID. The Android SDK actually needs the Web client ID for token exchange
- **Three SHA-1 fingerprints:** Register THREE fingerprints in Firebase:
  - Debug keystore (`~/.android/debug.keystore`)
  - Upload key (your local `.jks` or `.keystore`)
  - Play App Signing key (from Play Console → Setup → App Integrity → App Signing)
- **Use `google-services.json`:** Download the latest `google-services.json` from Firebase and place it in `android/app/`
- **Verify OAuth:** Go to Google Cloud Console → APIs & Services → OAuth consent screen → Set to "External" and add test user emails during development
- **Test on physical devices:** The emulator often works when real devices don't
- **Enable ALL required APIs:** In Google Cloud Console, ensure the Android Management API and Play Integrity API are enabled for the project
- **Consider the premium version:** The README for `@react-native-google-signin/google-signin` explicitly recommends the premium "Universal Sign In" which includes a "Config Doctor" that diagnoses these exact issues

**Detection:**
- Run `adb logcat | grep -i "google\|signin\|auth"` during sign-in attempt
- Look for "DEVELOPER_ERROR" with code 10 (configuration) vs code 7 (network) vs code 12500 (play services)
- Test on a real device with the RELEASE build, not debug build
- Compare the SHA-1 in the `google-services.json` with the Play Console signing key

**Phase to address:** Phase 4 (Accounts & Cloud) — must be designed with configuration logging from day one; avoid making it the last thing before launch.

---

### Pitfall 5: Offline-First Data Corruption from Race Conditions

**What goes wrong:** Player finishes a game offline, the local stats are updated. Then they play another game. When the device comes back online, the sync logic overwrites the cloud stats with stale local data because both games happened offline and the sync triggers multiple times. Win rate goes to 0% or 200%. Streaks are wrong. Player rage-quits.

**Why it happens:** Cloud sync is implemented as "on connect, push local → pull cloud." But when multiple offline games complete before sync, the naive last-write-wins approach corrupts aggregated stats (win %, guess distribution) that should be merged, not overwritten.

**Consequences:**
- Player stats are permanently corrupted
- Leaderboard scores are incorrect (inflated or deflated)
- No way to recover from corruption without a "reset stats" button
- Player loses trust in the app's persistence

**Prevention:**
- **Use incremental updates, not full-state sync:** Instead of syncing "total games = 47, wins = 32," sync individual game results as events: `{type: "game_completed", won: true, guesses: 4, mode: "daily", timestamp: ..., localId: uuid}`. The cloud aggregates from events
- **Stateless sync operations:** Each sync operation is idempotent — replaying the same event doesn't double-count
- **Local-first with monotonic clock:** Use a local write-ahead log (SQLite via `react-native-quick-sqlite` or similar) — every game result is appended. Cloud sync reads from the log. Sync position (last synced event ID) is stored locally
- **Conflict resolution:** If local and cloud disagree, use timestamp + merge logic: win % is recalculated from total wins/total games, not "cloud stat + local diff"
- **Online/offline detector:** Use `@react-native-community/netinfo` with a debounced handler (2-second debounce minimum) to trigger sync, not on every connectivity change
- **Sync queue manager:** Serialize sync operations. Don't sync while a sync is in progress. Use a queue with retry (3 attempts + exponential backoff)

**Detection:**
- Test: Play 3 games offline, then come online. Verify stats match exactly
- Test: Play 1 game online, then 2 games offline. Verify all 3 are reflected correctly
- Test: Uninstall and reinstall, sign in. Verify stats restore correctly

**Phase to address:** Phase 4 (Accounts & Cloud) — the data model for game history must be designed for offline-first from the start.

---

## Moderate Pitfalls

### Pitfall 6: Interstitial Ads Showing at Wrong Time / Double Ad Loading

**What goes wrong:** Interstitial ads appear during gameplay (between guess and feedback animation), or two ads stack on top of each other because `load()` was called while a previous ad was already loaded. Players lose their game state.

**Why it happens:** Interstitial ads in `react-native-google-mobile-ads` require explicit `load()` → `show()` lifecycle. If `load()` is called in `useEffect` that fires multiple times (React Strict Mode, state changes), two ads load. The second `show()` fires while the first is showing, or both show in sequence causing the user to sit through two ads. If ad placement interrupts gameplay state, the game board state gets lost.

**Consequences:**
- Double ads shown per game completion (annoying, policy violation)
- Game state lost if ad navigates away before state is persisted
- Negative reviews citing "too many ads" even though the count is correct

**Prevention:**
- **Singleton ad manager:** Create a dedicated ad service module with a ref-counted ad loader. Track `isLoading` and `isLoaded` state per ad unit ID. Never call `load()` if `isLoading` is true
- **Lifecycle hooks:** Load the NEXT interstitial at game start (not after game ends). Pre-loading ensures the ad is ready when the game completes but doesn't block loading multiple ads
- **State persistence before show:** Save game state to AsyncStorage/SQLite BEFORE `interstitial.show()`. If the ad causes a navigation or resume issue, state is safe
- **Throttle load calls:** Wrap ad loading in a debounce or ref guard (`useRef(false)` for loading state)
- **Post-game flow:** Game complete → show results animation → button press "Continue" → show interstitial → return to menu. Never auto-show ads

**Detection:**
- Enable `AdEventType.AD_DID_LOAD` and `AdEventType.AD_DID_SHOW` event logging
- Check console logs for double load events
- Visual: count ad screens after game completion

**Phase to address:** Phase 3 (Monetization) — design the ad lifecycle manager before wiring up the first ad.

---

### Pitfall 7: IAP Product ID Mismatch / No Restore Purchases Flow

**What goes wrong:** Player purchases "Pro" IAP for $1.99. The purchase succeeds (Google Play shows the receipt). But the app never unlocks the Pro features. Or: player buys Pro, reinstalls the app, and there's no Restore Purchases button, so they're stuck with ads forever.

**Why it happens:** `react-native-iap` (v15.3.6) requires exact product ID matching between Play Console and code. A typo, extra space, or case mismatch means the purchase succeeds at the store level but the delivery logic in the app doesn't recognize it. Also, many developers implement purchase but forget the restore flow entirely.

**Consequences:**
- Player paid but didn't get the feature (worst-case: chargeback, refund request, negative review)
- Player reinstalls and has to pay again (refund request, 1-star review)
- Developer loses revenue from refunds and chargeback fees

**Prevention:**
- **Constant product IDs:** Define all product IDs as constants in a single file. Reference the constant everywhere. Never type a product ID string more than once.
  ```typescript
  export const PRODUCT_IDS = {
    PRO_UNLOCK: 'com.wordguess.pro.unlock',
  } as const;
  ```
- **Verify with Play Console:** The product ID must match EXACTLY what's in Play Console → Monetize → Products. Copy-paste from the console, don't retype
- **Implement restore flow:** Add a "Restore Purchases" button in the settings or on the Pro purchase screen. Call `getPurchases()` from `react-native-iap` to find previously purchased products
- **Deferred delivery pattern:** After purchase completes:
  1. Store purchase token locally (`AsyncStorage`)
  2. Verify with Google Play (via `getPurchaseHistory()` or a backend if wanted)
  3. Update app state (remove ads, show Pro badge)
  4. Handle edge case: purchase succeeds but state update crashes → on next app launch, check for stored purchase token
- **Test with real products:** Use Play Console's "License Testing" with a test account. Must use a real product in internal testing track, not a sandbox

**Detection:**
- Test purchase with a real Google Play test account
- Verify the Pro feature activates after purchase
- Uninstall, reinstall, restore purchases — verify Pro is active
- Check logs for `purchaseError` or unrecognized product IDs

**Phase to address:** Phase 3 (Monetization) — must include restore flow from the first IAP implementation.

---

### Pitfall 8: Large Dictionary Loading Blocking the JS Thread at App Start

**What goes wrong:** The app loads a large JSON dictionary (the source `dictionary.full.enriched.json` is ~5-10MB+). On app start, `require()` or `import` of this file blocks the JS thread for 2-5 seconds. The app appears frozen. Players see a white screen and may uninstall.

**Why it happens:** React Native loads JSON files synchronously by default. If the entire enriched dictionary (with definitions, synonyms, antonyms) is imported directly, it blocks the JS thread until parsing completes. On slower Android devices, this is very noticeable.

**Consequences:**
- 2-5 second blank screen on app launch
- ANR (Application Not Responding) if slow enough
- Players think the app is broken and uninstall
- Can't show a splash screen animation because the JS thread is blocked

**Prevention:**
- **Strip the dictionary at build time:** Create a build script that reads `dictionary.full.enriched.json`, filters to 5-10 letter words only, and outputs a clean `words.json` with just the word list (no definitions). This reduces file size by 80-90%
- **Lazy-load by word length:** Split the clean dictionary into 6 files: `words5.json`, `words6.json`, ..., `words10.json`. Load only the needed file when the player selects a word length
- **Use `react-native-mmkv` or SQLite:** For the daily challenge, load only the daily word (not the full dictionary). For free play, load the specific length list asynchronously
- **Async loading with splash screen:** Show a native splash screen (`react-native-splash-screen`), then load the initial dictionary chunk, then hide the splash
- **Build-time word index:** Pre-compute the daily challenge lookup at build time: `{date: "2026-07-04", word: "APPLE"}` for the next N years. Avoid runtime dictionary parsing entirely for the daily challenge

**Detection:**
- Profile JS thread with Flipper during app startup
- Look for a single long task (>500ms) during `require` or import
- Measure "time to interactive" (TTI) on a Moto G Power

**Phase to address:** Phase 1 (Core Game Data) — dictionary loading strategy must be designed before the game logic is built.

---

### Pitfall 9: Leaderboard Data Race — Score Submission Before Sign-In Completes

**What goes wrong:** Player finishes a Daily Challenge, the app tries to submit the score to the leaderboard, but Google Sign-In hasn't completed yet (user declined, network slow, token expired). The score is silently dropped. Player thinks their score was submitted but it never appears on the leaderboard.

**Why it happens:** Score submission is triggered immediately after game completion without checking auth state. The `GoogleSignin.isSignedIn()` check returns false or stale, the submission silently fails, and the code doesn't queue the score for later submission.

**Consequences:**
- Daily Challenge scores don't appear on leaderboard
- Player frustration: "I got a 3/6 on the daily and the leaderboard says I've never played"
- Endless mode streaks don't sync
- No recovery path for the dropped score

**Prevention:**
- **Auth gate:** Before submitting any score, verify `GoogleSignin.isSignedIn()` and `GoogleSignin.getCurrentUser() !== null`. If not signed in, store the score locally with a `pendingSubmission: true` flag
- **Deferred score queue:** Maintain a local queue of unsent scores. On sign-in (or next app launch with valid session), drain the queue. Each submission has a `localId` + `scoreData` + `timestamp`
- **Leaderboard submission retry:** Implement retry with exponential backoff (3 attempts: 1s, 5s, 30s) before giving up and marking as failed
- **Visible sync status:** Show a subtle indicator in the leaderboard screen: "Syncing..." icon or "Last synced: 2m ago"
- **Re-authentication on token expiry:** `GoogleSignin.getTokens()` can refresh tokens; handle failures gracefully with a "Sign in to see leaderboards" prompt instead of a silent failure

**Detection:**
- Turn off network, play a game, turn on network, check leaderboard
- Sign out, play a game, sign back in, check leaderboard
- Let auth token expire (30-60 days), verify re-auth flow

**Phase to address:** Phase 4 (Accounts & Cloud) — the score submission pipeline must handle offline, unauthenticated, and token-expired states.

---

### Pitfall 10: Animating Tile Colors / Keyboard Updates During Reconciliation

**What goes wrong:** When tiles reveal with color feedback, the on-screen keyboard also updates key colors simultaneously. React batches the state updates, causing the keyboard row re-renders to interfere with the tile animations. The keyboard visibly "flickers" or tiles stutter.

**Why it happens:** Both the game board tiles and the keyboard are in the same component tree. When a guess is submitted, state updates propagate to both the tile color array and the keyboard color map. If both trigger re-renders in the same JS frame, React reconciles both subtrees, causing dropped animation frames.

**Consequences:**
- Keyboard flickers during the "satisfying" tile reveal animation
- Animations feel unpolished — defeats the purpose of the Wordle experience
- Players on slower devices see the tile color flash before the flip animation completes

**Prevention:**
- **Separate component trees:** Isolate the keyboard as a distinct subtree (or use `React.memo` with a stable color map reference that only updates after the animation completes)
- **Delayed keyboard update:** After the last tile reveal animation completes, THEN update the keyboard colors. Use a 300-600ms delay (matching the reveal animation duration)
- **Use `useLayoutEffect` with care:** If keyboard colors must update synchronously, use `useLayoutEffect` for the color map update, but ensure the keyboard component is `React.memo`'d with shallow comparison
- **Reanimated shared values:** Use `useSharedValue` for tile colors and keyboard colors separately — they update on the UI thread and don't trigger React re-renders
- **Animate tiles, snap keyboard:** Animate each tile sequentially (50ms stagger), snap the keyboard key colors at the end with `withDelay(animationDuration)`

**Detection:**
- Profile with "React DevTools" → "Profile" tab during guess submission
- Look for excessive re-renders of the keyboard component during the animation
- Visual: record slow-motion video and check for keyboard flicker

**Phase to address:** Phase 1 or Phase 2 (Core Gameplay) — component architecture must separate board and keyboard to prevent this.

---

### Pitfall 11: Ignoring Android Back Button / System Navigation Behavior

**What goes wrong:** Player presses the Android back button during an animation sequence, during an interstitial ad, or while a purchase is processing. The app navigates unexpectedly: the game state is lost, the ad closes but the app doesn't resume correctly, or the IAP transaction is interrupted leaving the app in a stuck state.

**Why it happens:** React Native's default back button handling navigates backwards through the navigation stack. But during gameplay, animations, ads, or purchases, there's no navigation stack to go back to — or going back corrupts the game state. The developer didn't handle these edge cases.

**Consequences:**
- Game state corruption (half-revealed tiles, incomplete animation)
- IAP transaction stuck in "processing" limbo
- Ad partially shown, double-ad on next game
- Negative UX — feels broken

**Prevention:**
- **Override Android back button** during:
  - Tile reveal animation (block back during animation sequence)
  - Ad display (block back during interstitial; rewarded ads handle their own back)
  - IAP purchase flow (block back, show "Purchase in progress" dialog)
- **Use `BackHandler` from `react-native`:** Add and remove listeners per screen/state
  ```typescript
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAnimating || isPurchaseInProgress) return true; // block
      // else allow default behavior
      return false;
    });
    return () => backHandler.remove();
  }, [isAnimating, isPurchaseInProgress]);
  ```
- **Graceful exit during animation:** If back is pressed during animation, skip to the final state instantly, then navigate. Don't leave tiles half-revealed
- **IAP safety:** Wrap IAP calls in try/catch and handle cancellation events from Google Play's purchase dialog

**Detection:**
- Physical test: press back button during every app state
- Physical test: press back during interstitial ad
- Physical test: press back during IAP purchase flow

**Phase to address:** Phase 1 (Core Navigation) and Phase 3 (Monetization) — back handler must be part of the initial navigation design.

---

## Minor Pitfalls

### Pitfall 12: Hard Mode Logic Errors — Forgetting Forced Tile Reuse

**What goes wrong:** In Hard Mode, the player must reuse confirmed green (correct position) and yellow (correct letter, wrong position) tiles in their next guess. The validation logic is buggy: it doesn't force yellow tile reuse, doesn't prevent placing a green tile in a different position, or allows guesses with fewer green tiles than required.

**Why it happens:** Hard Mode validation requires checking four conditions:
1. All green tiles from previous guess must be in the same positions
2. All yellow tiles from previous guess must appear somewhere in the new guess
3. The new guess must be a valid word in the dictionary
4. The new guess must be `letterCount` characters long

Condition 2 is the trickiest — developers often check that the letter is present somewhere but don't handle duplicates correctly. E.g., if the word is "SPOOL" and the guess is "SPOON", the second 'O' in a position other than the third is yellow. The next guess must contain 'S', 'P', 'O' (but where?), and 'O' again — duplicate letters add complexity.

**Consequences:**
- Hard Mode is buggy — player can cheat or can't make valid guesses
- Daily Challenge leaderboard has two tiers (Normal/Hard), but buggy hard mode invalidates the leaderboard
- Players complain on Reddit, the bug gets public attention
- Requires a forced update to fix

**Prevention:**
- **Implement Wordle's exact hard mode spec:** Study the NYT Wordle hard mode rules carefully. Write unit tests for every edge case:
  - Single duplicate letter (e.g., "SPOON", O appears twice)
  - Multiple duplicates
  - All greens (no yellows)
  - Mixed greens and yellows for the same letter (e.g., letter is green in pos 2, yellow in pos 4)
- **Test-driven Hard Mode:** Write the hard mode validation function with 20+ edge case tests before integrating it into the game
- **Test with a known word list:** Use the same dictionary words as game words and test every valid 5-letter word as a guess against every 5-letter answer

**Detection:**
- Unit test the validation function with known Wordle challenge cases
- Play Hard Mode for 50+ games looking for false positives (invalid guess accepted) and false negatives (valid guess rejected)
- Compare behavior with the original NYT Wordle hard mode

**Phase to address:** Phase 2 (Core Gameplay) — Hard Mode logic must be thoroughly tested before the first leaderboard data is collected.

---

### Pitfall 13: AsyncStorage for Game State Instead of SQLite

**What goes wrong:** Game state grows large (game history, stats, sync queue, ad preferences). `@react-native-async-storage/async-storage` reads/writes take 100-500ms per operation because the entire store is serialized/deserialized per key. On app startup, loading the full game state causes a UI freeze. Or: data corruption from concurrent writes when multiple state updates fire rapidly.

**Why it happens:** AsyncStorage is a simple key-value store. It's fast for small values (<10KB) but serializes to a single file on Android. Reading game history (100+ games) as a JSON blob of 50KB+ causes noticeable lag. Concurrent writes can corrupt data since AsyncStorage isn't ACID-compliant.

**Consequences:**
- App freezes on startup for 1-2 seconds loading game history
- Rare but possible data corruption from rapid writes
- Cannot do partial updates (e.g., add one game to history) without loading/editing/saving the entire history array
- Sync queue complexity is hard to manage without transactions

**Prevention:**
- **Use SQLite:** `react-native-quick-sqlite` or `expo-sqlite` for structured game data. SQLite provides ACID transactions, partial updates, and fast queries
- **Data model split:**
  - `settings` (AsyncStorage or MMKV — simple KV) — ad preferences, sound settings, Hard Mode toggle
  - `game_history` (SQLite table) — one row per completed game: `id, mode, word, guesses, won, date, timestamp`
  - `sync_queue` (SQLite table) — pending sync events: `id, event_type, payload, created_at, retries`
  - `stats` (computed from SQLite queries or cached) — win %, streak, guess distribution
- **Use `react-native-mmkv` for fast KV storage:** 30x faster than AsyncStorage for settings/preferences. Doesn't block the JS thread
- **Write-ahead log for sync:** Each game completion appends a row to the sync queue table. On sync, read un-synced rows, submit them, mark as synced. No data corruption possible

**Detection:**
- Profile read/write times of `AsyncStorage.getItem` and `setItem`
- If loading game state takes >200ms, it's too slow
- Test concurrent writes (rapidly complete 5 games) and check for data loss

**Phase to address:** Phase 1 (Data Architecture) — choose the storage engine before writing any persistence code.

---

### Pitfall 14: Not Handling the "No Internet on First Launch" Case

**What goes wrong:** User downloads the app, opens it, and has no internet connection. The daily word can't be fetched (if designed as API-based), or the ad SDK crashes because it can't initialize, or Google Sign-In fails. The app shows a white screen, an error, or crashes.

**Why it happens:** The developer assumed network is always available. Daily challenge word generation is local (from seed + date), but ads, sign-in, and leaderboard code often assume connectivity and crash when it's missing.

**Consequences:**
- First impression is a crash or error
- Player uninstalls before even playing a game
- Negative Play Store review: "Doesn't work offline"
- Lost player forever

**Prevention:**
- **Design for offline-first from day one:**
  - Daily word: generated locally from seed + date in JS. Never requires network.
  - Ad SDK: initialize gracefully. `react-native-google-mobile-ads` has a `start()` that returns a promise. If it fails, set `adsEnabled = false` and don't retry until next app launch
  - Google Sign-In: show "Sign in to enable leaderboards" button, not an auto-sign-in that fails silently
  - Game state: all local. Sync is background.
- **Startup sequence:**
  1. Show splash screen immediately
  2. Load local word dictionary or daily word (offline path)
  3. Initialize ad SDK (fire-and-forget; don't block on it)
  4. Check connectivity → show UI
  5. If online, attempt sign-in silently (don't block)
  6. If offline, hide sign-in/leaderboard UI elements
- **Graceful degradation:**
  - No ads? Game plays without ads (just no revenue that session)
  - No sign-in? Leaderboard shows "Sign in to play" message
  - No leaderboard? Core game loop is unaffected

**Detection:**
- Turn on Airplane Mode
- Fresh install the app
- Verify everything works without a network
- Verify the daily challenge word is available

**Phase to address:** Phase 1 (App Shell) — offline-first startup must be the default from the first build.

---

### Pitfall 15: Daily Challenge UTC Date Boundary Ambiguity

**What goes wrong:** The daily challenge resets at midnight UTC. But if the app retrieves `new Date().toISOString()` on the device, the date might differ from the server's date or another player's device. Players see different daily words because their device clocks are wrong. Or: the daily word doesn't change at the expected time because the app caches the "current word" based on local time.

**Why it happens:** The daily word is derived from `dateString + seed`. If one player's device clock is 5 minutes off from another's, and the daily reset happens at exactly midnight UTC, the `dateString` computation might differ during the 5-minute window around midnight UTC.

**Consequences:**
- Two players in different time zones see different words during the UTC midnight transition window
- Players whose device clocks are wrong see different words
- Leaderboard submission fails because the submitted word doesn't match the expected daily word
- Trust in the daily challenge is broken

**Prevention:**
- **Always use UTC:** Use a library like `dayjs` with `utc` plugin or `date-fns-tz`. Convert the current time to UTC.
  ```typescript
  const getDailyDateString = (): string => {
    const now = new Date();
    // Normalize to UTC
    const utcDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    return utcDate.toISOString().split('T')[0]; // "2026-07-04"
  };
  ```
- **Handle device clock skew:** If the device clock is >30 minutes off from the expected time (e.g., from an NTP check), fall back to using the cloud API time on first internet-connected request, or warn the user
- **Cache the current word:** Store the current daily word + the date string it was computed from. On subsequent app opens, recompute from today's date. If it matches the stored word, use it. If not (time zone change), use the recomputed word
- **Test around UTC midnight:** Programmatically test the transition by setting the device clock to 23:59 UTC, then advancing to 00:01 UTC. Verify the daily word changes exactly at the boundary
- **Grace period:** Accept both today's and yesterday's words for 30 minutes after midnight UTC (for leaderboard submissions), to handle clock skew

**Detection:**
- Unit test: compute daily word for every day in 2026-2027, check for duplicate words
- Integration test: set device clock to 23:58 UTC, app shows word A. Advance to 00:02 UTC, app shows word B
- Multi-device test: two devices at the same UTC time should show the same word

**Phase to address:** Phase 2 (Daily Challenge) — date handling must be correct from the first daily puzzle implementation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Data/Dictionary** | Loading full enriched dictionary blocks startup (Pitfall 8) | Strip to clean words at build time; lazy load by length |
| **Phase 1: App Shell** | No offline-first startup path (Pitfall 14) | Build startup sequence with graceful degradation; ad SDK init is fire-and-forget |
| **Phase 2: Animations** | Tile animations on JS thread (Pitfall 1) | Use Reanimated with UI thread animations from day one |
| **Phase 2: Animations** | Keyboard flicker during tile reveals (Pitfall 10) | Separate component trees; delayed keyboard color update |
| **Phase 2: Daily Challenge** | Seed exposed via APK decompilation (Pitfall 2) | Obfuscate seed; split across native layers; enable ProGuard |
| **Phase 2: Daily Challenge** | UTC date boundary issues (Pitfall 15) | Normalize to UTC; handle clock skew; cache daily word |
| **Phase 2: Hard Mode** | Forced tile reuse logic bugs (Pitfall 12) | Unit test with 20+ edge cases before integrating |
| **Phase 3: Ads** | Double ad loading / wrong placement (Pitfall 6) | Singleton ad manager; load at game start, show on completion |
| **Phase 3: IAP** | Product ID mismatch / no restore flow (Pitfall 7) | Centralized product ID constants; implement restore from day one |
| **Phase 4: Google Sign-In** | DEVELOPER_ERROR from SHA-1 / config mismatch (Pitfall 4) | Register 3 SHA-1 fingerprints; use Web client ID; test release builds |
| **Phase 4: Cloud Sync** | Offline data corruption (Pitfall 5) | Event-based sync; idempotent operations; write-ahead log |
| **Phase 4: Leaderboards** | Score submission before sign-in completes (Pitfall 9) | Deferred score queue; retry with backoff; visible sync status |
| **Phase 5: State Persistence** | AsyncStorage for game state instead of SQLite (Pitfall 13) | Use SQLite for structured data; MMKV for settings |
| **Phase 6: Play Store** | Missing ad / IAP compliance declarations (Pitfall 3) | Privacy policy URL; test ads in internal track; complete declarations |
| **Any Phase** | Android back button not handled (Pitfall 11) | BackHandler listener per screen/state; block during animations/purchases |

## Sources

- npm registry (`npm view`) for React Native 0.86.0, Reanimated 4.5.1, IAP 15.3.6, Google Sign-In 16.1.2, Google Mobile Ads 16.4.0 — package versions and peer dependencies [VERIFIED]
- `@react-native-google-signin/google-signin` README — mentions legacy SDK, premium version, config doctor [VERIFIED]
- `react-native-google-mobile-ads` README — ad format docs, test IDs, New Architecture status [VERIFIED]
- React Native community knowledge: JS thread vs UI thread animations, AsyncStorage performance characteristics, offline-first patterns [ASSUMED — based on established RN community patterns, not verified in this session]
- Google Play Console policy requirements for ads and IAP [ASSUMED — based on current known Play Store policies; policies change frequently]
- Wordle hard mode edge cases documented by Wordle community [ASSUMED — based on known Wordle clone implementation challenges]
- `react-native-reanimated` peerDependencies require `react-native-worklets` 0.10.x [VERIFIED]
- `react-native-iap` peerDependencies require `react-native-nitro-modules` ^0.35.0 [VERIFIED]