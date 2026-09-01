export {
  mmkvZustandStorage,
  getSettings,
  saveSettings,
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  toActiveGameSlot,
  activeGameSlotFromSession,
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
export {
  TUTORIAL_ANSWER,
  TUTORIAL_INITIAL_PHASE,
  TUTORIAL_LETTER_COUNT,
  TUTORIAL_WORDS,
  TUTORIAL_WRONG_ANSWER_ERROR,
  expectedGuess,
  isExplainPhase,
  isInputPhase,
  isModalPhase,
  isTutorialKeyAllowed,
  nextPhaseAfterContinue,
  nextPhaseAfterReveal,
  tutorialCallouts,
  tutorialCopy,
  tutorialHighlightedKey,
  tutorialSampleTiles,
  tutorialSubmitError,
} from './tutorialScript';
export type { TutorialCallout, TutorialPhase } from './tutorialScript';

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
  signIn,
  signOut,
  signInSilently,
  getCurrentUser,
  onAuthStateChanged,
  getSignInButtonLabel,
  isPlayGamesAuthAvailable,
  isUsingPlayGamesAuth,
  AuthError,
  AuthErrorCode,
} from './authService';
export type { SignInResult, SilentlySignInResult, AuthUser } from './authService';

export {
  initIap,
  purchasePro,
  restorePro,
  syncProFromStore,
  applyProEntitlementForSession,
  clearProEntitlementForSignOut,
  setIapUiHandlers,
  teardownIap,
} from './iapService';
