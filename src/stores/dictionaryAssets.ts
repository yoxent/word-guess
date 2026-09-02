export type DictionaryAssets = {
  wordLists: Record<number, string[]>;
  validLists: Record<number, string[]>;
  defs: Record<number, Record<string, string>>;
};

/** Synchronous JSON requires — call once at launch so LAUNCH-07 can time it. */
export function loadDictionaryAssets(): DictionaryAssets {
  return {
    wordLists: {
      5: require('../../assets/dictionary/5.json'),
      6: require('../../assets/dictionary/6.json'),
      7: require('../../assets/dictionary/7.json'),
      8: require('../../assets/dictionary/8.json'),
      9: require('../../assets/dictionary/9.json'),
      10: require('../../assets/dictionary/10.json'),
    },
    validLists: {
      5: require('../../assets/dictionary/valid-5.json'),
      6: require('../../assets/dictionary/valid-6.json'),
      7: require('../../assets/dictionary/valid-7.json'),
      8: require('../../assets/dictionary/valid-8.json'),
      9: require('../../assets/dictionary/valid-9.json'),
      10: require('../../assets/dictionary/valid-10.json'),
    },
    defs: {
      5: require('../../assets/dictionary/defs-5.json'),
      6: require('../../assets/dictionary/defs-6.json'),
      7: require('../../assets/dictionary/defs-7.json'),
      8: require('../../assets/dictionary/defs-8.json'),
      9: require('../../assets/dictionary/defs-9.json'),
      10: require('../../assets/dictionary/defs-10.json'),
    },
  };
}
