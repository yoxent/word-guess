export interface AuthState {
  isLoggedIn: boolean;
  playerId: string | null;
  playerName: string | null;
  authToken: string | null;
}
