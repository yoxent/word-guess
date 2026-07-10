import { getDailyDateString, getDailyWordIndex } from '../dailySeed';

describe('dailySeed', () => {
  describe('getDailyDateString', () => {
    it('returns UTC date string', () => {
      const date = new Date('2026-07-10T15:30:00Z');
      expect(getDailyDateString(date)).toBe('2026-07-10');
    });

    it('handles month/day padding', () => {
      const date = new Date('2026-01-05T00:00:00Z');
      expect(getDailyDateString(date)).toBe('2026-01-05');
    });

    it('uses UTC not local time', () => {
      // Create a date that's different in UTC vs US Eastern
      // 2026-07-10 23:00 UTC = 2026-07-10 19:00 EDT
      const date = new Date('2026-07-10T23:00:00Z');
      expect(getDailyDateString(date)).toBe('2026-07-10');
    });

    it('defaults to current date', () => {
      const result = getDailyDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDailyWordIndex', () => {
    it('returns deterministic index for same inputs', () => {
      const index1 = getDailyWordIndex('2026-07-10', 5, 1000);
      const index2 = getDailyWordIndex('2026-07-10', 5, 1000);
      expect(index1).toBe(index2);
    });

    it('returns different index for different dates', () => {
      const index1 = getDailyWordIndex('2026-07-10', 5, 1000);
      const index2 = getDailyWordIndex('2026-07-11', 5, 1000);
      expect(index1).not.toBe(index2);
    });

    it('returns different index for different lengths', () => {
      const index1 = getDailyWordIndex('2026-07-10', 5, 1000);
      const index2 = getDailyWordIndex('2026-07-10', 6, 1000);
      expect(index1).not.toBe(index2);
    });

    it('returns index within valid range', () => {
      const wordCount = 100;
      const index = getDailyWordIndex('2026-07-10', 5, wordCount);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(wordCount);
    });

    it('returns 0 for zero word count', () => {
      expect(getDailyWordIndex('2026-07-10', 5, 0)).toBe(0);
    });

    it('distributes across range', () => {
      // Generate indices for many days and check distribution
      const wordCount = 10;
      const indices = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const date = `2026-07-${String(i + 1).padStart(2, '0')}`;
        indices.add(getDailyWordIndex(date, 5, wordCount));
      }
      // Should hit multiple different indices
      expect(indices.size).toBeGreaterThan(5);
    });
  });
});
