import { FIREBASE_WEB_CLIENT_ID, PLAY_GAMES_APP_ID, isPlayGamesConfigured } from '../auth';

describe('auth config', () => {
  it('exposes the Firebase web client ID used for Play Games server auth', () => {
    expect(FIREBASE_WEB_CLIENT_ID).toContain('.apps.googleusercontent.com');
  });

  it('has the Play Games project ID configured', () => {
    expect(PLAY_GAMES_APP_ID).toBe('765565366850');
  });

  it('reports Play Games as configured when App ID is present', () => {
    expect(isPlayGamesConfigured()).toBe(true);
  });
});
