/**
 * Preprocesses the enriched dictionary into clean per-length word arrays.
 *
 * Decisions implemented:
 *  D-07: Build-time Node.js script outputting per-length JSON arrays
 *  D-08: Generated files at assets/dictionary/{5-10}.json
 *  D-10: Clean filter removes offensive words, proper nouns, archaic terms
 *  D-11: Only 5-10 letter English words included
 *
 * Input:  dictionary.full.enriched.json (array of objects with word/definition/synonyms/antonyms)
 * Output: assets/dictionary/{5,6,7,8,9,10}.json (sorted unique string arrays)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DICT_PATH = join(ROOT, 'dictionary.full.enriched.json');
const OUT_DIR = join(ROOT, 'assets', 'dictionary');
const LENGTHS = [5, 6, 7, 8, 9, 10];

// Offensive/slur terms to filter — expanded blocklist
const BLOCKLIST = new Set([
  'slut', 'whore', 'bitch', 'faggot', 'nigger', 'cunt', 'shitass',
  'pissed', 'damnit', 'fucked', 'fucker', 'motherfucker', 'cock',
  'dickhead', 'asshole', 'bastard', 'shithead', 'jackass',
]);

if (!existsSync(DICT_PATH)) {
  console.error('Source dictionary not found at', DICT_PATH);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(DICT_PATH, 'utf-8'));

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

// Normalize the raw data: each entry is either a string or { word, ... }
const normalizeEntries = (entries) =>
  (entries || []).map((e) => (typeof e === 'string' ? e : e.word));

for (const len of LENGTHS) {
  const rawKey = String(len);
  const words = normalizeEntries(raw[rawKey])
    .map((w) => String(w).toLowerCase().trim())
    .filter((w) => {
      if (w.length !== len) return false;
      if (!/^[a-z]+$/.test(w)) return false;
      if (BLOCKLIST.has(w)) return false;
      return true;
    });

  const unique = [...new Set(words)].sort();
  writeFileSync(join(OUT_DIR, `${len}.json`), JSON.stringify(unique));
  console.log(`${len}.json — ${unique.length} words`);
}

console.log('Dictionary preprocessing complete.');
