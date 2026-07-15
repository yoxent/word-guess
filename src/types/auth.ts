export interface AuthState {
  isLoggedIn: boolean;
  playerId: string | null;
  playerName: string | null;
  /** Profile photo URL from Firebase / Play Games when available. */
  playerPhoto: string | null;
  authToken: string | null;
}
