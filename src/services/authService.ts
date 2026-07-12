/**
 * Google Sign-In + Firebase Auth wrapper.
 *
 * Separates SDK concerns from Zustand store (D-119).
 * Handles Google Sign-In lifecycle, Firebase Auth credential exchange,
 * and provides a clean async API for authStore consumption.
 *
 * # Web Client ID (CRITICAL)
 * The `WEB_CLIENT_ID` constant below must be replaced with the actual
 * Firebase Web client ID from Firebase Console → Project Settings →
 * General → Your apps → Web app → Web client ID.
 *
 * This MUST be the **Web** client ID, NOT the Android client ID.
 * Using the wrong client ID is the #1 cause of `DEVELOPER_ERROR` (D-114, P4).
 *
 * @see https://github.com/react-native-google-signin/google-signin
 * @see https://rnfirebase.io/auth/social#google
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged as onFirebaseAuthStateChanged } from '@react-native-firebase/auth';

/** Firebase Auth instance (modular API). */
const firebaseAuth = getAuth();

// ── Configuration ──

// D-114: Pass Web client ID (from Firebase Console → Web credentials)
// IMPORTANT: Must be Web client ID, NOT Android client ID (D-114, P4)
// Developer must replace this value with their Firebase Web client ID
const WEB_CLIENT_ID = '765565366850-kadse78msbqs0r8gab1gue4faoukbngu.apps.googleusercontent.com';

// D-117: Minimal OAuth scopes
const OAUTH_SCOPES: string[] = ['profile', 'email'];

// ── Types ──

export interface GoogleSignInResult {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    photo: string | null;
  };
  idToken: string;
}

export interface SilentlySignInResult {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    photo: string | null;
  };
}

// ── Error types ──

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

// ── Functions ──

async function getFirebaseGoogleCredential(idToken: string) {
  const tokens = await GoogleSignin.getTokens();
  const firebaseIdToken = tokens.idToken || idToken;

  if (!tokens.accessToken) {
    throw new AuthError(
      AuthErrorCode.CONFIGURATION_ERROR,
      'Google Sign-In failed — no accessToken returned for Firebase Auth credential exchange.',
    );
  }

  return GoogleAuthProvider.credential(firebaseIdToken, tokens.accessToken);
}

/**
 * Configure Google Sign-In. Must be called once before any signIn/signOut calls.
 * Safe to call multiple times (GoogleSignin.configure is idempotent).
 */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: OAUTH_SCOPES,
  });
}

/**
 * Attempt to sign in with Google.
 * Returns `{ user, idToken }` on success.
 *
 * Throws `AuthError` with specific codes:
 *   - `SIGN_IN_CANCELLED`: user cancelled the sign-in flow
 *   - `IN_PROGRESS`: another sign-in is already in progress
 *   - `PLAY_SERVICES_NOT_AVAILABLE`: Play Services not installed/updated
 *   - `CONFIGURATION_ERROR`: likely SHA-1 or Web client ID misconfiguration
 *   - `UNKNOWN`: unexpected error
 *
 * After Google Sign-In success, exchanges the idToken for a Firebase Auth credential (D-115).
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    // 1. Check Play Services availability (D-113)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // 2. Sign in with Google
    const response = await GoogleSignin.signIn();

    // v16 API returns discriminated union: { type: 'success', data: User } | { type: 'cancelled', data: null }
    if (response.type === 'cancelled') {
      throw new AuthError(
        AuthErrorCode.SIGN_IN_CANCELLED,
        'Sign-in was cancelled.',
      );
    }

    // Success — extract from response.data
    const { idToken, user: googleUser } = response.data;

    if (!idToken) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        'Google Sign-In failed — no idToken returned. Check Web client ID and SHA-1 fingerprints.',
      );
    }

    // 3. Exchange Google tokens for Firebase Auth credential (D-115)
    const credential = await getFirebaseGoogleCredential(idToken);
    await signInWithCredential(firebaseAuth, credential);

    // 4. Return combined user data
    return {
      user: {
        id: googleUser.id,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        photo: googleUser.photo ?? null,
      },
      idToken,
    };
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      throw error;
    }

    const typedError = error as { code?: string | number; message?: string };
    // Native Google Sign-In / Firebase often put the useful detail here.
    console.error('[authService] signInWithGoogle failed', {
      code: typedError.code,
      message: typedError.message,
      error,
    });

    if (
      typedError.code === statusCodes.SIGN_IN_CANCELLED ||
      typedError.code === 'SIGN_IN_CANCELLED'
    ) {
      throw new AuthError(
        AuthErrorCode.SIGN_IN_CANCELLED,
        'Sign-in was cancelled.',
      );
    }

    if (typedError.code === statusCodes.IN_PROGRESS) {
      throw new AuthError(
        AuthErrorCode.IN_PROGRESS,
        'Sign-in is already in progress.',
      );
    }

    if (typedError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new AuthError(
        AuthErrorCode.PLAY_SERVICES_NOT_AVAILABLE,
        'Google Play Services are not available. Please update Google Play Services.',
      );
    }

    // Firebase Auth credential exchange failures (provider disabled, etc.)
    if (typeof typedError.code === 'string' && typedError.code.startsWith('auth/')) {
      throw new AuthError(
        AuthErrorCode.CONFIGURATION_ERROR,
        `Firebase Auth failed (${typedError.code}): ${typedError.message ?? 'enable Google provider in Firebase Console → Authentication → Sign-in method.'}`,
      );
    }

    // Rethrow with configuration error hint (D-113, P4 mitigation)
    throw new AuthError(
      AuthErrorCode.CONFIGURATION_ERROR,
      `Google Sign-In failed (${typedError.code ?? 'unknown'}: ${typedError.message ?? 'no message'}) — check SHA-1, Web client ID, OAuth consent test users, and Firebase Google provider.`,
    );
  }
}

/**
 * Sign out from both Google Sign-In and Firebase Auth.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google sign-out failure is non-fatal — proceed with Firebase sign-out
  }

  try {
    await signOut(firebaseAuth);
  } catch {
    // Firebase sign-out failure is non-fatal — local state will be cleared
  }
}

/**
 * Attempt silent sign-in (restores previous session).
 * Call on app startup (D-118).
 *
 * Returns user info if successful, `null` if no prior session.
 * Never throws — returns `null` on any failure (no prior sign-in, network, etc.).
 */
export async function signInSilently(): Promise<SilentlySignInResult | null> {
  try {
    const response = await GoogleSignin.signInSilently();

    // v16 API: type === 'noSavedCredentialFound' means no prior session
    if (response.type === 'noSavedCredentialFound') {
      return null;
    }

    const { idToken, user: googleUser } = response.data;

    if (!idToken) {
      return null;
    }

    // Exchange Google tokens for Firebase credential
    const credential = await getFirebaseGoogleCredential(idToken);
    await signInWithCredential(firebaseAuth, credential);

    return {
      user: {
        id: googleUser.id,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        photo: googleUser.photo ?? null,
      },
    };
  } catch {
    // Silent sign-in failure is expected if user never signed in before (D-118)
    return null;
  }
}

/**
 * Returns the currently signed-in Firebase user, or null.
 */
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
 * Subscribe to Firebase Auth state changes.
 * Returns an unsubscribe function.
 * Called when user signs in/out — fires on mount and on change.
 */
export function onAuthStateChanged(
  callback: (user: { id: string; name: string | null } | null) => void,
): () => void {
  return onFirebaseAuthStateChanged(firebaseAuth, (firebaseUser) => {
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
