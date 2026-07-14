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
/** Round-robin pool so rapid key taps don't pause/seek the same player. */
let _keypressPool: AudioPlayer[] = [];
let _keypressPoolIndex = 0;
let _bgmPlayer: AudioPlayer | null = null;
let _currentBgmVolume: VolumeLevel = 0.75;
let _currentSfxVolume: VolumeLevel = 0.75;

const KEYPRESS_POOL_SIZE = 3;

/**
 * Initialize the audio system. Loads the BGM player (looping) and SFX
 * players. BGM and SFX are separate AudioPlayer instances — they already
 * mix on distinct tracks. Keypresses use a small pool so fast typing can
 * overlap without restarting a single clip.
 *
 * Audio mode mixes with other apps (`mixWithOthers`). Intra-app SFX/BGM
 * balancing for longer clips uses light programmatic ducking (not for
 * keypress — rapid ducking was the main BGM volume "eating" complaint).
 */
export async function init(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });

  // Read current volume settings from the store
  const settings = useSettingsStore.getState();
  _currentBgmVolume = settings.bgmVolume;
  _currentSfxVolume = settings.sfxVolume;

  // Load one-shot SFX (reveal / win / loss)
  const soundFiles: Record<string, number> = {
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

  // Keypress pool — separate players so concurrent taps don't thrash one clip
  const keypressSource = require('../../assets/sounds/keypress.wav');
  _keypressPool = [];
  for (let i = 0; i < KEYPRESS_POOL_SIZE; i++) {
    try {
      const player = createAudioPlayer(keypressSource);
      player.volume = _currentSfxVolume;
      _keypressPool.push(player);
    } catch (e) {
      console.warn(`[sound] Failed to load keypress pool player ${i}:`, e);
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
  for (const player of _keypressPool) {
    try {
      player.volume = v;
    } catch (e) {
      console.warn('[sound] Failed to set keypress pool volume:', e);
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

// ── SFX playback (with optional BGM ducking for longer clips) ──

/**
 * How long to duck the BGM while longer SFX play. Keypress intentionally
 * does NOT duck — short taps at normal volumes rarely clip, and rapid
 * duck/restore was lowering BGM continuously while typing.
 *
 * Longer win/loss/reveal clips still get a light duck so BGM+SFX don't
 * stack past 1.0 and distort (see key-risks P34).
 */
const SFX_DUCK_DURATION_MS: Record<string, number> = {
  reveal: 350,
  win: 2200,
  loss: 1800,
};
const DUCK_RATIO = 0.45;
let _duckRestoreTimer: ReturnType<typeof setTimeout> | null = null;

function duckBgmForSfx(name: string): void {
  const duckMs = SFX_DUCK_DURATION_MS[name];
  if (duckMs == null) return; // keypress / unknown — leave BGM alone
  if (!_bgmPlayer || _currentBgmVolume <= 0) return;
  _bgmPlayer.volume = _currentBgmVolume * DUCK_RATIO;
  if (_duckRestoreTimer) clearTimeout(_duckRestoreTimer);
  _duckRestoreTimer = setTimeout(() => {
    if (_bgmPlayer) {
      _bgmPlayer.volume = _currentBgmVolume;
    }
    _duckRestoreTimer = null;
  }, duckMs);
}

/**
 * Replay an SFX from the start. expo-audio leaves the playhead at the end
 * after a clip finishes, so we must await seekTo(0) before play() — calling
 * play() without a completed seek often no-ops on Android for longer clips
 * (win/lose), while short keypress clips can still "seem" to work.
 */
function play(name: string): void {
  if (_currentSfxVolume === 0) return;
  const player = _sfxPlayers[name];
  if (!player) {
    if (__DEV__) {
      console.warn(`[sound] SFX player missing: ${name}`);
    }
    return;
  }

  void (async () => {
    try {
      duckBgmForSfx(name);
      if (player.playing) {
        player.pause();
      }
      await player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn(`[sound] Failed to play ${name}:`, e);
    }
  })();
}

export function playKeyPress(): void {
  if (_currentSfxVolume === 0) return;
  if (_keypressPool.length === 0) return;

  const player = _keypressPool[_keypressPoolIndex % _keypressPool.length];
  _keypressPoolIndex = (_keypressPoolIndex + 1) % _keypressPool.length;

  void (async () => {
    try {
      // No BGM duck — keypresses are short and frequent.
      if (player.playing) {
        player.pause();
      }
      await player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn('[sound] Failed to play keypress:', e);
    }
  })();
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
