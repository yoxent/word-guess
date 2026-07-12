import { generateShareText, type GameResultForShare } from '../share';

describe('share', () => {
  describe('generateShareText', () => {
    const baseResult: GameResultForShare = {
      mode: 'random',
      word: 'APPLE',
      letterCount: 5,
      attempts: 4,
      won: true,
      maxAttempts: 6,
      guesses: [
        [
          { letter: 'C', feedback: 'absent' },
          { letter: 'R', feedback: 'present' },
          { letter: 'A', feedback: 'correct' },
          { letter: 'N', feedback: 'absent' },
          { letter: 'E', feedback: 'correct' },
        ],
        [
          { letter: 'A', feedback: 'correct' },
          { letter: 'P', feedback: 'correct' },
          { letter: 'P', feedback: 'correct' },
          { letter: 'L', feedback: 'correct' },
          { letter: 'E', feedback: 'correct' },
        ],
      ],
      date: '2026-07-10T15:30:00Z',
    };

    it('includes mode name and letter length', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('Word Guess');
      expect(text).toContain('Random · 5-letter');
      expect(text.split('\n')[0]).toBe('Word Guess');
      expect(text.split('\n')[1]).toBe('Random · 5-letter');
    });

    it('includes formatted date', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('2026-07-10');
    });

    it('generates emoji rows', () => {
      const text = generateShareText(baseResult);
      const lines = text.split('\n');
      // lines[0] = 'Word Guess'
      // lines[1] = 'Random · 5-letter'
      // lines[2] = '2026-07-10'
      // lines[3] = '' (blank line)
      // lines[4] = first guess row: ⬛🟨🟩⬛🟩
      // lines[5] = second guess row: 🟩🟩🟩🟩🟩
      expect(lines[4]).toBe('⬛🟨🟩⬛🟩');
      expect(lines[5]).toBe('🟩🟩🟩🟩🟩');
    });

    it('shows win ratio when won', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('4/6');
    });

    it('shows X/max when lost', () => {
      const lostResult = { ...baseResult, won: false, attempts: 6 };
      const text = generateShareText(lostResult);
      expect(text).toContain('X/6');
    });

    it('includes footer', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('Play Word Guess!');
    });

    it('handles daily mode with length', () => {
      const dailyResult = { ...baseResult, mode: 'daily' as const, letterCount: 7 };
      const text = generateShareText(dailyResult);
      expect(text).toContain('Daily Challenge · 7-letter');
    });

    it('handles endless mode with length', () => {
      const endlessResult = { ...baseResult, mode: 'endless' as const, letterCount: 10 };
      const text = generateShareText(endlessResult);
      expect(text).toContain('Endless · 10-letter');
    });

    it('handles free mode', () => {
      const freeResult = { ...baseResult, mode: 'free' as const };
      const text = generateShareText(freeResult);
      expect(text).toContain('Free Play · 5-letter');
    });
  });
});
