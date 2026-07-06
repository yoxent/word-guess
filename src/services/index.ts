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
} from './storage';

export { evaluateGuess, validateHardMode, isValidGuess } from './wordLogic';

export { getDailyDateString, getDailyWordIndex } from './dailySeed';

export { init as initSound, setEnabled as setSoundEnabled, playKeyPress, playReveal, playWin, playLoss } from './sound';

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
