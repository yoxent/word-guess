/**
 * Auth service — Play Games (primary) + optional legacy Google Sign-In.
 *
 * Play Games path (Android):
 *   PlayGamesSdk auto / interactive sign-in
 *   → requestServerSideAccess(webClientId)
 *   → native PlayGamesAuthProvider → Firebase Auth
 *   → persist Firebase UID as playerId (Firestore rules require auth.uid)
 *
 * Google path is gated by AUTH_PROVIDER === 'google' until Play Games is verified.
 */

import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import PlayGamesAuth from '../../modules/play-games-auth';
import {
  AUTH_PROVIDER,
  FIREBASE_WEB_CLIENT_ID,
} from '../config/auth';
import { resolveFirebasePlayerId } from '../utils/authState';

const firebaseAuth = auth();

const OAUTH_SCOPES: string[] = ['profile', 'email'];

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

export interface SignInResult {
  user: AuthUser;
  /** Present for Google path only; Play Games uses Firebase session. */
  idToken?: string;
}

export type SilentlySignInResult = { user: AuthUser };

export enum AuthErrorCode {
  SIGN_IN_CANCELLED = 'SIGN_IN_CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE = 'PLAY_SERVICES_NOT_AVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
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
  return (extra?.playGamesAppId ?? process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ?? '').trim();
}

/**
 * Play Games is active only when selected AND App ID is configured.
 * Until Play Console Games Services is wired, we keep the Google path so
 * leaderboards/auth still work during the migration.
 */
export function isUsingPlayGamesAuth(): boolean {
  return (
    AUTH_PROVIDER === 'play_games' &&
    Platform.OS === 'android' &&
    playGamesAppIdFromConfig().length > 0
  );
}

/** Call once at startup. Configures Google when that path is still active. */
export function configureAuth(): void {
  if (!isUsingPlayGamesAuth()) {
    GoogleSignin.configure({
      webClientId: FIREBASE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: OAUTH_SCOPES,
    });
  }
}

/** @deprecated Use configureAuth — kept for older call sites during migration. */
export function configureGoogleSignIn(): void {
  configureAuth();
}

function mapNativePlayGamesError(error: unknown): AuthError {
  const anyErr = error as { code?: string; message?: string } | null;
  const code = anyErr?.code ?? '';
  const message = anyErr?.message ?? 'Play Games sign-in failed.';

  if (code === 'E_SILENT_FAILED' || code === 'E_NOT_AUTHENTICATED') {
    return new AuthError(AuthErrorCode.SIGN_IN_CANCELLED, message);
  }
  if (code === 'E_CONFIG' || code === 'E_SERVER_AUTH' || code === 'E_FIREBASE') {
    return new AuthError(AuthErrorCode.CONFIGURATION_ERROR, message);
  }
  return new AuthError(AuthErrorCode.UNKNOWN, message);
}

