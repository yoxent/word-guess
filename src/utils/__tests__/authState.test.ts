import { hasSignedInPlayer, resolveFirebasePlayerId } from '../authState';

describe('hasSignedInPlayer', () => {
  it('requires both logged-in state and a player id', () => {
    expect(hasSignedInPlayer({ isLoggedIn: false, playerId: null })).toBe(false);
    expect(hasSignedInPlayer({ isLoggedIn: true, playerId: null })).toBe(false);
    expect(hasSignedInPlayer({ isLoggedIn: true, playerId: '' })).toBe(false);
    expect(hasSignedInPlayer({ isLoggedIn: true, playerId: 'uid-123' })).toBe(true);
  });
});

describe('resolveFirebasePlayerId', () => {
  it('uses Firebase Auth UID for Firestore owner checks', () => {
    expect(resolveFirebasePlayerId('firebase-uid-abc')).toBe('firebase-uid-abc');
  });

  it('rejects missing Firebase Auth UID (Google id alone is not enough)', () => {
    expect(resolveFirebasePlayerId(null)).toBeNull();
    expect(resolveFirebasePlayerId('')).toBeNull();
  });
});
