import { create } from 'zustand';
import { getDailyDateString, getDailyWordIndex } from '../services/dailySeed';

// ── Target words (enriched dictionary, curated ~12K total) ──
const wordList5: string[] = require('../../assets/dictionary/5.json');
const wordList6: string[] = require('../../assets/dictionary/6.json');
const wordList7: string[] = require('../../assets/dictionary/7.json');
const wordList8: string[] = require('../../assets/dictionary/8.json');
const wordList9: string[] = require('../../assets/dictionary/9.json');
const wordList10: string[] = require('../../assets/dictionary/10.json');

const WORD_LISTS: Record<number, string[]> = {
  5: wordList5,
  6: wordList6,
  7: wordList7,
  8: wordList8,
  9: wordList9,
  10: wordList10,
};

// ── Valid guess words (full dictionary, broader ~184K total) ──
const validWords5: string[] = require('../../assets/dictionary/valid-5.json');
const validWords6: string[] = require('../../assets/dictionary/valid-6.json');
const validWords7: string[] = require('../../assets/dictionary/valid-7.json');
const validWords8: string[] = require('../../assets/dictionary/valid-8.json');
const validWords9: string[] = require('../../assets/dictionary/valid-9.json');
const validWords10: string[] = require('../../assets/dictionary/valid-10.json');

const VALID_LISTS: Record<number, string[]> = {
  5: validWords5,
  6: validWords6,
  7: validWords7,
  8: validWords8,
  9: validWords9,
  10: validWords10,
};

// ── Definition maps (from enriched dictionary) ──
const defs5: Record<string, string> = require('../../assets/dictionary/defs-5.json');
const defs6: Record<string, string> = require('../../assets/dictionary/defs-6.json');
const defs7: Record<string, string> = require('../../assets/dictionary/defs-7.json');
const defs8: Record<string, string> = require('../../assets/dictionary/defs-8.json');
const defs9: Record<string, string> = require('../../assets/dictionary/defs-9.json');
const defs10: Record<string, string> = require('../../assets/dictionary/defs-10.json');

const DEFS: Record<number, Record<string, string>> = {
  5: defs5,
  6: defs6,
  7: defs7,
  8: defs8,
  9: defs9,
  10: defs10,
};

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

export const useDictionaryStore = create<DictionaryState>()((_, get) => ({
  getWordList: (length) => WORD_LISTS[length] || [],

  getRandomWord: (length) => {
    const list = WORD_LISTS[length] || [];
    return list[Math.floor(Math.random() * list.length)];
  },

  isValidWord: (length, word) => {
    const list = WORD_LISTS[length];
    if (!list) return false;
    const wordSet = new Set(list);
    return wordSet.has(word.toUpperCase());
  },

  isValidGuess: (length, word) => {
    const list = VALID_LISTS[length];
    if (!list) return false;
    const wordSet = new Set(list);
    return wordSet.has(word.toUpperCase());
  },

  getDefinition: (length, word) => {
    const map = DEFS[length];
    if (!map) return undefined;
    return map[word.toUpperCase()];
  },

  getTodayDailyWords: () => {
    const dateStr = getDailyDateString();
    const words: Record<number, string> = {};

    for (let len = 5; len <= 10; len++) {
      const list = WORD_LISTS[len];
      if (list && list.length > 0) {
        const index = getDailyWordIndex(dateStr, len, list.length);
        words[len] = list[index];
      }
    }

    return { date: dateStr, words };
  },
}));
