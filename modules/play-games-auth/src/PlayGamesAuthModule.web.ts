import type { PlayGamesFirebaseUser } from './PlayGamesAuth.types';

/** Web stub — Play Games is Android-only. */
const PlayGamesAuthModule = {
  async isAuthenticated(): Promise<boolean> {
    return false;
  },
  async signInWithFirebase(
    _webClientId: string,
    _interactive: boolean,
  ): Promise<PlayGamesFirebaseUser> {
    throw new Error('Play Games Auth is only available on Android.');
  },
  async signOutFirebase(): Promise<void> {},
};

export default PlayGamesAuthModule;
