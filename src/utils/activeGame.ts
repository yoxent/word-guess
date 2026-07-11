import type { GameMode, GameSession } from '../types';

/** Saved game has meaningful progress worth offering Continue. */
export function hasActiveProgress(session: GameSession): boolean {
  return (
    session.status === 'playing' &&
    (session.guesses.length > 0 ||
      session.extraGuessesUsed > 0 ||
      session.letterHintUsed)
  );
}

/**
 * Whether a saved session is the same "slot" as the mode the user selected.
 * Random mode uses a single slot — any in-progress random game counts.
 */
export function matchesResumeTarget(
  saved: GameSession,
  mode: GameMode,
  length: number,
  hardMode: boolean,
): boolean {
  if (saved.mode !== mode || saved.hardMode !== hardMode) return false;
  if (mode === 'random') return true;
  return saved.letterCount === length;
}

export function shouldOfferContinue(
  saved: GameSession | null,
  mode: GameMode,
  length: number,
  hardMode: boolean,
): saved is GameSession {
  return !!saved && hasActiveProgress(saved) && matchesResumeTarget(saved, mode, length, hardMode);
}

/** Whether GameScreen should restore MMKV state instead of starting fresh. */
export function shouldRestoreActiveGame(
  saved: GameSession | null,
  mode: GameMode,
  length: number,
  hardMode: boolean,
): saved is GameSession {
  return (
    !!saved &&
    saved.status === 'playing' &&
    saved.mode === mode &&
    saved.hardMode === hardMode &&
    (mode === 'random' || saved.letterCount === length)
  );
}
