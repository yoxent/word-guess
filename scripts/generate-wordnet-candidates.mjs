/**
 * Generate WordNet 2.1 candidate word lists for review (does NOT merge into live dicts).
 *
 * Outputs:
 *   wordnet-candidates-full.json      — new valid-guess words (ONLY lemmas that
 *                                       also qualify for enriched — drops rare
 *                                       untagged WordNet long-tail)
 *   wordnet-candidates-enriched.json  — new curated targets + defs (tagged senses)
 *   wordnet-candidates-summary.txt    — counts + notable blocklist skips
 *
 * Rules:
 * - Exclude anything on profanity-blocklist.txt, manual-blocklist.txt, or hardcoded list
 * - Enriched: prefer POS with highest tagsense_cnt; among senses, skip glosses whose
 *   text contains a PROFANITY term (not manual proper-nouns); take first clean sense
 * - Enriched requires at least one tagged sense on some POS
 * - Full candidates ⊆ enriched candidates (same common-ish gate)
 * - Drop closed compounds that are really two words (drygoods←dry goods / high_school)
 *
 * Usage: node scripts/generate-wordnet-candidates.mjs
 * Env:   WORDNET_DICT (default: C:\Program Files (x86)\WordNet\2.1\dict)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WORDNET_DICT =
  process.env.WORDNET_DICT || 'C:\\Program Files (x86)\\WordNet\\2.1\\dict';
const ENRICHED_PATH = join(ROOT, 'dictionary.full.enriched.json');
const FULL_PATH = join(ROOT, 'dictionary.full.json');
const PROFANITY_BLOCKLIST_PATH = join(ROOT, 'profanity-blocklist.txt');
const MANUAL_BLOCKLIST_PATH = join(ROOT, 'manual-blocklist.txt');
const OUT_FULL = join(ROOT, 'wordnet-candidates-full.json');
const OUT_ENRICHED = join(ROOT, 'wordnet-candidates-enriched.json');
const OUT_SUMMARY = join(ROOT, 'wordnet-candidates-summary.txt');
const LENGTHS = [5, 6, 7, 8, 9, 10];

const POS_FILES = [
  { pos: 'n', index: 'index.noun', data: 'data.noun' },
  { pos: 'v', index: 'index.verb', data: 'data.verb' },
  { pos: 'a', index: 'index.adj', data: 'data.adj' },
  { pos: 'r', index: 'index.adv', data: 'data.adv' },
];
const EXC_FILES = ['noun.exc', 'verb.exc', 'adj.exc', 'adv.exc'];
const POS_RANK = { n: 0, v: 1, a: 2, r: 3 };

// WordNet 2.1 lex file numbers (see doc/html/lexnames.5WN.html)
const LEX_LOCATION = 15;
const LEX_PERSON = 18;
const LEX_TIME = 28;
const PROPER_LEX_FILES = new Set([LEX_LOCATION, LEX_PERSON, LEX_TIME]);

/** Suffixes that make “stem+suffix” look like a joined/derived solid (barnful, atomlike). */
const JOIN_MORPH_SUFFIXES = ['like', 'less', 'ful', 'ness'];


const HARDCODED_BLOCKLIST = new Set([
  'slut', 'whore', 'bitch', 'faggot', 'nigger', 'cunt', 'shitass',
  'pissed', 'damnit', 'fucked', 'fucker', 'motherfucker', 'cock',
  'dickhead', 'asshole', 'bastard', 'shithead', 'jackass',
]);

function readBlocklistFile(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#') && line.length >= 5 && line.length <= 10);
}

function loadBlocklists() {
  const profanity = new Set(readBlocklistFile(PROFANITY_BLOCKLIST_PATH));
  const manual = new Set(readBlocklistFile(MANUAL_BLOCKLIST_PATH));
  const all = new Set([...profanity, ...manual, ...HARDCODED_BLOCKLIST]);
  return { profanity, manual, all };
}

function isPlayable(lemma) {
  return /^[a-z]+$/.test(lemma) && lemma.length >= 5 && lemma.length <= 10;
}

