export {
  mmkvZustandStorage,
  getSettings,
  saveSettings,
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  initDatabase,
  getStats,
  computeStatsFromHistory,
  saveGameResult,
  getAuthToken,
  setAuthToken,
  getDailyCompletedLengths,
  markDailyCompleted,
  getEndlessStreak,
  setEndlessStreak,
  getEndlessTotalWords,
  incrementEndlessTotalWords,
  setEndlessTotalWords,
  getStatsOwnerPlayerId,
  setStatsOwnerPlayerId,
  readStatsProfile,
  writeStatsProfile,
  clearStatsProfile,
} from './storage';
export type { StoredStatsProfile } from './storage';

export { applyGameToStats, recordGameToProfile, emptyStats as emptyPlayerStats } from './statsProfile';
export type { GameForStats } from './statsProfile';

export { evaluateGuess, validateHardMode, isValidGuess } from './wordLogic';

export { getDailyDateString, getDailyWordIndex } from './dailySeed';

export {
  init as initSound,
  setBgmVolume,
  setSfxVolume,
  pauseBgm,
  resumeBgm,
  playKeyPress,
  playReveal,
  playWin,
  playLoss,
} from './sound';
export type { VolumeLevel } from './sound';

export {
  updatePlayerStats,
  getPlayerStats,
  getPlayerStatsResult,
  submitLeaderboardScore,
  getLeaderboard,
} from './firestoreService';
export type { LeaderboardType, CloudPlayerProfile, GetPlayerStatsResult } from './firestoreService';

export {
  enqueueEvent,
  drainQueue,
  getQueueLength,
  clearQueue,
  removeEventsByType,
} from './syncQueue';
export type { SyncEvent } from './syncQueue';

export {
  submitScore,
  updateLeaderboardAfterGame,
  syncLeaderboardForSession,
  reconcileLocalLeaderboardScores,
  drainLeaderboardScoreEvent,
  getLeaderboardData,
} from './leaderboardService';

export {
  computeLeaderboardMetrics,
  getLeaderboardMetrics,
} from './leaderboardMetrics';
export type { LeaderboardMetrics } from './leaderboardMetrics';

export { syncPlayerProfileOnAuth } from './playerProfileSync';
export type { SyncPlayerProfileResult } from './playerProfileSync';

export {
  configureAuth,
  configureGoogleSignIn,
  signIn,
  signInWithGoogle,
  signOut,
  signOutFromGoogle,
  signInSilently,
  getCurrentUser,
  onAuthStateChanged,
  getSignInButtonLabel,
  isUsingPlayGamesAuth,
  AuthError,
  AuthErrorCode,
} from './authService';
export type { SignInResult, SilentlySignInResult, AuthUser } from './authService';
/** @deprecated Use SignInResult */
export type { SignInResult as GoogleSignInResult } from './authService';
