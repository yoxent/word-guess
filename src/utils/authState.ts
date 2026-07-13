import type { AuthState } from '../types';

export type SignedInAuthState = AuthState & {
  isLoggedIn: true;
  playerId: string;
};

export function hasSignedInPlayer(
  authState: Pick<AuthState, 'isLoggedIn' | 'playerId'>,
): authState is SignedInAuthState {
  return (
    authState.isLoggedIn === true &&
    typeof authState.playerId === 'string' &&
    authState.playerId.length > 0
  );
}

/**
 * After Google → Firebase credential exchange, persist the Firebase Auth UID.
 * Firestore rules gate writes with `request.auth.uid == playerId`; Google's
 * account id is a different value and causes permission-denied on every write.
 */
export function resolveFirebasePlayerId(
  firebaseUid: string | null | undefined,
): string | null {
  if (typeof firebaseUid !== 'string' || firebaseUid.length === 0) {
    return null;
  }
  return firebaseUid;
}
