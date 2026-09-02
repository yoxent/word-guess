import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { LeaderboardChecksumClaimed } from './leaderboardChecksum';

export type LeaderboardGamePayload = {
  sessionId: string;
  completedAt: string;
  mode: string;
  won: boolean;
  playerName: string;
  checksum: string;
  claimed: LeaderboardChecksumClaimed;
};

export type LeaderboardGameClientResult = 'ok' | 'retry' | 'drop';

export function classifyLeaderboardGameResult(result: {
  ok?: boolean;
  reason?: string;
  throwCode?: string;
}): LeaderboardGameClientResult {
  if (result.throwCode) {
    return 'retry';
  }
  if (result.ok) {
    return 'ok';
  }
  if (result.reason === 'too_soon' || result.reason === 'day_cap') {
    return 'retry';
  }
  return 'drop';
}

export async function callSubmitLeaderboardGame(
  payload: LeaderboardGamePayload,
): Promise<LeaderboardGameClientResult> {
  try {
    const callable = httpsCallable(
      getFunctions(getApp(), 'us-central1'),
      'submitLeaderboardGame',
    );
    const result = await callable(payload);
    const data = result.data as { ok?: unknown; reason?: unknown } | undefined;
    const ok = data?.ok === true;
    const reason = typeof data?.reason === 'string' ? data.reason : undefined;
    const classified = classifyLeaderboardGameResult({ ok, reason });
    if (__DEV__ && classified !== 'ok') {
      console.warn('[leaderboard] submitLeaderboardGame', classified, reason);
    }
    return classified;
  } catch (error) {
    const throwCode =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : 'unavailable';
    if (__DEV__) {
      console.warn('[leaderboard] submitLeaderboardGame threw', throwCode, error);
    }
    return classifyLeaderboardGameResult({ throwCode });
  }
}
