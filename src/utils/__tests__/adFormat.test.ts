import { selectExtraAttemptAdFormat } from '../adFormat';

describe('selectExtraAttemptAdFormat (D-195)', () => {
  it('uses rewarded for the last remaining attempt', () => {
    expect(selectExtraAttemptAdFormat(1)).toBe('rewarded');
  });

  it('uses rewarded interstitial when more than one attempt remains', () => {
    expect(selectExtraAttemptAdFormat(2)).toBe('rewarded_interstitial');
    expect(selectExtraAttemptAdFormat(3)).toBe('rewarded_interstitial');
  });
});
