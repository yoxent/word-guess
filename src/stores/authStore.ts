import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/storage';
import type { AuthState } from '../types';
import * as authService from '../services/authService';
import * as syncQueue from '../services/syncQueue';
import * as firestoreService from '../services/firestoreService';
import { hasSignedInPlayer } from '../utils/authState';

// ── Types ──

interface AuthStoreState extends AuthState {
  isAuthPending: boolean;
  authError: string | null;
  setPlayer: (playerId: string, playerName: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  googleSignIn: () => Promise<boolean>;
  googleSignOut: () => Promise<void>;
  googleSignInSilently: () => Promise<boolean>;
  clearAuthError: () => void;
}

// ── Sync queue drain handler — called after successful sign-in (D-123) ──

const drainHandler = async (event: syncQueue.SyncEvent): Promise<boolean> => {
  if (event.type === 'game_result') {
    const authState = useAuthStore.getState();
    if (!hasSignedInPlayer(authState)) return false;
    return await firestoreService.updatePlayerStats(
      authState.playerId,
      authState.playerName ?? 'Player',
      event.data.stats as any,
    );
  }
  if (event.type === 'leaderboard_score') {
    const { drainLeaderboardScoreEvent } = await import(
      '../services/leaderboardService'
    );
    return drainLeaderboardScoreEvent(event);
  }
  return false;
};

// ── Store ──

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // ── State ──
      isLoggedIn: false,
      playerId: null,
      playerName: null,
      authToken: null,
      isAuthPending: false,
      authError: null,

      // ── Existing actions ──

      setPlayer: async (playerId, playerName, token) => {
        await setAuthToken(token);
        set({ isLoggedIn: true, playerId, playerName, authToken: token });
      },

      signOut: async () => {
        await setAuthToken(null);
        set({
          isLoggedIn: false,
          playerId: null,
          playerName: null,
          authToken: null,
        });
      },

      // ── New Google Sign-In actions ──

      /**
       * Interactive sign-in (Play Games primary, or Google when AUTH_PROVIDER=google).
       */
      googleSignIn: async () => {
        set({ isAuthPending: true, authError: null });
        try {
          const result = await authService.signIn();
          await get().setPlayer(
            result.user.id,
            result.user.name ?? 'Player',
            result.idToken ?? 'play_games_session',
          );

          syncQueue.drainQueue(drainHandler).catch(() => {});

          set({ isAuthPending: false });
          return true;
        } catch (error: unknown) {
          const message =
            error instanceof authService.AuthError
              ? error.message
              : 'Sign-in failed. Please try again.';
          set({ isAuthPending: false, authError: message });
          return false;
        }
      },

      /**
       * Sign out from auth provider + clear local auth state.
       */
      googleSignOut: async () => {
        set({ isAuthPending: true });
        try {
          await authService.signOut();
          await get().signOut();
        } catch {
          await get().signOut();
        }
        set({ isAuthPending: false, authError: null });
      },

      /**
       * Silent / auto sign-in on startup (Play Games auto-auth or Google silent).
       * Soft-fail: do not wipe a persisted session if silent auth is merely
       * racing Play Games / Firebase restore — only clear when we know there
       * is no Firebase user after the attempt.
       */
      googleSignInSilently: async () => {
        try {
          const result = await authService.signInSilently();
          if (result) {
            await get().setPlayer(
              result.user.id,
              result.user.name ?? 'Player',
              'silent_token',
            );

            syncQueue.drainQueue(drainHandler).catch(() => {});

            return true;
          }

          // Confirmed no Firebase session — clear local auth flags.
          const stillSignedIn = authService.getCurrentUser();
          if (!stillSignedIn) {
            set({
              isLoggedIn: false,
              playerId: null,
              playerName: null,
              authToken: null,
            });
          }
          return false;
        } catch {
          if (!authService.getCurrentUser()) {
            set({
              isLoggedIn: false,
              playerId: null,
              playerName: null,
              authToken: null,
            });
          }
          return false;
        }
      },

      /**
       * Clear auth error state (e.g., after user dismisses error message).
       */
      clearAuthError: () => {
        set({ authError: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // D-120: Transient state (isAuthPending, authError) should NOT be persisted
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        playerId: state.playerId,
        playerName: state.playerName,
        authToken: state.authToken,
      }),
    },
  ),
);
