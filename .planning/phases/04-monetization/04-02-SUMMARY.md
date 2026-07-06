---
phase: 04-monetization
plan: 02
type: execute
wave: 2
subsystem: settings
tags: [monetization, iap, restore, purchase, settings-ui]
dependency-graph:
  depends-on: [04-01]
  consumed-by: [04-03]
tech-stack: [react-native, typescript, react-native-iap, zustand]
key-files:
  - src/config/ui.ts
  - src/components/ui/SettingsRow.tsx
  - src/screens/SettingsScreen.tsx
  - src/constants/config.ts
decisions:
  - "Use callback prop pattern for restore/purchase actions (no native module imports in row component)"
  - "Use useMemo with isPro dependency for config filtering and pro status override"
  - "Use project-scoped colors (tileCorrect/danger) for toast backgrounds"
metrics:
  duration_seconds: ~400
  files_changed: 4
  commits: 3
status: completed
---

# Phase 04 — Plan 04-02 SUMMARY: Restore Purchases & Pro Purchase Flow

## Objective

Add a Restore Purchases flow to Settings, extend the UI configuration registry with new `restore`/`purchase` row types, populate the Account section with Pro status and price info, and implement the full purchase lifecycle via `react-native-iap`.

## Tasks Executed

| # | Task | Type | Hash |
|---|------|------|------|
| 1 | Extend Settings UI config with restore type and Account section rows | `auto` | `16406a5` |
| 2 | Implement restore row rendering, restore logic, and toast feedback | `auto` | `1b258b6` |
| 3 | Implement Pro purchase flow with purchaseUpdatedListener | `auto` | `08f7c03` |

## Files Changed

- `src/config/ui.ts` — Extended `SettingsRowConfig` union with `restore` and `purchase` types; populated Account section with proStatus info, purchase row, and restore button
- `src/components/ui/SettingsRow.tsx` — Added `RestoreRow` and `PurchaseRow` components; added `onRestore`/`onPurchase` props; added `purchaseDescription` and `purchasePrice` styles
- `src/screens/SettingsScreen.tsx` — Complete rewrite: `isPro` read, `handleRestore` via `getAvailablePurchases()`, `handlePurchase` via `requestPurchase()`, `purchaseUpdatedListener`, toast feedback, config filtering, dynamic pro status override
- `src/constants/config.ts` — Added `proProductId: 'com.vorithstudio.wordguess.pro'`

## Commits

```
16406a5 feat(04-monetization): extend SettingsRowConfig with restore/purchase types and Account section
1b258b6 feat(04-monetization): implement restore purchases row with toast feedback
08f7c03 feat(04-monetization): implement Pro purchase flow with purchaseUpdatedListener
```

## Deviations

**Rule 1 — Auto-fix bug (Task 3):** `react-native-iap` v15 uses a new `requestPurchase` signature. The initial implementation used `{ skus: [productId] }` which caused TS error. Fixed to use the v15 API:
```typescript
requestPurchase({
  request: {
    google: { skus: [productId] },
    apple: { sku: productId },
  },
  type: 'in-app',
})
```
Commit squashed into Task 3 to keep atomic history.

## Auth Gates

None.

## Known Stubs

None.

## Threat Surface Scan

No security-relevant surface beyond what the plan's `<threat_model>` documents:
- **T4-04** (Tampering - Restore purchases): Accepted — client-side only for MVP
- **T4-05** (Information Disclosure - Pro status toast): Accepted — no PII exposed

## Verification Results

- TypeScript compilation: ✅ `npx tsc --noEmit` passes with no errors
- No staged files remaining: ✅
- All 4 files changed as specified: ✅
- Git history clean with 3 atomic commits: ✅

## Success Criteria

- [x] SettingsRowConfig union includes `restore` and `purchase` types
- [x] Account section has pro status info, purchase row, restore row
- [x] 'Remove Ads · $1.99' row is type `purchase`, calls `requestPurchase` on tap
- [x] `purchaseUpdatedListener` handles product ID match, `finishTransaction`, `setPro(true)`
- [x] Restore button hidden when `isPro === true`
- [x] Purchase row hidden when `isPro === true`
- [x] Restore calls `getAvailablePurchases()` and checks for product ID
- [x] Color-coded toast on success (green) / failure (red)
- [x] `config.ts` exports `proProductId` constant
- [x] TypeScript compiles without errors

## Self-Check: PASSED

All files verified present and commits confirmed in git history.
