/**
 * Auth service — Play Games → Firebase Auth (Android).
 *
 * Flow:
 *   PlayGamesSdk auto / interactive sign-in
 *   → requestServerSideAccess(webClientId)
 *   → native PlayGamesAuthProvider → Firebase Auth
 *   → persist Firebase UID as playerId (Firestore rules require auth.uid)
 */

import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import PlayGamesAuth from '../../modules/play-games-auth';
import { FIREBASE_WEB_CLIENT_ID, PLAY_GAMES_APP_ID } from '../config/auth';
import { resolveFirebasePlayerId } from '../utils/authState';

const firebaseAuth = auth();

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

export interface SignInResult {
  user: AuthUser;
}

export type SilentlySignInResult = { user: AuthUser };

export enum AuthErrorCode {
  SIGN_IN_CANCELLED = 'SIGN_IN_CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE = 'PLAY_SERVICES_NOT_AVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  UNKNOWN = 'UNKNOWN',
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function playGamesAppIdFromConfig(): string {
  const extra = Constants.expoConfig?.extra as
    | { playGamesAppId?: string }
    | undefined;
  return (
    extra?.playGamesAppId ??
    process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ??
    PLAY_GAMES_APP_ID
  ).trim();
}

/** True when Play Games auth can run (Android + App ID configured). */
export function isPlayGamesAuthAvailable(): boolean {
  return Platform.OS === 'android' && playGamesAppIdFromConfig().length > 0;
}

/** @deprecated Use isPlayGamesAuthAvailable — Play Games is the only provider. */
export function isUsingPlayGamesAuth(): boolean {
  return isPlayGamesAuthAvailable();
}

/**
 * Call once at startup. Play Games SDK initializes natively; this is a
 * no-op kept so App.tsx has a stable configure hook.
 */
export function configureAuth(): void {
  // Native PlayGamesSdk.initialize runs in PlayGamesAuthModule OnCreate.
}

function mapNativePlayGamesError(error: unknown): AuthError {
  const anyErr = error as { code?: string; message?: string } | null;
  const code = anyErr?.code ?? '';
  const message = anyErr?.message ?? 'Play Games sign-in failed.';

  if (code === 'E_SILENT_FAILED') {
    return new AuthError(AuthErrorCode.SIGN_IN_CANCELLED, message);
  }
  if (code === 'E_NOT_AUTHENTICATED') {
    // Games UI closed without a session — cancel or Games Services misconfig.
    return new AuthError(AuthErrorCode.SIGN_IN_CANCELLED, message);
  }
  if (code === 'E_CONFIG' || code === 'E_SERVER_AUTH' || code === 'E_FIREBASE') {
    return new AuthError(AuthErrorCode.CONFIGURATION_ERROR, message);
  }
  return new AuthError(AuthErrorCode.UNKNOWN, message);
}

async function signInWithPlayGames(interactive: boolean): Promise<SignInResult> {
  if (Platform.OS !== 'android') {
    throw new AuthError(
      AuthErrorCode.UNSUPPORTED_PLATFORM,
      'Sign-in is only available on Android via Play Games.',
    );
  }

  const appId = playGamesAppIdFromConfig();
  if (!appId) {
    throw new AuthError(
      AuthErrorCode.CONFIGURATION_ERROR,
      'Play Games App ID is not set. Add PLAY_GAMES_APP_ID from Play Console → Play Games Services → Configuration, then rebuild the native app.',
    );
  }

  try {
    const user = await PlayGamesAuth.signInWithFirebase(
      FIREBASE_WEB_CLIENT_ID,
      interactive,
    );
    const playerId = resolveFirebasePlayerId(user.uid);
    if (!playerId) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        'Play Games Firebase sign-in returned an empty UID.',
      );
    }
    return {
      user: {
        id: playerId,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
      },
    };
  } catch (error: unknown) {
    if (error instanceof AuthError) throw error;
    throw mapNativePlayGamesError(error);
  }
}

/** Interactive sign-in (Settings / Leaderboard button). */
export async function signIn(): Promise<SignInResult> {
  return signInWithPlayGames(true);
}

/**
 * Startup / silent sign-in. Never throws — returns null when no session.
 * Uses Play Games non-interactive path (auto-auth from PGS v2).
 */
export async function signInSilently(): Promise<SilentlySignInResult | null> {
  try {
    if (!isPlayGamesAuthAvailable()) {
      return getCurrentUser();
    }

    // Wait for Firebase disk restore before assuming there is no session.
    const restored = await waitForFirebaseAuthReady();
    if (restored) return restored;

    try {
      const result = await signInWithPlayGames(false);
      return { user: result.user };
    } catch (error: unknown) {
      if (error instanceof AuthError && error.code === AuthErrorCode.SIGN_IN_CANCELLED) {
        return null;
      }
      if (__DEV__) {
        console.log('[authService] Play Games silent sign-in unavailable', error);
      }
      return null;
    }
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await PlayGamesAuth.signOutFirebase();
  } catch {
    // Firebase sign-out failure is non-fatal — clear local state anyway
  }
}

export function getCurrentUser(): SilentlySignInResult | null {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return null;
    return {
      user: {
        id: currentUser.uid,
        name: currentUser.displayName,
        email: currentUser.email,
        photo: currentUser.photoURL,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Wait until Firebase Auth finishes restoring any persisted session.
 * Without this, cold start often sees currentUser === null and races Play Games.
 */
export function waitForFirebaseAuthReady(timeoutMs = 4000): Promise<SilentlySignInResult | null> {
  const existing = getCurrentUser();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: SilentlySignInResult | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    };

    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const playerId = resolveFirebasePlayerId(firebaseUser.uid);
        if (!playerId) {
          finish(null);
          return;
        }
        finish({
          user: {
            id: playerId,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photo: firebaseUser.photoURL,
          },
        });
        return;
      }
      // First null emission = restore finished with no user — stop waiting.
      finish(null);
    });

    const timer = setTimeout(() => finish(getCurrentUser()), timeoutMs);
  });
}

export function onAuthStateChanged(
  callback: (user: { id: string; name: string | null } | null) => void,
): () => void {
  return firebaseAuth.onAuthStateChanged((firebaseUser) => {
    if (firebaseUser) {
      callback({
        id: firebaseUser.uid,
        name: firebaseUser.displayName,
      });
    } else {
      callback(null);
    }
  });
}

export function getSignInButtonLabel(): string {
  return 'Sign in with Play Games';
}
