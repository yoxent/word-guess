import { generateShareText, type GameResultForShare } from '../share';

describe('share', () => {
  describe('generateShareText', () => {
    const baseResult: GameResultForShare = {
      mode: 'random',
      word: 'APPLE',
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

    it('includes mode name', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('Random');
    });

    it('includes formatted date', () => {
      const text = generateShareText(baseResult);
      expect(text).toContain('2026-07-10');
    });

    it('generates emoji rows', () => {
      const text = generateShareText(baseResult);
      const lines = text.split('\n');
      // lines[0] = 'Word Guess - Random'
      // lines[1] = '2026-07-10'
      // lines[2] = '' (blank line)
      // lines[3] = first guess row: ⬛🟨🟩⬛🟩
      // lines[4] = second guess row: 🟩🟩🟩🟩🟩
      expect(lines[3]).toBe('⬛🟨🟩⬛🟩');
      expect(lines[4]).toBe('🟩🟩🟩🟩🟩');
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

    it('handles daily mode', () => {
      const dailyResult = { ...baseResult, mode: 'daily' as const };
      const text = generateShareText(dailyResult);
      expect(text).toContain('Daily Challenge');
    });

    it('handles endless mode', () => {
      const endlessResult = { ...baseResult, mode: 'endless' as const };
      const text = generateShareText(endlessResult);
      expect(text).toContain('Endless');
    });

    it('handles free mode', () => {
      const freeResult = { ...baseResult, mode: 'free' as const };
      const text = generateShareText(freeResult);
      expect(text).toContain('Free Play');
    });
  });
});
