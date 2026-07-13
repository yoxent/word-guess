/**
 * Auth provider selection.
 *
 * `play_games` — Android Play Games Services auto sign-in (production path).
 * `google` — legacy Google Sign-In (kept until Play Games is verified in a
 *            Play-signed / Games-configured build, then remove).
 *
 * Override with EXPO_PUBLIC_AUTH_PROVIDER=google if you need to fall back.
 */
export type AuthProviderId = 'play_games' | 'google';

const envProvider = process.env.EXPO_PUBLIC_AUTH_PROVIDER as
  | AuthProviderId
  | undefined;

export const AUTH_PROVIDER: AuthProviderId =
  envProvider === 'google' ? 'google' : 'play_games';

/** Firebase Web client ID — used for Google Sign-In and Play Games server auth. */
export const FIREBASE_WEB_CLIENT_ID =
  '765565366850-kadse78msbqs0r8gab1gue4faoukbngu.apps.googleusercontent.com';

/**
 * Play Games Services App ID from Play Console → Play Games Services →
 * Configuration. Required for auto sign-in. Set via PLAY_GAMES_APP_ID / app.config.
 */
export function getPlayGamesAppId(): string {
  // Prefer runtime Expo extra when available; fall back to env at build time.
  const fromEnv = process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ?? '';
  return fromEnv.trim();
}

export function isPlayGamesConfigured(): boolean {
  return AUTH_PROVIDER === 'play_games' && getPlayGamesAppId().length > 0;
}
