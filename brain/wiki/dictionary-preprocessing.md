# dictionary-preprocessing
updated: 2026-07-05 (case sensitivity fix)
tags: [dictionary, preprocessing, build-tools, metro]
related: [tech-stack, architecture, game-modes, daily-seed, phase-structure, key-risks]

## Two-tier dictionary system
Two source files, both preprocessed into three output files per length:

| Source | Format | Purpose |
|--------|--------|---------|
| `dictionary.full.enriched.json` | `{word,definition,synonyms,antonyms}[]` | Target word selection + definitions (curated, ~12K words) |
| `dictionary.full.json` | `string[]` | Player guess validation (broader, ~184K words) |

**Cross-check:** All enriched words are subset of full.json — every target word is also a valid guess.

## Source file cleanup (2026-07-04)
- 3-4 letter entries removed from both files (not used in game)
- 1,455 blocklisted words removed from full.json
- Enriched.json had 0 blocklisted words (already clean)

## Blocklist
Two text files in project root, filtered to 5-10 letter words only:
- `profanity-blocklist.txt` — 2,617 entries (profanity, slurs)
- `manual-blocklist.txt` — 976 entries (proper nouns, names, brands, non-English)

Preprocessing script reads both files and applies combined filter.

## Build-time script
- Location: `scripts/preprocess-dictionary.mjs`
- Trigger: `"postinstall": "node scripts/preprocess-dictionary.mjs"` in package.json
- Inputs: enriched.json, full.json, profanity-blocklist.txt, manual-blocklist.txt

## Output files (18 total, all at `assets/dictionary/`)

| Output | Source | Format | Use |
|--------|--------|--------|-----|
| `{N}.json` | enriched.json | `string[]` of words | Target word selection (Free Play, Random, Daily) |
| `valid-{N}.json` | full.json | `string[]` of words | Player guess validation (isValidWord) |
| `defs-{N}.json` | enriched.json | `Record<string,string>` | Word definition lookup (Result modal) |

All output files in `.gitignore` — regenerated on postinstall. 6 lengths × 3 files = 18 JSON files.

**Preprocessing script** (`scripts/preprocess-dictionary.mjs`) produces all 18 files in one pass:
1. Reads `dictionary.full.json` (flat word array) → filter by length + blocklist → `valid-{N}.json`
2. Reads `dictionary.full.enriched.json` (objects with word+definition) → extract words → `{N}.json`, extract defs → `defs-{N}.json`
3. Both blocklist txt files read at build time, not at runtime — words removed from all outputs
4. Blocklist entries filtered to 5-10 letters only; case-insensitive matching

## Metro bundler constraint (CRITICAL)
Static `require()` with relative paths only. No dynamic require, no `@/` alias:

```typescript
// Correct — Metro bundles static require() at build time
const wordList5: string[] = require('../../assets/dictionary/5.json');
const valid5: string[] = require('../../assets/dictionary/valid-5.json');
const defs5: Record<string, string> = require('../../assets/dictionary/defs-5.json');

// In dictionaryStore:
isValidWord → check valid-{N}.json (broader list, permissive)
getRandomWord → pick from {N}.json (curated list, clean)
```

## Case sensitivity (critical)
All JSON output files store words in **lowercase**. Lookups must use `.toLowerCase()` to match.

| File | Stored Case | Lookup Method | Reason |
|------|-------------|---------------|--------|
| `{N}.json`, `valid-{N}.json` | lowercase | `.toLowerCase()` | Preprocessing script uses `.toLowerCase().trim()` on all words |
| `defs-{N}.json` | UPPERCASE keys | `.toUpperCase()` | Definition map keys are uppercased for quick direct access |

**Bug history:** P14-era fix (2026-07-05) — `isValidGuess`/`isValidWord` in dictionaryStore used `.toUpperCase()` against lowercase lists, causing all guesses to fail as "Not in word list". Fixed by changing to `.toLowerCase()`.

## Word counts after Phase 2 preprocessing
| Length | Target (enriched) | Valid guesses (full) | Definitions |
|--------|-------------------|---------------------|-------------|
| 5 | 2,540 | 11,965 | 2,540 |
| 6 | 2,588 | 21,678 | 2,588 |
| 7 | 2,439 | 32,639 | 2,439 |
| 8 | 2,105 | 40,257 | 2,105 |
| 9 | 1,602 | 41,044 | 1,602 |
| 10 | 1,045 | 35,781 | 1,045 |
| **Total** | **12,319** | **183,364** | **12,319** |

Blocklist: 3,597 unique entries (2,767 profanity + 826 manual + 18 hardcoded fallback), applied to both enriched and full outputs.

## Endless mode pool
Endless target = valid guess pool **minus today's daily words** (1 per length, max 6). Same-day exclusion only — daily words return to pool next UTC day.
