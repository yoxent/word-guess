# dictionary-preprocessing
updated: 2026-07-04
tags: [dictionary, preprocessing, build-tools, metro]
related: [phase-structure, tech-stack, key-risks]

## Source data
- File: `dictionary.full.enriched.json` (3.4MB after compression, 34MB raw)
- Format: JSON with per-word definitions, synonyms, antonyms
- 12,319 words total across lengths 5-10 (after cleanup)

## Build-time script
- Location: `scripts/preprocess-dictionary.mjs`
- Input: `dictionary.full.enriched.json`
- Output: 6 files at `assets/dictionary/{5,6,7,8,9,10}.json`
- Each file: flat JSON array of uppercase word strings only

## Clean filter (applied during preprocessing)
| Filter | Description |
|--------|-------------|
| Length | 5-10 letters only (3-4 and 11+ removed) |
| Offensive/slur words | Blocklist-based removal |
| Proper nouns | Capitalized non-first-letter words stripped |
| Archaic/obscure | Flagged by dictionary metadata |
| Definitions | Stripped entirely — game doesn't need them |

## Word count after cleanup
| Length | Count |
|--------|-------|
| 5 | ~2,540 |
| 6 | ~2,588 |
| 7 | ~2,439 |
| 8 | ~2,105 |
| 9 | ~1,602 |
| 10 | ~1,045 |
| Total | ~12,319 |

## Git strategy
- Source `dictionary.full.enriched.json` and generated `assets/dictionary/*.json` both ignored
- Regenerated via `"postinstall": "node scripts/preprocess-dictionary.mjs"` in package.json
- Migration path: switching to committed files is a 2-min change (rm .gitignore entry, git add, remove postinstall)
- Initial generation: run script manually first to verify, then add to .gitignore
- New clones obtain source file separately (not in repo)

## Metro bundler constraint (CRITICAL)
Metro cannot:
1. Resolve `@/` path aliases (tsconfig paths are TypeScript-only)
2. Bundle dynamic `require()` with template literals

**Correct approach:** Static `require()` with relative paths pre-imported at module level:
```typescript
// Correct — Metro bundles static require() at build time
const wordList5: string[] = require('../../assets/dictionary/5.json');
const wordList6: string[] = require('../../assets/dictionary/6.json');
// ... all 6 lengths pre-imported

const WORD_LISTS: Record<number, string[]> = { 5: wordList5, 6: wordList6, ... };

// In store — synchronous access, no loading states
getWordList: (length) => WORD_LISTS[length] || [],
isValidWord: (length, word) => new Set(WORD_LISTS[length]).has(word.toUpperCase()),
```

**Why this works:**
- Static require path is a string literal → Metro bundles at build time
- All word lists bundled into APK (~150KB total compressed, negligible)
- Synchronous access — no async loading, no race conditions
- Word sets for O(1) lookup created once per call (tiny lists)

**Wrong (will crash):
```typescript
const words = require(`@/assets/dictionary/${length}.json`); // Metro crash
```
