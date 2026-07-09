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
  _currentBgmVolume = v;
  if (!_bgmPlayer) return;
  try {
    _bgmPlayer.volume = v;
    if (v > 0) {
      // Make sure it's playing (idempotent — no-op if already playing)
      _bgmPlayer.play();
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
 */
export function pauseBgm(): void {
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

// ── SFX playback (unchanged public API) ──

function play(name: string): void {
  if (_currentSfxVolume === 0) return;
  const player = _sfxPlayers[name];
  if (!player) return;
  try {
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
