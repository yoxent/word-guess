import type { PlayerStats } from '../types';
import {
  readStatsProfile,
  writeStatsProfile,
  getStatsOwnerPlayerId,
  setStatsOwnerPlayerId,
  setEndlessTotalWords,
  setEndlessStreak,
  getEndlessStreak,
  getEndlessTotalWords,
} from './storage';
import { getPlayerStatsResult, updatePlayerStats } from './firestoreService';
import { mergePlayerStats } from './mergePlayerStats';
import type {
  EndlessCounters,
  StatsProfileSlice,
  MergePlayerStatsResult,
} from './mergePlayerStats';
import { enqueueEvent, removeEventsByType } from './syncQueue';
import { useStatsStore } from '../stores/statsStore';

export type SyncPlayerProfileResult = {
  ok: boolean;
  action?: MergePlayerStatsResult['action'];
};

function emptyStatsFields(): PlayerStats {
  return {
    totalGames: 0,
    wins: 0,
    winRate: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [],
    gamesByLength: {},
    lastGameDate: '',
    perModeStreaks: {},
  };
}

function emptyEndless(): EndlessCounters {
  return { endlessTotalWords: 0, endlessStreakNormal: 0, endlessStreakHard: 0 };
}

function emptyProfileSlice(): StatsProfileSlice {
  return { stats: emptyStatsFields(), endless: emptyEndless(), updatedAtMs: 0 };
}

/** Reads the local profile + MMKV endless counters as a merge-ready slice. */
function readLocalSlice(): StatsProfileSlice | null {
  const profile = readStatsProfile();
  const endless: EndlessCounters = {
    endlessTotalWords: getEndlessTotalWords(),
    endlessStreakNormal: getEndlessStreak(false),
    endlessStreakHard: getEndlessStreak(true),
  };
  const hasEndlessActivity =
    endless.endlessTotalWords > 0 ||
    endless.endlessStreakNormal > 0 ||
    endless.endlessStreakHard > 0;

  if (!profile && !hasEndlessActivity) return null;

  return {
    stats: profile?.stats ?? emptyStatsFields(),
    endless,
    updatedAtMs: profile?.updatedAtMs ?? 0,
  };
}

/**
 * Pull → merge/replace → hydrate → push → reconcile orchestration, run on
 * sign-in / silent sign-in / foreground retry (D-4, see cloud-sync wiki).
 *
 * `mergePlayerStats` treats `cloud == null` as an unconditional `upload`
 * before it ever checks for an owner mismatch (Task 1 known gap — see
 * `.superpowers/sdd/progress.md`). On an account switch (`statsOwnerPlayerId`
 * set and different from `playerId`) where the *new* account has no cloud
 * doc yet, that would otherwise upload the prior owner's local totals into
 * the new account. Detect that case here and force a `replace` with an empty
 * profile instead of calling into `mergePlayerStats` with the stranger's
 * local slice.
 *
 * Never throws — every branch below either returns normally or is caught
 * by the outer try/catch, so callers (authStore, App.tsx) can safely await
 * this without their own try/catch swallowing an unrelated auth error.
 */
export async function syncPlayerProfileOnAuth(params: {
  playerId: string;
  playerName: string;
}): Promise<SyncPlayerProfileResult> {
  const { playerId, playerName } = params;

  try {
    const owner = getStatsOwnerPlayerId();
    const ownerMismatch = owner != null && owner !== playerId;

    // On any account switch — not only the missing-cloud case below — drop
    // whatever `game_result` snapshot the *prior* owner queued before this
    // sync ever merges/pushes. If this sync's own push later fails (network
    // drop, quota, etc.) it re-enqueues under the *new* owner's id, but a
    // stale prior-owner entry left in place until then could otherwise be
    // drained (by the periodic/foreground drain, which runs independently
    // of this function's `{ ok: false }` result) and pushed to the new
    // account under its name.
    if (ownerMismatch) {
      await removeEventsByType('game_result');
    }

    const local = readLocalSlice();

    const cloudResult = await getPlayerStatsResult(playerId);
    if (cloudResult.kind === 'error') {
      return { ok: false };
    }

    const cloud: StatsProfileSlice | null =
      cloudResult.kind === 'found'
        ? {
            stats: cloudResult.profile.stats,
            endless: cloudResult.profile.endless,
            updatedAtMs: cloudResult.profile.updatedAtMs,
          }
        : null;

    const mergeResult: MergePlayerStatsResult =
      ownerMismatch && cloud == null
        ? { action: 'replace', profile: emptyProfileSlice() }
        : mergePlayerStats({
            local,
            cloud,
            currentPlayerId: playerId,
            statsOwnerPlayerId: owner,
          });

    const { profile, action } = mergeResult;

    writeStatsProfile({ stats: profile.stats, updatedAtMs: profile.updatedAtMs });
    setEndlessTotalWords(profile.endless.endlessTotalWords);
    setEndlessStreak(profile.endless.endlessStreakNormal, false);
    setEndlessStreak(profile.endless.endlessStreakHard, true);
    setStatsOwnerPlayerId(playerId);
    await useStatsStore.getState().loadStats();

    const pushed = await updatePlayerStats(playerId, playerName, profile.stats, profile.endless);

    if (!pushed) {
      await enqueueEvent('game_result', {
        stats: profile.stats,
        endless: profile.endless,
        updatedAtMs: profile.updatedAtMs,
      });
      return { ok: false, action };
    }

    await removeEventsByType('game_result');

    // Lazy require: leaderboardService statically imports authStore, and
    // authStore wires syncPlayerProfileOnAuth on sign-in — a static import
    // here would create an authStore <-> playerProfileSync <-> leaderboardService
    // load-order cycle (same reason storage.ts lazy-requires statsProfile.ts).
    const leaderboardService: typeof import('./leaderboardService') = require('./leaderboardService');
    await leaderboardService.reconcileLocalLeaderboardScores();

    return { ok: true, action };
  } catch {
    return { ok: false };
  }
}