function capitalizeDefinition(gloss) {
  let d = gloss.replace(/\s+/g, ' ').trim();
  if (!d) return '';
  d = d.charAt(0).toUpperCase() + d.slice(1);
  if (!/[.!?]"?$/.test(d)) d += '.';
  return d;
}

/** True if gloss contains any blocklist term as a whole word. */
function glossContainsBlocklistTerm(gloss, blocklist) {
  const lower = gloss.toLowerCase();
  // Fast path: tokenize on non-letters
  const tokens = new Set(lower.split(/[^a-z]+/).filter(Boolean));
  for (const term of blocklist) {
    if (tokens.has(term)) return true;
    // also catch multi-word-ish / substring for hyphen-stripped forms already in set
  }
  return false;
}

function parseIndexLine(line, pos) {
  if (!line || line.startsWith(' ')) return null;
  const parts = line.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const lemma = parts[0];
  const synsetCnt = Number(parts[2]);
  const pCnt = Number(parts[3]);
  if (!Number.isFinite(synsetCnt) || !Number.isFinite(pCnt)) return null;
  const afterPtrs = 4 + pCnt;
  const senseCnt = Number(parts[afterPtrs]);
  const tagsenseCnt = Number(parts[afterPtrs + 1]);
  if (!Number.isFinite(senseCnt) || !Number.isFinite(tagsenseCnt)) return null;
  const offsets = parts.slice(afterPtrs + 2, afterPtrs + 2 + senseCnt);
  if (offsets.length !== senseCnt) return null;
  return { lemma, pos, synsetCnt, tagsenseCnt, offsets };
}

function parseDataLine(line) {
  const bar = line.indexOf('|');
  if (bar < 0) return null;
  const meta = line.slice(0, bar).trim();
  const gloss = line.slice(bar + 1).trim();
  const parts = meta.split(/\s+/);
  if (parts.length < 4) return null;
  const offset = parts[0];
  const lexFilenum = Number(parts[1]);
  const wCnt = parseInt(parts[3], 16);
  if (!Number.isFinite(wCnt)) return null;
  const words = []; // lowercase display tokens
  const rawWords = []; // original WordNet casing (Proper nouns capitalized)
  let i = 4;
  for (let w = 0; w < wCnt; w++) {
    const word = parts[i];
    i += 2;
    if (word) {
      rawWords.push(word);
      words.push(word.replace(/_/g, ' '));
    }
  }
  const pCnt = Number(parts[i]);
  i += 1;
  const antonymTargets = [];
  if (Number.isFinite(pCnt)) {
    for (let p = 0; p < pCnt; p++) {
      const pointer = parts[i];
      const synsetOffset = parts[i + 1];
      const pos = parts[i + 2];
      i += 4;
      if (pointer === '!') antonymTargets.push({ pos, offset: synsetOffset });
    }
  }
  return { offset, lexFilenum, words, rawWords, antonymTargets, gloss };
}

/** Proper-noun-ish sense: location/person/time lex file, or capitalized lemma form. */
function isProperSense(synset, lemma) {
  if (!synset) return true;
  if (PROPER_LEX_FILES.has(synset.lexFilenum)) return true;
  for (const raw of synset.rawWords || []) {
    const base = raw.split('_')[0];
    if (base.toLowerCase() === lemma && /^[A-Z]/.test(base)) return true;
  }
  return false;
}

function loadDataFile(filePath) {
  const map = new Map();
  for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    if (!line || line.startsWith(' ')) continue;
    const parsed = parseDataLine(line);
    if (parsed) map.set(parsed.offset, parsed);
  }
  return map;
}

function loadIndexFile(filePath, pos) {
  const entries = [];
  for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const parsed = parseIndexLine(line, pos);
    if (parsed && isPlayable(parsed.lemma)) entries.push(parsed);
  }
  return entries;
}

/**
 * Index helpers for closed-compound detection:
 * - solidParts: any a–z lemma/part length ≥ 3 (for split checks)
 * - joinedFromUnderscore: drygoods← if dry_goods exists; highschool←high_school
 */
