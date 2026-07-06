/**
 * No-op sound service stub.
 *
 * Provides the expected API surface so components can wire up sound
 * calls without blocking on implementation. Developer adds real sound
 * files later (~4-6 SFX files under 500KB total via expo-av).
 *
 * @see D-32, D-33, D-34
 */

/** Whether sound effects are enabled (default: true) */
let _enabled = true;

/** Whether the sound system has been initialized */
let _initialized = false;

/**
 * Initializes the sound system.
 *
 * Future: load sound assets via expo-av Audio.Sound.createAsync().
 * Currently just sets initialized flag.
 */
export async function init(): Promise<void> {
  _initialized = true;
}

/**
 * Enables or disables sound effects.
 *
 * @param enabled - true to enable, false to mute
 */
export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/** Plays a key-press click sound. No-op when disabled. */
export function playKeyPress(): void {
  if (!_enabled) return;
  // Future: await keyPressSound.replayAsync();
}

/** Plays the tile reveal animation sound. No-op when disabled. */
export function playReveal(): void {
  if (!_enabled) return;
  // Future: await revealSound.replayAsync();
}

/** Plays the win celebration sound. No-op when disabled. */
export function playWin(): void {
  if (!_enabled) return;
  // Future: await winSound.replayAsync();
}

/** Plays the loss/game-over sound. No-op when disabled. */
export function playLoss(): void {
  if (!_enabled) return;
  // Future: await lossSound.replayAsync();
}
