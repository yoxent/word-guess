import { evaluateGuess, validateHardMode, isValidGuess } from '../wordLogic';

describe('wordLogic', () => {
  describe('evaluateGuess', () => {
    it('returns empty array for invalid input', () => {
      expect(evaluateGuess('', 'APPLE')).toEqual([]);
      expect(evaluateGuess('APPLE', '')).toEqual([]);
      expect(evaluateGuess('APP', 'APPLE')).toEqual([]);
      expect(evaluateGuess('APPLE', 'APP')).toEqual([]);
    });

    it('marks all correct when guess equals target', () => {
      const result = evaluateGuess('APPLE', 'APPLE');
      expect(result).toHaveLength(5);
      expect(result.every((f) => f.feedback === 'correct')).toBe(true);
    });

    it('marks all absent when no letters match', () => {
      const result = evaluateGuess('APPLE', 'ZZZZZ');
      expect(result.every((f) => f.feedback === 'absent')).toBe(true);
    });

    it('marks present for letters in wrong position', () => {
      const result = evaluateGuess('APPLE', 'PLEAP');
      // P: present (position 0, P is at position 1 in target)
      // L: present (position 1, L is at position 2 in target)
      // E: present (position 2, E is at position 3 in target)
      // A: present (position 3, A is at position 0 in target)
      // P: present (position 4, P is at position 1 in target)
      expect(result[0].feedback).toBe('present');
      expect(result[1].feedback).toBe('present');
      expect(result[2].feedback).toBe('present');
      expect(result[3].feedback).toBe('present');
      expect(result[4].feedback).toBe('present');
    });

    it('handles duplicate letters correctly', () => {
      // Target has 2 P's, guess has 3 P's
      const result = evaluateGuess('APPLE', 'PPPZZ');
      const pResults = result.filter((f) => f.letter === 'P');
      // First P: correct (position 1)
      // Second P: correct (position 2)
      // Third P: absent (no more P's in target)
      expect(pResults.filter((f) => f.feedback === 'correct')).toHaveLength(2);
      expect(pResults.filter((f) => f.feedback === 'absent')).toHaveLength(1);
    });

    it('handles partial duplicate correctly', () => {
      // Target: APPLE (A,P,P,L,E), Guess: PXXPP
      // P at 0: present (P exists at positions 1,2 in target)
      // X at 1: absent
      // X at 2: absent  
      // P at 3: present (there's still an unmatched P at position 2)
      // P at 4: absent (no more P's left)
      const result = evaluateGuess('APPLE', 'PXXPP');
      expect(result[0].feedback).toBe('present');
      expect(result[1].feedback).toBe('absent');
      expect(result[2].feedback).toBe('absent');
      expect(result[3].feedback).toBe('present');
      expect(result[4].feedback).toBe('absent');
    });

    it('preserves letter in feedback', () => {
      const result = evaluateGuess('HELLO', 'WORLD');
      expect(result[0].letter).toBe('W');
      expect(result[1].letter).toBe('O');
      expect(result[2].letter).toBe('R');
      expect(result[3].letter).toBe('L');
      expect(result[4].letter).toBe('D');
    });

    it('handles different word lengths', () => {
      const result6 = evaluateGuess('STONE', 'STOVE');
      expect(result6).toHaveLength(5);

      const result7 = evaluateGuess('CASTLE', 'CASTLE');
      expect(result7).toHaveLength(6);
      expect(result7.every((f) => f.feedback === 'correct')).toBe(true);
    });
  });

  describe('validateHardMode', () => {
    it('allows first guess (no previous feedback)', () => {
      const result = validateHardMode([], 'APPLE');
      expect(result.valid).toBe(true);
    });

    it('requires green tiles in same position', () => {
      const previousFeedback = [
        [
          { letter: 'A', feedback: 'correct' as const },
          { letter: 'P', feedback: 'absent' as const },
          { letter: 'P', feedback: 'absent' as const },
          { letter: 'L', feedback: 'absent' as const },
          { letter: 'E', feedback: 'absent' as const },
        ],
      ];
      // A must be at position 0
      expect(validateHardMode(previousFeedback, 'A----').valid).toBe(true);
      expect(validateHardMode(previousFeedback, 'BATCH').valid).toBe(false);
    });

    it('requires yellow letters somewhere in guess', () => {
      const previousFeedback = [
        [
          { letter: 'A', feedback: 'absent' as const },
          { letter: 'P', feedback: 'present' as const },
          { letter: 'P', feedback: 'absent' as const },
          { letter: 'L', feedback: 'absent' as const },
          { letter: 'E', feedback: 'absent' as const },
        ],
      ];
      // P must appear somewhere
      expect(validateHardMode(previousFeedback, 'XXXXX').valid).toBe(false);
      expect(validateHardMode(previousFeedback, 'PXXXX').valid).toBe(true);
    });

    it('handles multiple yellow letters', () => {
      const previousFeedback = [
        [
          { letter: 'C', feedback: 'present' as const },
          { letter: 'R', feedback: 'present' as const },
          { letter: 'A', feedback: 'absent' as const },
          { letter: 'N', feedback: 'absent' as const },
          { letter: 'E', feedback: 'absent' as const },
        ],
      ];
      // Both C and R must appear
      expect(validateHardMode(previousFeedback, 'XXXXX').valid).toBe(false);
      expect(validateHardMode(previousFeedback, 'CXXXX').valid).toBe(false);
      expect(validateHardMode(previousFeedback, 'CRXXX').valid).toBe(true);
    });

    it('handles combined green and yellow constraints', () => {
      const previousFeedback = [
        [
          { letter: 'C', feedback: 'correct' as const },
          { letter: 'R', feedback: 'present' as const },
          { letter: 'A', feedback: 'absent' as const },
          { letter: 'N', feedback: 'absent' as const },
          { letter: 'E', feedback: 'absent' as const },
        ],
      ];
      // C must be at position 0, R must appear somewhere
      expect(validateHardMode(previousFeedback, 'CR---').valid).toBe(true);
      expect(validateHardMode(previousFeedback, 'C----').valid).toBe(false); // missing R
      expect(validateHardMode(previousFeedback, 'R---C').valid).toBe(false); // C not at 0
    });
  });

  describe('isValidGuess', () => {
    const wordList = ['APPLE', 'BANANA', 'CRANE', 'STONE'];

    it('returns true for valid word', () => {
      expect(isValidGuess('APPLE', wordList)).toBe(true);
    });

    it('returns true case-insensitive', () => {
      expect(isValidGuess('apple', wordList)).toBe(true);
      expect(isValidGuess('Apple', wordList)).toBe(true);
    });

    it('returns false for invalid word', () => {
      expect(isValidGuess('XXXXX', wordList)).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(isValidGuess('', wordList)).toBe(false);
      expect(isValidGuess('APPLE', [])).toBe(false);
      expect(isValidGuess('APPLE', null as unknown as string[])).toBe(false);
    });
  });
});