function loadCompoundIndex(wordnetDict) {
  const solidParts = new Set();
  const joinedFromUnderscore = new Map(); // joined → underscored form
  for (const { index } of POS_FILES) {
    const text = readFileSync(join(wordnetDict, index), 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith(' ')) continue;
      const lemma = line.trim().split(/\s+/)[0]?.toLowerCase();
      if (!lemma) continue;
      if (lemma.includes('_')) {
        const joined = lemma.replace(/_/g, '');
        if (/^[a-z]+$/.test(joined) && joined.length >= 5 && joined.length <= 10) {
          if (!joinedFromUnderscore.has(joined)) joinedFromUnderscore.set(joined, lemma);
        }
        for (const part of lemma.split('_')) {
          if (/^[a-z]+$/.test(part) && part.length >= 3) solidParts.add(part);
        }
      } else if (/^[a-z]+$/.test(lemma) && lemma.length >= 3) {
        solidParts.add(lemma);
      }
    }
  }
  return { solidParts, joinedFromUnderscore };
}

/**
 * Same concept as a spaced phrase (dry goods) / underscored WN form, written solid.
 * Returns reason string if it should be dropped, else null.
 */
function joinedCompoundReason(lemma, solidParts, joinedFromUnderscore) {
  if (joinedFromUnderscore.has(lemma)) {
    return `underscore-twin:${joinedFromUnderscore.get(lemma)}`;
  }
  for (const suf of JOIN_MORPH_SUFFIXES) {
    if (lemma.endsWith(suf) && lemma.length - suf.length >= 3) {
      const stem = lemma.slice(0, -suf.length);
      if (solidParts.has(stem)) return `morph:${stem}+${suf}`;
    }
  }
  // Split into two WN lemmas (e.g. dry+goods, door+handle). Require max part ≥ 4
  // so short+short (sac+red) doesn't false-positive on "sacred".
  for (let i = 3; i <= lemma.length - 3; i++) {
    const a = lemma.slice(0, i);
    const b = lemma.slice(i);
    if (Math.max(a.length, b.length) < 4) continue;
    if (solidParts.has(a) && solidParts.has(b)) return `split:${a}+${b}`;
  }
  return null;
}

function loadExcForms(filePath) {
  if (!existsSync(filePath)) return [];
  const forms = [];
  for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    if (!line || line.startsWith(' ')) continue;
    const surface = line.trim().split(/\s+/)[0]?.toLowerCase();
    if (surface && isPlayable(surface)) forms.push(surface);
  }
  return forms;
}

function synToken(word) {
  const w = word.toLowerCase().trim();
  return /^[a-z]+$/.test(w) ? w : null;
}

function pickCleanSense(entries, dataByPos, profanityTerms) {
  // Sort POS by tagsense then noun>verb>adj>adv
  const sortedPos = [...entries].sort((a, b) => {
    if (b.tagsenseCnt !== a.tagsenseCnt) return b.tagsenseCnt - a.tagsenseCnt;
    return (POS_RANK[a.pos] ?? 9) - (POS_RANK[b.pos] ?? 9);
  });

  if (!sortedPos.some((e) => e.tagsenseCnt > 0)) {
    return { ok: false, reason: 'no-tagged-sense' };
  }

  let dirtyFallback = null;
  let sawOnlyProper = true;
  let sawTaggedNonProper = false;
  for (const entry of sortedPos) {
    // Only frequency-tagged senses (first tagsenseCnt offsets)
    const limit = Math.min(entry.offsets.length, entry.tagsenseCnt);
    for (let i = 0; i < limit; i++) {
      const synset = dataByPos[entry.pos]?.get(entry.offsets[i]);
      if (!synset?.gloss) continue;
      if (isProperSense(synset, entry.lemma)) continue;
      sawOnlyProper = false;
      sawTaggedNonProper = true;
      const dirty = glossContainsBlocklistTerm(synset.gloss, profanityTerms);
      const candidate = {
        pos: entry.pos,
        senseIndex: i,
        tagsenseCnt: entry.tagsenseCnt,
        synset,
        dirty,
      };
      if (!dirty) return { ok: true, ...candidate, skippedDirty: Boolean(dirtyFallback) };
      if (!dirtyFallback) dirtyFallback = candidate;
    }
  }

  if (!sawTaggedNonProper || sawOnlyProper) return { ok: false, reason: 'proper-noun' };
  if (dirtyFallback) {
    return {
      ok: false,
      reason: 'all-senses-dirty',
      dirtyGloss: dirtyFallback.synset.gloss,
      pos: dirtyFallback.pos,
    };
  }
  return { ok: false, reason: 'no-gloss' };
}

