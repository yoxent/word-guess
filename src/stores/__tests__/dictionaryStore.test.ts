const mockLoadDictionaryAssets = jest.fn();

jest.mock('../dictionaryAssets', () => ({
  loadDictionaryAssets: (...args: unknown[]) => mockLoadDictionaryAssets(...args),
}));

jest.mock('../../utils/devTime', () => ({
  withDevTime: jest.fn((_label: string, fn: () => unknown) => fn()),
  withDevTimeAsync: jest.fn(async (_label: string, fn: () => Promise<unknown>) => fn()),
}));

const emptyAssets = () => ({
  wordLists: { 5: ['HELLO'], 6: [], 7: [], 8: [], 9: [], 10: [] },
  validLists: { 5: ['HELLO'], 6: [], 7: [], 8: [], 9: [], 10: [] },
  defs: { 5: { HELLO: 'a greeting' }, 6: {}, 7: {}, 8: {}, 9: {}, 10: {} },
});

describe('loadDictionaries', () => {
  it('loads dictionary assets once inside the dictionary-load marker', () => {
    const order: string[] = [];
    const { withDevTime } = require('../../utils/devTime') as {
      withDevTime: jest.Mock;
    };
    withDevTime.mockImplementation((label: string, fn: () => unknown) => {
      order.push(`time:${label}`);
      const result = fn();
      order.push(`timeEnd:${label}`);
      return result;
    });
    mockLoadDictionaryAssets.mockImplementation(() => {
      order.push('assets');
      return emptyAssets();
    });

    const { loadDictionaries, useDictionaryStore } = require('../dictionaryStore') as typeof import('../dictionaryStore');
    loadDictionaries();
    loadDictionaries();

    expect(order).toEqual(['time:dictionary-load', 'assets', 'timeEnd:dictionary-load']);
    expect(mockLoadDictionaryAssets).toHaveBeenCalledTimes(1);
    expect(useDictionaryStore.getState().getWordList(5)).toEqual(['HELLO']);
  });
});
