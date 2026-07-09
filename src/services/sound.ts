import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';

let _enabled = true;
let _players: Record<string, AudioPlayer> = {};

export async function init(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });

  const soundFiles: Record<string, number> = {
    keypress: require('../../assets/sounds/keypress.wav'),
    reveal: require('../../assets/sounds/reveal.wav'),
    win: require('../../assets/sounds/win.wav'),
    loss: require('../../assets/sounds/lose.wav'),
  };

  for (const [name, source] of Object.entries(soundFiles)) {
    try {
      _players[name] = createAudioPlayer(source);
    } catch (e) {
      console.warn(`[sound] Failed to load ${name}:`, e);
    }
  }
}

export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
}

function play(name: string): void {
  if (!_enabled) return;
  const player = _players[name];
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
