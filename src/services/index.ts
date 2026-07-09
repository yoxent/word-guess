export {
  mmkvZustandStorage,
  getSettings,
  saveSettings,
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  initDatabase,
  getStats,
  saveGameResult,
  getAuthToken,
  setAuthToken,
  getDailyCompletedLengths,
  markDailyCompleted,
  getEndlessStreak,
  setEndlessStreak,
  getEndlessTotalWords,
  incrementEndlessTotalWords,
} from './storage';

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
  submitLeaderboardScore,
  getLeaderboard,
} from './firestoreService';
export type { LeaderboardType } from './firestoreService';

export {
  enqueueEvent,
  drainQueue,
  getQueueLength,
  clearQueue,
} from './syncQueue';
export type { SyncEvent } from './syncQueue';

export {
  submitScore,
  updateLeaderboardAfterGame,
  getLeaderboardData,
} from './leaderboardService';

export {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutFromGoogle,
  signInSilently,
  getCurrentUser,
  onAuthStateChanged,
  AuthError,
  AuthErrorCode,
} from './authService';
export type { GoogleSignInResult, SilentlySignInResult } from './authService';
