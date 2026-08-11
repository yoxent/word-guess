/**
 * D-195: which helper ad format to use for an extra-attempt watch.
 * Last remaining attempt → classic rewarded; otherwise rewarded interstitial.
 */
export type HelperAdFormat = 'rewarded' | 'rewarded_interstitial';

export function selectExtraAttemptAdFormat(
  extraAttemptsRemaining: number,
): HelperAdFormat {
  return extraAttemptsRemaining === 1 ? 'rewarded' : 'rewarded_interstitial';
}
