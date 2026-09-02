import { create } from 'zustand';
import { getDailyDateString, getDailyWordIndex } from '../services/dailySeed';
import { withDevTime } from '../utils/devTime';
import { loadDictionaryAssets, type DictionaryAssets } from './dictionaryAssets';

let assets: DictionaryAssets | null = null;

/** Load dictionary JSON once. Timed as `dictionary-load` (LAUNCH-07). */
export function loadDictionaries(): void {
  if (assets) return;
  assets = withDevTime('dictionary-load', () => loadDictionaryAssets());
}

function getAssets(): DictionaryAssets {
  loadDictionaries();
  return assets as DictionaryAssets;
}

interface DictionaryState {
  /** Returns the target word list for a given length (enriched dictionary). */
  getWordList: (length: number) => string[];
  /** Returns a random target word for a given length. */
  getRandomWord: (length: number) => string;
  /** Checks if a word exists in the TARGET word list (enriched, stricter). */
  isValidWord: (length: number, word: string) => boolean;
  /** Checks if a word is a valid GUESS (full dictionary, broader, case-insensitive). */
  isValidGuess: (length: number, word: string) => boolean;
  /** Looks up the definition of a word for a given length. Returns undefined if not found. */
  getDefinition: (length: number, word: string) => string | undefined;
  /** Computes today's 6 daily words (one per length 5-10). */
  getTodayDailyWords: () => { date: string; words: Record<number, string> };
}

export const useDictionaryStore = create<DictionaryState>()(() => ({
  getWordList: (length) => getAssets().wordLists[length] || [],

  getRandomWord: (length) => {
    const list = getAssets().wordLists[length] || [];
    return list[Math.floor(Math.random() * list.length)];
  },

  isValidWord: (length, word) => {
    const list = getAssets().wordLists[length];
    if (!list) return false;
    const wordSet = new Set(list);
    return wordSet.has(word.toLowerCase());
  },

  isValidGuess: (length, word) => {
    const list = getAssets().validLists[length];
    if (!list) return false;
    const wordSet = new Set(list);
    return wordSet.has(word.toLowerCase());
  },

  getDefinition: (length, word) => {
    const map = getAssets().defs[length];
    if (!map) return undefined;
    return map[word.toUpperCase()];
  },

  getTodayDailyWords: () => {
    const dateStr = getDailyDateString();
    const words: Record<number, string> = {};

    for (let len = 5; len <= 10; len++) {
      const list = getAssets().wordLists[len];
      if (list && list.length > 0) {
        const index = getDailyWordIndex(dateStr, len, list.length);
        words[len] = list[index];
      }
    }

    return { date: dateStr, words };
  },
}));
