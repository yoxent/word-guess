import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/storage';
import type { AuthState } from '../types';
import * as authService from '../services/authService';
import * as syncQueue from '../services/syncQueue';
import * as firestoreService from '../services/firestoreService';

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
    if (!authState.isLoggedIn) return false;
    return await firestoreService.updatePlayerStats(
      authState.playerId!,
      authState.playerName ?? 'Player',
      event.data.stats as any,
    );
  }
  if (event.type === 'leaderboard_score') {
    const data = event.data as any;
    return await firestoreService.submitLeaderboardScore(
      data.type,
      data.playerId,
      data.playerName,
      data.score,
    );
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
       * Sign in with Google. Calls authService, persists session, drains sync queue.
       * Returns true on success, false on failure (authError set accordingly).
       */
      googleSignIn: async () => {
        set({ isAuthPending: true, authError: null });
        try {
          const result = await authService.signInWithGoogle();
          await get().setPlayer(result.user.id, result.user.name ?? 'Player', result.idToken);

          // Drain deferred sync queue after successful sign-in (D-123)
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
       * Sign out from Google and Firebase, then clear local auth state.
       */
      googleSignOut: async () => {
        set({ isAuthPending: true });
        try {
          await authService.signOutFromGoogle();
          await get().signOut();
        } catch {
          // Sign-out failure is non-fatal — clear local state anyway
          await get().signOut();
        }
        set({ isAuthPending: false, authError: null });
      },

      /**
       * Attempt silent sign-in on app startup (D-118).
       * Restores previous session if available.
       * Clears stale isLoggedIn state if no prior session.
       * Never sets authError on failure (not an error condition).
       */
      googleSignInSilently: async () => {
        try {
          const result = await authService.signInSilently();
          if (result) {
            await get().setPlayer(result.user.id, result.user.name ?? 'Player', 'silent_token');

            // Drain deferred sync queue after successful silent sign-in
            syncQueue.drainQueue(drainHandler).catch(() => {});

            return true;
          } else {
            // Clear stale logged-in state if persist had stale true (D-118, P24)
            set({
              isLoggedIn: false,
              playerId: null,
              playerName: null,
              authToken: null,
            });
            return false;
          }
        } catch {
          // Silent sign-in failure is expected — clear stale state
          set({
            isLoggedIn: false,
            playerId: null,
            playerName: null,
            authToken: null,
          });
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