async function signInWithPlayGames(interactive: boolean): Promise<SignInResult> {
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

async function getFirebaseGoogleCredential(
  idToken: string,
): Promise<FirebaseAuthTypes.AuthCredential> {
  const tokens = await GoogleSignin.getTokens();
  const firebaseIdToken = tokens.idToken || idToken;

  if (!tokens.accessToken) {
    throw new AuthError(
      AuthErrorCode.CONFIGURATION_ERROR,
      'Google Sign-In failed — no accessToken returned for Firebase Auth credential exchange.',
    );
  }

  return auth.GoogleAuthProvider.credential(firebaseIdToken, tokens.accessToken);
}

async function signInWithGoogleInteractive(): Promise<SignInResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new AuthError(AuthErrorCode.SIGN_IN_CANCELLED, 'Sign-in was cancelled.');
    }

    const { idToken, user: googleUser } = response.data;
    if (!idToken) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        'Google Sign-In failed — no idToken returned. Check Web client ID and SHA-1 fingerprints.',
      );
    }

    const credential = await getFirebaseGoogleCredential(idToken);
    await firebaseAuth.signInWithCredential(credential);

    const firebaseUser = firebaseAuth.currentUser;
    const playerId = resolveFirebasePlayerId(firebaseUser?.uid);
    if (!firebaseUser || !playerId) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        'Firebase Auth sign-in succeeded but no currentUser was available.',
      );
    }

    return {
      user: {
        id: playerId,
        name: firebaseUser.displayName ?? googleUser.name ?? null,
        email: firebaseUser.email ?? googleUser.email ?? null,
        photo: firebaseUser.photoURL ?? googleUser.photo ?? null,
      },
      idToken,
    };
  } catch (error: unknown) {
    if (error instanceof AuthError) throw error;

    const typedError = error as { code?: string | number; message?: string };
    console.error('[authService] signInWithGoogle failed', {
      code: typedError.code,
      message: typedError.message,
      error,
    });

    if (
      typedError.code === statusCodes.SIGN_IN_CANCELLED ||
      typedError.code === 'SIGN_IN_CANCELLED'
    ) {
      throw new AuthError(AuthErrorCode.SIGN_IN_CANCELLED, 'Sign-in was cancelled.');
    }
    if (typedError.code === statusCodes.IN_PROGRESS) {
      throw new AuthError(AuthErrorCode.IN_PROGRESS, 'Sign-in is already in progress.');
    }
    if (typedError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new AuthError(
        AuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE,
        'Google Play Services are not available. Please update Google Play Services.',
      );
    }
    if (typeof typedError.code === 'string' && typedError.code.startsWith('auth/')) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        `Firebase Auth failed (${typedError.code}): ${typedError.message ?? 'check Auth providers in Firebase Console.'}`,
      );
    }
    throw new AuthError(
      AuthErrorCode.CONFIGURATION_ERROR,
      `Google Sign-In failed (${typedError.code ?? 'unknown'}: ${typedError.message ?? 'no message'}).`,
    );
  }
}

/** Interactive sign-in (Settings / Leaderboard button). */
export async function signIn(): Promise<SignInResult> {
  if (isUsingPlayGamesAuth()) {
    return signInWithPlayGames(true);
  }
  return signInWithGoogleInteractive();
}

/** @deprecated Prefer signIn() — Google-only entry kept for migration. */
export async function signInWithGoogle(): Promise<SignInResult> {
  return signInWithGoogleInteractive();
}

/**
 * Startup / silent sign-in. Never throws — returns null when no session.
 * Play Games: uses non-interactive path (auto-auth from PGS v2).
 * Google: GoogleSignin.signInSilently().
 */
export async function signInSilently(): Promise<SilentlySignInResult | null> {
  try {
    if (isUsingPlayGamesAuth()) {
      // Prefer existing Firebase session (fast path after prior launch).
      const existing = getCurrentUser();
      if (existing) return existing;

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
    }

    const response = await GoogleSignin.signInSilently();
    if (response.type === 'noSavedCredentialFound') return null;

    const { idToken, user: googleUser } = response.data;
    if (!idToken) return null;

    const credential = await getFirebaseGoogleCredential(idToken);
    await firebaseAuth.signInWithCredential(credential);

    const firebaseUser = firebaseAuth.currentUser;
    const playerId = resolveFirebasePlayerId(firebaseUser?.uid);
    if (!firebaseUser || !playerId) return null;

    return {
      user: {
        id: playerId,
        name: firebaseUser.displayName ?? googleUser.name ?? null,
        email: firebaseUser.email ?? googleUser.email ?? null,
        photo: firebaseUser.photoURL ?? googleUser.photo ?? null,
      },
    };
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (isUsingPlayGamesAuth()) {
    try {
      await PlayGamesAuth.signOutFirebase();
    } catch {
      // Firebase sign-out failure is non-fatal — clear local state anyway
    }
    return;
  }

  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
  try {
    await firebaseAuth.signOut();
  } catch {
    // ignore
  }
}

/** @deprecated Prefer signOut(). */
export async function signOutFromGoogle(): Promise<void> {
  await signOut();
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
  return isUsingPlayGamesAuth() ? 'Sign in with Play Games' : 'Sign in with Google';
}
