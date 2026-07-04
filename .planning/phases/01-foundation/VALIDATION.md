# Phase 1: Foundation - Validation

**Validated:** 2026-07-04
**Phase:** 1-Foundation
**Requirements:** FOUND-01 through FOUND-06

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (via Expo Jest preset) |
| Quick run | `npx jest --passWithNoTests` |
| Full suite | `npx jest --coverage` |
| Config | `jest.config.js` in project root |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| FOUND-01 | Expo project exists with TypeScript | smoke | `npx tsc --noEmit` | n/a |
| FOUND-01 | Directory structure matches type-based layout | smoke | `test -d src/screens && test -d src/components ...` | n/a |
| FOUND-02 | Dictionary files exist per length (5-10) | unit | `test -f assets/dictionary/5.json` etc. | n/a |
| FOUND-02 | Dictionary only contains 5-10 letter words | unit | Validate lengths in each JSON file | `__tests__/dictionary.test.ts` |
| FOUND-02 | No offensive/slur words in dictionary | unit | Check against blocklist | `__tests__/dictionary.test.ts` |
| FOUND-03 | Color palette constants exported correctly | unit | Import colors module, check structure | `__tests__/colors.test.ts` |
| FOUND-04 | All TypeScript types compile without errors | unit | `npx tsc --noEmit` | n/a |
| FOUND-04 | Type shapes match data models | unit | Type-level tests | `__tests__/types.test.ts` |
| FOUND-05 | Navigation registers all 6 routes | integration | grep screen registrations in Navigation.tsx | n/a |
| FOUND-05 | Header nav button present on 3+ screens | integration | grep headerRight in Navigation.tsx | n/a |
| FOUND-06 | MMKV storage works (settings store) | unit | Write/read settings, verify roundtrip | `__tests__/storage.test.ts` |
| FOUND-06 | SQLite game history table created | unit | Query table schema | `__tests__/storage.test.ts` |
| FOUND-06 | AsyncStorage stores auth tokens | unit | Write/read token, verify roundtrip | `__tests__/storage.test.ts` |

### Wave 0 Test Gaps

- [ ] `__tests__/dictionary.test.ts` — validates word lengths, offensive word filter
- [ ] `__tests__/colors.test.ts` — verifies color palette constants
- [ ] `__tests__/types.test.ts` — type-level validation of data models
- [ ] `__tests__/storage.test.ts` — integration tests for MMKV, SQLite, AsyncStorage

## Validation Strategy

### Wave 1 (Plan 01-01) Validation
- Scaffold validation: `npx tsc --noEmit` must pass
- Directory structure: verify all directories exist
- TypeScript types: compile check + type-level tests
- Color palette: unit test that exports match expected shape
- Dictionary: validate per-length files exist, word lengths correct, no offensive words

### Wave 2 (Plan 01-02) Validation
- Storage service: integration tests for MMKV/SQLite/AsyncStorage wrappers
- Zustand stores: verify store creation, state updates, persist middleware

### Wave 2 (Plan 01-03) Validation
- Navigation: verify all 6 routes registered
- Screen placeholders: each screen renders without errors
- Nav menu button: present on 3+ non-game screens
- App entry: App.tsx renders NavigationContainer

## Validation Gates

| Gate | Check | Blocks |
|------|-------|--------|
| TypeScript compile | `npx tsc --noEmit` | Execution |
| Dictionary integrity | All lengths present, no offensive words | Execution |
| Storage roundtrip | MMKV/SQLite write-then-read | Merge |

## Verification Status

- **Phase 1 Verification:** Pending (planned)
- **Automated Tests:** Pending (Wave 0)
- **Manual Checks:** None required for Phase 1
