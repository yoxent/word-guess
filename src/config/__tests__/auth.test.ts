import { AUTH_PROVIDER, FIREBASE_WEB_CLIENT_ID } from '../auth';

describe('auth config', () => {
  it('defaults to play_games provider', () => {
    expect(AUTH_PROVIDER).toBe('play_games');
  });

  it('exposes the Firebase web client ID used for Play Games server auth', () => {
    expect(FIREBASE_WEB_CLIENT_ID).toContain('.apps.googleusercontent.com');
  });
});
