/**
 * Preprocesses dictionaries into per-length output files for Metro bundling.
 *
 * Inputs:
 *   - dictionary.full.enriched.json — Array of objects { word, definition, ... } per length key
 *   - dictionary.full.json          — Array of word strings per length key
 *   - profanity-blocklist.txt       — Line-delimited profanity blocklist
 *   - manual-blocklist.txt          — Line-delimited manual blocklist (proper nouns, brands, etc.)
 *
 * Outputs (per length 5-10):
 *   - assets/dictionary/{N}.json        — Target words from enriched.json (existing)
 *   - assets/dictionary/valid-{N}.json  — Valid guess words from full.json (NEW)
 *   - assets/dictionary/defs-{N}.json   — Definition maps from enriched.json (NEW)
 *
 * D-07: Build-time Node.js script
 * D-08: Generated files at assets/dictionary/{5-10}.json
 * D-10: Blocklist filter removes offensive words, proper nouns, archaic terms
 * D-11: Only 5-10 letter English words included
 * D-48/D-49: Dual-source dictionary output
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENRICHED_PATH = join(ROOT, 'dictionary.full.enriched.json');
const FULL_PATH = join(ROOT, 'dictionary.full.json');
const PROFANITY_BLOCKLIST_PATH = join(ROOT, 'profanity-blocklist.txt');
const MANUAL_BLOCKLIST_PATH = join(ROOT, 'manual-blocklist.txt');
const OUT_DIR = join(ROOT, 'assets', 'dictionary');
const LENGTHS = [5, 6, 7, 8, 9, 10];

// Fallback hardcoded blocklist (kept from original for additional safety)
const HARDCODED_BLOCKLIST = new Set([
  'slut', 'whore', 'bitch', 'faggot', 'nigger', 'cunt', 'shitass',
  'pissed', 'damnit', 'fucked', 'fucker', 'motherfucker', 'cock',
  'dickhead', 'asshole', 'bastard', 'shithead', 'jackass',
]);

// ── Blocklist loading ──

function readBlocklist(filePath, label) {
  if (!existsSync(filePath)) {
    console.warn(`[WARN] ${label} not found at ${filePath}, skipping`);
    return [];
  }
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return false;
      // Only keep 5-10 letter entries for our word lengths
      if (line.length < 5 || line.length > 10) return false;
      return true;
    });
}

function loadBlocklist() {
  const profanity = readBlocklist(PROFANITY_BLOCKLIST_PATH, 'profanity-blocklist.txt');
  const manual = readBlocklist(MANUAL_BLOCKLIST_PATH, 'manual-blocklist.txt');
  const combined = new Set([...profanity, ...manual, ...HARDCODED_BLOCKLIST]);
  console.log(`Blocklist: ${profanity.length} profanity + ${manual.length} manual + ${HARDCODED_BLOCKLIST.size} hardcoded = ${combined.size} unique`);
  return combined;
}

// ── Helpers ──

function isValidWord(w, len) {
  if (w.length !== len) return false;
  if (!/^[a-z]+$/.test(w)) return false;
  return true;
}

// ── Main ──

if (!existsSync(ENRICHED_PATH)) {
  console.error('Source enriched dictionary not found at', ENRICHED_PATH);
  process.exit(1);
}
if (!existsSync(FULL_PATH)) {
  console.error('Source full dictionary not found at', FULL_PATH);
  process.exit(1);
}

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const enrichedRaw = JSON.parse(readFileSync(ENRICHED_PATH, 'utf-8'));
const fullRaw = JSON.parse(readFileSync(FULL_PATH, 'utf-8'));
const BLOCKLIST = loadBlocklist();

let totalTargets = 0;
let totalValid = 0;
let totalDefs = 0;

for (const len of LENGTHS) {
  const rawKey = String(len);

  // ── 1. Target words from enriched.json (existing behavior) ──
  const enrichedEntries = enrichedRaw[rawKey] || [];
  const targetWords = enrichedEntries
    .map((e) => {
      const w = (typeof e === 'string' ? e : (e.word || '')).toLowerCase().trim();
      return w;
    })
    .filter((w) => {
      if (!isValidWord(w, len)) return false;
      if (BLOCKLIST.has(w)) return false;
      return true;
    });
  const uniqueTargets = [...new Set(targetWords)].sort();
  writeFileSync(join(OUT_DIR, `${len}.json`), JSON.stringify(uniqueTargets));
  console.log(`${len}.json — ${uniqueTargets.length} target words`);
  totalTargets += uniqueTargets.length;

  // ── 2. Valid guess words from full.json (NEW) ──
  const fullEntries = fullRaw[rawKey] || [];
  const validWords = fullEntries
    .map((w) => String(w).toLowerCase().trim())
    .filter((w) => {
      if (!isValidWord(w, len)) return false;
      if (BLOCKLIST.has(w)) return false;
      return true;
    });
  const uniqueValid = [...new Set(validWords)].sort();
  writeFileSync(join(OUT_DIR, `valid-${len}.json`), JSON.stringify(uniqueValid));
  console.log(`valid-${len}.json — ${uniqueValid.length} valid guess words`);
  totalValid += uniqueValid.length;

  // ── 3. Definition maps from enriched.json (NEW) ──
  const defsMap = {};
  for (const entry of enrichedEntries) {
    if (typeof entry === 'string') continue;
    const word = (entry.word || '').toUpperCase().trim();
    const def = (entry.definition || '').trim();
    if (!word || !def) continue;
    if (word.length !== len) continue;
    if (!/^[A-Z]+$/.test(word)) continue;
    if (BLOCKLIST.has(word.toLowerCase())) continue;
    defsMap[word] = def;
  }
  writeFileSync(join(OUT_DIR, `defs-${len}.json`), JSON.stringify(defsMap));
  console.log(`defs-${len}.json — ${Object.keys(defsMap).length} definitions`);
  totalDefs += Object.keys(defsMap).length;
}

console.log(`\nDone. ${totalTargets} target words, ${totalValid} valid guess words, ${totalDefs} definitions.`);
