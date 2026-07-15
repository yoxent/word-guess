import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/storage';
import type { AuthState } from '../types';
import * as authService from '../services/authService';
import * as syncQueue from '../services/syncQueue';
import * as firestoreService from '../services/firestoreService';
import { syncPlayerProfileOnAuth } from '../services/playerProfileSync';
import {
  applyProEntitlementForSession,
  clearProEntitlementForSignOut,
} from '../services/iapService';
import { hasSignedInPlayer } from '../utils/authState';

// ── Types ──

interface AuthStoreState extends AuthState {
  isAuthPending: boolean;
  authError: string | null;
  setPlayer: (
    playerId: string,
    playerName: string,
    token: string,
    playerPhoto?: string | null,
  ) => Promise<void>;
  /** Clear local auth flags only (no provider call). */
  signOut: () => Promise<void>;
  /** Interactive Play Games sign-in (Settings / Leaderboard). */
  signIn: () => Promise<boolean>;
  /** Sign out from Play Games / Firebase + clear local auth state. */
  signOutAccount: () => Promise<void>;
  /** Silent / auto sign-in on startup. */
  signInSilently: () => Promise<boolean>;
  clearAuthError: () => void;
}

/**
 * Single-flight lock for interactive sign-in.
 * Rapid taps (Settings / Leaderboard) must not open stacked Play Games panels.
 * Cleared in `finally` so cancel / failure always unlocks for a retry.
 */
let interactiveSignInInFlight: Promise<boolean> | null = null;

// ── Sync queue drain handler — called after successful sign-in (D-123) ──

const drainHandler = async (event: syncQueue.SyncEvent): Promise<boolean> => {
  if (event.type === 'game_result') {
    const authState = useAuthStore.getState();
    if (!hasSignedInPlayer(authState)) return false;
    return await firestoreService.updatePlayerStats(
      authState.playerId,
      authState.playerName ?? 'Player',
      event.data.stats as any,
      event.data.endless as any,
    );
  }
  if (event.type === 'leaderboard_score') {
    // Lazy require (not import()) — Hermes can't eval Metro async chunks here.
    const { drainLeaderboardScoreEvent } = require('../services/leaderboardService') as typeof import('../services/leaderboardService');
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
      playerPhoto: null,
      authToken: null,
      isAuthPending: false,
      authError: null,

      setPlayer: async (playerId, playerName, token, playerPhoto = null) => {
        await setAuthToken(token);
        set({
          isLoggedIn: true,
          playerId,
          playerName,
          playerPhoto: playerPhoto ?? null,
          authToken: token,
        });
      },

      signOut: async () => {
        await setAuthToken(null);
        set({
          isLoggedIn: false,
          playerId: null,
          playerName: null,
          playerPhoto: null,
          authToken: null,
        });
      },

      /**
       * Interactive Play Games sign-in → Firebase Auth.
       * Concurrent callers share one in-flight attempt (no stacked native panels).
       */
      signIn: async () => {
        if (interactiveSignInInFlight) {
          return interactiveSignInInFlight;
        }

        interactiveSignInInFlight = (async () => {
          set({ isAuthPending: true, authError: null });
          try {
            const result = await authService.signIn();
            await get().setPlayer(
              result.user.id,
              result.user.name ?? 'Player',
              'play_games_session',
              result.user.photo,
            );

            await syncPlayerProfileOnAuth({
              playerId: result.user.id,
              playerName: result.user.name ?? 'Player',
            });
            syncQueue.drainQueue(drainHandler).catch(() => {});
            applyProEntitlementForSession(true).catch(() => {});

            return true;
          } catch (error: unknown) {
            const message =
              error instanceof authService.AuthError
                ? error.message
                : 'Sign-in failed. Please try again.';
            set({ authError: message });
            return false;
          } finally {
            interactiveSignInInFlight = null;
            set({ isAuthPending: false });
          }
        })();

        return interactiveSignInInFlight;
      },

      /**
       * Sign out from Play Games / Firebase + clear local auth state.
       */
      signOutAccount: async () => {
        set({ isAuthPending: true });
        try {
          await authService.signOut();
          await get().signOut();
        } catch {
          await get().signOut();
        }
        clearProEntitlementForSignOut();
        set({ isAuthPending: false, authError: null });
      },

      /**
       * Silent / auto sign-in on startup (Play Games auto-auth).
       * Soft-fail: do not wipe a persisted session if silent auth is merely
       * racing Play Games / Firebase restore — only clear when we know there
       * is no Firebase user after the attempt.
       */
      signInSilently: async () => {
        try {
          const result = await authService.signInSilently();
          if (result) {
            await get().setPlayer(
              result.user.id,
              result.user.name ?? 'Player',
              'silent_token',
              result.user.photo,
            );

            await syncPlayerProfileOnAuth({
              playerId: result.user.id,
              playerName: result.user.name ?? 'Player',
            });
            syncQueue.drainQueue(drainHandler).catch(() => {});
            applyProEntitlementForSession(true).catch(() => {});

            return true;
          }

          // Confirmed no Firebase session — clear local auth flags.
          const stillSignedIn = authService.getCurrentUser();
          if (!stillSignedIn) {
            set({
              isLoggedIn: false,
              playerId: null,
              playerName: null,
              playerPhoto: null,
              authToken: null,
            });
            clearProEntitlementForSignOut();
          }
          return false;
        } catch {
          if (!authService.getCurrentUser()) {
            set({
              isLoggedIn: false,
              playerId: null,
              playerName: null,
              playerPhoto: null,
              authToken: null,
            });
            clearProEntitlementForSignOut();
          }
          return false;
        }
      },

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
        playerPhoto: state.playerPhoto,
        authToken: state.authToken,
      }),
    },
  ),
);
