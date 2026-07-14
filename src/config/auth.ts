/**
 * Play Games → Firebase Auth configuration.
 *
 * Auth is Android-only via Play Games Services. The Web client ID is used for
 * Play Games `requestServerSideAccess` (server auth code → Firebase credential).
 */

/** Firebase Web client ID — used for Play Games server auth. */
export const FIREBASE_WEB_CLIENT_ID =
  '765565366850-kadse78msbqs0r8gab1gue4faoukbngu.apps.googleusercontent.com';

/** Play Games Services project ID (Play Console → Configuration). */
export const PLAY_GAMES_APP_ID = '765565366850';

/**
 * Play Games Services App ID from Play Console → Play Games Services →
 * Configuration. Required for auto sign-in.
 */
export function getPlayGamesAppId(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ?? '';
  if (fromEnv.trim().length > 0) return fromEnv.trim();
  return PLAY_GAMES_APP_ID;
}

export function isPlayGamesConfigured(): boolean {
  return getPlayGamesAppId().length > 0;
}
