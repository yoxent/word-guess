import { create } from 'zustand';

// Static requires — Metro bundles these at build time.
// Relative paths from src/stores/ to assets/dictionary/
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

interface DictionaryState {
  getWordList: (length: number) => string[];
  getRandomWord: (length: number) => string;
  isValidWord: (length: number, word: string) => boolean;
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
}));
