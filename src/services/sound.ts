import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { useSettingsStore } from '../stores/settingsStore';

/** Volume in [0, 1]. */
export type VolumeLevel = number;

// Module-level state
let _sfxPlayers: Record<string, AudioPlayer> = {};
let _bgmPlayer: AudioPlayer | null = null;
let _currentBgmVolume: VolumeLevel = 0.75;
let _currentSfxVolume: VolumeLevel = 0.75;

/**
 * Initialize the audio system. Loads the BGM player (looping) and the four
 * SFX players. Audio mode is configured to:
 *  - play in silent mode (iOS)
 *  - NOT keep playing in background
 *  - duck other audio (so the BGM gets quieter when SFX plays)
 */
export async function init(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });

  // Read current volume settings from the store
  const settings = useSettingsStore.getState();
  _currentBgmVolume = settings.bgmVolume;
  _currentSfxVolume = settings.sfxVolume;

  // Load SFX players
  const soundFiles: Record<string, number> = {
    keypress: require('../../assets/sounds/keypress.wav'),
    reveal: require('../../assets/sounds/reveal.wav'),
    win: require('../../assets/sounds/win.wav'),
    loss: require('../../assets/sounds/lose.wav'),
  };

  for (const [name, source] of Object.entries(soundFiles)) {
    try {
      const player = createAudioPlayer(source);
      player.volume = _currentSfxVolume;
      _sfxPlayers[name] = player;
    } catch (e) {
      console.warn(`[sound] Failed to load SFX ${name}:`, e);
    }
  }

  // Load BGM player (looping)
  try {
    _bgmPlayer = createAudioPlayer(require('../../assets/sounds/bgm.wav'));
    _bgmPlayer.loop = true;
    _bgmPlayer.volume = _currentBgmVolume;
    if (_currentBgmVolume > 0) {
      _bgmPlayer.play();
    }
  } catch (e) {
    console.warn('[sound] Failed to load BGM:', e);
  }
}

/**
 * Update the BGM player's volume. If transitioning from 0 to >0, start
 * playback. If transitioning to 0, just set volume (don't destroy — the
 * player can be resumed instantly when the user turns BGM back on).
 */
export function setBgmVolume(v: VolumeLevel): void {
  if (Number.isNaN(v) || !Number.isFinite(v)) return;
  const wasAudible = _currentBgmVolume > 0;
  _currentBgmVolume = v;
  if (!_bgmPlayer) return;
  try {
    _bgmPlayer.volume = v;
    if (v > 0) {
      if (!wasAudible) {
        // Transitioning from silent (0, paused by user, or app background)
        // to audible. Start playback. We do NOT call play() on every
        // volume change — that would either restart the loop (causing
        // audible glitches) or stack audio sessions (causing the static
        // noise bug). Only the 0→>0 transition needs play().
        _bgmPlayer.play();
      }
    } else if (wasAudible) {
      // Transitioning to 0: actually pause the player to free the audio
      // output + CPU. Setting volume=0 alone plays silence, which keeps
      // the player running in the background.
      _bgmPlayer.pause();
    }
  } catch (e) {
    console.warn('[sound] Failed to set BGM volume:', e);
  }
}

/**
 * Update the SFX volume. Applies to all SFX players. Volume=0 means SFX
 * are silent (the play() function short-circuits on the call site, but
 * this also disables any in-flight playback).
 */
export function setSfxVolume(v: VolumeLevel): void {
  if (Number.isNaN(v) || !Number.isFinite(v)) return;
  _currentSfxVolume = v;
  for (const player of Object.values(_sfxPlayers)) {
    try {
      player.volume = v;
    } catch (e) {
      console.warn('[sound] Failed to set SFX player volume:', e);
    }
  }
}

/**
 * Pause BGM (called from AppState 'background' / 'inactive' listener).
 * Does NOT destroy the player — playback resumes from where it stopped.
 * Cancels any pending duck-restore timer so a stale timer doesn't
 * restore the BGM volume while the user expects it to stay paused.
 */
export function pauseBgm(): void {
  if (_duckRestoreTimer) {
    clearTimeout(_duckRestoreTimer);
    _duckRestoreTimer = null;
  }
  if (!_bgmPlayer) return;
  try {
    _bgmPlayer.pause();
  } catch (e) {
    console.warn('[sound] Failed to pause BGM:', e);
  }
}

/**
 * Resume BGM (called from AppState 'active' listener). Only starts if
 * the current BGM volume is > 0.
 */
export function resumeBgm(): void {
  if (!_bgmPlayer) return;
  if (_currentBgmVolume === 0) return;
  try {
    _bgmPlayer.play();
  } catch (e) {
    console.warn('[sound] Failed to resume BGM:', e);
  }
}

// ── SFX playback (with BGM ducking) ──

/**
 * How long to duck the BGM (reduce to 30% of its intended volume) while
 * each SFX plays. After the duration elapses, the BGM is restored to
 * its intended volume. These are approximate — slightly too long is
 * fine, slightly too short risks a brief volume jump mid-tail.
 */
const SFX_DUCK_DURATION_MS: Record<string, number> = {
  keypress: 200,
  reveal: 350,
  win: 2200,
  loss: 1800,
};
const DUCK_RATIO = 0.3;
let _duckRestoreTimer: ReturnType<typeof setTimeout> | null = null;

function play(name: string): void {
  if (_currentSfxVolume === 0) return;
  const player = _sfxPlayers[name];
  if (!player) return;
  try {
    // Duck the BGM while the SFX plays. Without this, the combined
    // audio output of BGM + SFX can exceed 1.0 and clip — which the
    // user hears as static / distortion. We restore the BGM to its
    // intended volume after the SFX has finished.
    // We set the player volume directly (bypassing setBgmVolume) so
    // the play/pause transition logic in setBgmVolume isn't disturbed.
    if (_bgmPlayer && _currentBgmVolume > 0) {
      _bgmPlayer.volume = _currentBgmVolume * DUCK_RATIO;
      if (_duckRestoreTimer) clearTimeout(_duckRestoreTimer);
      const duckMs = SFX_DUCK_DURATION_MS[name] ?? 300;
      _duckRestoreTimer = setTimeout(() => {
        if (_bgmPlayer) {
          _bgmPlayer.volume = _currentBgmVolume;
        }
        _duckRestoreTimer = null;
      }, duckMs);
    }
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn(`[sound] Failed to play ${name}:`, e);
  }
}

export function playKeyPress(): void {
  play('keypress');
}

export function playReveal(): void {
  play('reveal');
}

export function playWin(): void {
  play('win');
}

export function playLoss(): void {
  play('loss');
}