function main() {
  if (!existsSync(WORDNET_DICT)) {
    console.error('WordNet dict not found at', WORDNET_DICT);
    process.exit(1);
  }
  if (!existsSync(FULL_PATH) || !existsSync(ENRICHED_PATH)) {
    console.error('Live dictionaries missing — need them to compute deltas only');
    process.exit(1);
  }

  const { profanity, manual, all: blocklist } = loadBlocklists();
  // Gloss “dirty” checks: profanity + hardcoded only (NOT manual proper nouns)
  const glossBlockTerms = new Set([...profanity, ...HARDCODED_BLOCKLIST]);
  console.log(`Blocklist: ${profanity.size} profanity + ${manual.size} manual (+ hardcoded) → ${blocklist.size} unique`);
  console.log(`Gloss filter terms (profanity+hardcoded): ${glossBlockTerms.size}`);

  const dataByPos = {};
  for (const { pos, data } of POS_FILES) {
    console.log(`Loading ${data}...`);
    dataByPos[pos] = loadDataFile(join(WORDNET_DICT, data));
  }

  const byLemma = new Map();
  let blockedLemmas = 0;
  const blockedFromWordNet = [];
  for (const { pos, index } of POS_FILES) {
    console.log(`Loading ${index}...`);
    for (const entry of loadIndexFile(join(WORDNET_DICT, index), pos)) {
      if (blocklist.has(entry.lemma)) {
        blockedLemmas++;
        if (blockedFromWordNet.length < 50 || entry.lemma === 'touch' || entry.lemma === 'bitch') {
          const src = profanity.has(entry.lemma)
            ? 'profanity'
            : manual.has(entry.lemma)
              ? 'manual'
              : 'hardcoded';
          blockedFromWordNet.push({ lemma: entry.lemma, source: src, pos });
        }
        continue;
      }
      if (!byLemma.has(entry.lemma)) byLemma.set(entry.lemma, []);
      byLemma.get(entry.lemma).push(entry);
    }
  }

  // Deduplicate blocked note list by lemma
  const blockedNotable = new Map();
  for (const row of blockedFromWordNet) {
    if (!blockedNotable.has(row.lemma)) blockedNotable.set(row.lemma, row);
  }
  // Always report touch/bitch if present on blocklist regardless of sample cap
  for (const special of ['touch', 'bitch', 'unwondered']) {
    if (blocklist.has(special) && !blockedNotable.has(special)) {
      blockedNotable.set(special, {
        lemma: special,
        source: profanity.has(special) ? 'profanity' : manual.has(special) ? 'manual' : 'hardcoded',
        pos: '(blocklist only / not in WN index sample)',
      });
    }
  }

  console.log(`WordNet playable lemmas: ${byLemma.size}`);

  const { solidParts, joinedFromUnderscore } = loadCompoundIndex(WORDNET_DICT);
  console.log(
    `Compound index: ${solidParts.size} solid parts, ${joinedFromUnderscore.size} underscore→joined forms`
  );

  const excForms = new Set();
  // Exc forms are mostly rare inflections; skipped for full candidates under
  // enriched-only policy (kept here only for summary diagnostics if needed).
  for (const name of EXC_FILES) {
    for (const form of loadExcForms(join(WORDNET_DICT, name))) {
      if (!blocklist.has(form)) excForms.add(form);
    }
  }

  const full = JSON.parse(readFileSync(FULL_PATH, 'utf-8'));
  const enriched = JSON.parse(readFileSync(ENRICHED_PATH, 'utf-8'));
  const fullSets = {};
  const enrichedSets = {};
  for (const len of LENGTHS) {
    const key = String(len);
    fullSets[key] = new Set((full[key] || []).map((w) => String(w).toLowerCase()));
    enrichedSets[key] = new Set(
      (enriched[key] || []).map((e) => (typeof e === 'string' ? e : e.word || '').toLowerCase())
    );
  }

  const candidatesFull = Object.fromEntries(LENGTHS.map((n) => [String(n), []]));
  const candidatesEnriched = Object.fromEntries(LENGTHS.map((n) => [String(n), []]));

  let newFullLemmas = 0;
  let newEnriched = 0;
  let skippedNoTagged = 0;
  let skippedDirtyOnly = 0;
  let skippedNoGloss = 0;
  let skippedProper = 0;
  let skippedJoined = 0;
  let usedNonFirstSense = 0;
  let skippedRareFull = 0;
  const dirtyOnlyExamples = [];
  const properExamples = [];
  const joinedExamples = [];

  for (const [lemma, entries] of byLemma) {
    const key = String(lemma.length);
    if (!LENGTHS.includes(lemma.length)) continue;

    const joinedWhy = joinedCompoundReason(lemma, solidParts, joinedFromUnderscore);
    if (joinedWhy) {
      skippedJoined++;
      if (joinedExamples.length < 25) joinedExamples.push(`${lemma} (${joinedWhy})`);
      if (!fullSets[key].has(lemma)) skippedRareFull++;
      continue;
    }

    // Enriched gate first — full candidates must pass the same bar
    let enrichedEntry = null;
    if (!enrichedSets[key].has(lemma)) {
      const picked = pickCleanSense(entries, dataByPos, glossBlockTerms);
      if (!picked.ok) {
        if (picked.reason === 'no-tagged-sense') skippedNoTagged++;
        else if (picked.reason === 'proper-noun') {
          skippedProper++;
          if (properExamples.length < 15) properExamples.push(lemma);
        } else if (picked.reason === 'all-senses-dirty') {
          skippedDirtyOnly++;
          if (dirtyOnlyExamples.length < 20) {
            dirtyOnlyExamples.push({ lemma, gloss: picked.dirtyGloss, pos: picked.pos });
          }
        } else skippedNoGloss++;
        if (!fullSets[key].has(lemma)) skippedRareFull++;
        continue;
      }

      if (picked.senseIndex > 0 || picked.skippedDirty) usedNonFirstSense++;

      const synset = picked.synset;
      const synonyms = [];
      const seenSyn = new Set([lemma]);
      for (const w of synset.words) {
        const tok = synToken(w);
        if (!tok || seenSyn.has(tok) || blocklist.has(tok)) continue;
        seenSyn.add(tok);
        synonyms.push(tok);
      }
      const antonyms = [];
      const seenAnt = new Set();
      for (const ant of synset.antonymTargets) {
        const antPos = ant.pos === 's' ? 'a' : ant.pos;
        const antSyn = dataByPos[antPos]?.get(ant.offset);
        if (!antSyn) continue;
        for (const w of antSyn.words) {
          const tok = synToken(w);
          if (!tok || tok === lemma || seenAnt.has(tok) || blocklist.has(tok)) continue;
          seenAnt.add(tok);
          antonyms.push(tok);
        }
      }

      enrichedEntry = {
        word: lemma.toUpperCase(),
        definition: capitalizeDefinition(synset.gloss),
        synonyms,
        antonyms,
        _meta: {
          pos: picked.pos,
          senseIndex: picked.senseIndex,
          tagsenseCnt: picked.tagsenseCnt,
          skippedDirtySense: Boolean(picked.skippedDirty),
        },
      };
      candidatesEnriched[key].push(enrichedEntry);
      newEnriched++;
    }

    // Full: only if missing from live full AND (new enriched OR already a live target)
    const qualifiesAsCommon =
      Boolean(enrichedEntry) || enrichedSets[key].has(lemma);
    if (!fullSets[key].has(lemma)) {
      if (qualifiesAsCommon) {
        candidatesFull[key].push(lemma);
        newFullLemmas++;
      } else {
        skippedRareFull++;
      }
    }
  }

  for (const len of LENGTHS) {
    const key = String(len);
    candidatesFull[key].sort();
    candidatesEnriched[key].sort((a, b) => a.word.localeCompare(b.word));
  }

  writeFileSync(OUT_FULL, JSON.stringify(candidatesFull, null, 2));
  writeFileSync(OUT_ENRICHED, JSON.stringify(candidatesEnriched, null, 2));

  const summary = [
    'WordNet → candidate review (no merge into live dictionaries)',
    `Generated: ${new Date().toISOString()}`,
    `WordNet dict: ${WORDNET_DICT}`,
    '',
    'Policy: full ⊆ enriched; drop rare/untagged, proper nouns, and closed compounds (drygoods).',
    '',
    `Blocklist unique (5–10): ${blocklist.size}`,
    `  profanity-blocklist.txt: ${profanity.size}`,
    `  manual-blocklist.txt: ${manual.size}`,
    `  hardcoded fallback: ${HARDCODED_BLOCKLIST.size}`,
    `Gloss filter terms (profanity+hardcoded): ${glossBlockTerms.size}`,
    `WordNet lemmas skipped because blocklisted (index hits, per-POS tallied): ${blockedLemmas}`,
    `Exc surface forms available but not added under this policy: ${excForms.size}`,
    '',
    '=== Candidates ===',
    `New full (valid-guess) lemmas: ${newFullLemmas}`,
    `New full total entries: ${LENGTHS.reduce((n, len) => n + candidatesFull[String(len)].length, 0)}`,
    `New enriched (target+def) entries: ${newEnriched}`,
    `  used non-first / cleaned sense: ${usedNonFirstSense}`,
    `Skipped rare (not tagged / not enriched-eligible) for full: ${skippedRareFull}`,
    `Skipped (closed compound / joined multiword): ${skippedJoined}`,
    `Skipped enriched (no tagged sense): ${skippedNoTagged}`,
    `Skipped enriched (proper noun / place / person / time): ${skippedProper}`,
    `Skipped enriched (all senses hit profanity terms in gloss): ${skippedDirtyOnly}`,
    `Skipped enriched (no gloss): ${skippedNoGloss}`,
    '',
    'Per length:',
    ...LENGTHS.map((len) => {
      const key = String(len);
      return `  ${key}: full+${candidatesFull[key].length}  enriched+${candidatesEnriched[key].length}`;
    }),
    '',
    '=== Notable blocklisted lemmas (excluded from candidates) ===',
    ...[...blockedNotable.values()]
      .sort((a, b) => a.lemma.localeCompare(b.lemma))
      .slice(0, 40)
      .map((r) => `  ${r.lemma}  [${r.source}]`),
    '',
    blocklist.has('touch')
      ? 'NOTE: "touch" is on a blocklist — remove it to allow as a candidate.'
      : 'NOTE: "touch" is unblocked and included in candidates when missing from live dicts.',
    '',
    '=== Examples skipped as closed compounds ===',
    joinedExamples.length ? `  ${joinedExamples.join(', ')}` : '  (none)',
    '',
    '=== Examples skipped as proper nouns ===',
    properExamples.length ? `  ${properExamples.join(', ')}` : '  (none)',
    '',
    '=== Examples skipped (gloss-only dirty) ===',
    ...(dirtyOnlyExamples.length
      ? dirtyOnlyExamples.map((x) => `  ${x.lemma} (${x.pos}): ${x.gloss.slice(0, 120)}`)
      : ['  (none)']),
    '',
    'Outputs:',
    `  ${OUT_FULL}`,
    `  ${OUT_ENRICHED}`,
    `  ${OUT_SUMMARY}`,
  ].join('\n');

  writeFileSync(OUT_SUMMARY, summary);
  console.log(summary);
}

main();
