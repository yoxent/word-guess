import { Audio } from 'expo-av';

let _enabled = true;
let _sounds: Record<string, Audio.Sound> = {};

export async function init(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const soundFiles: Record<string, any> = {
    keypress: require('../../assets/sounds/keypress.wav'),
    reveal: require('../../assets/sounds/reveal.wav'),
    win: require('../../assets/sounds/win.wav'),
    loss: require('../../assets/sounds/lose.wav'),
  };

  const entries = Object.entries(soundFiles);
  await Promise.all(
    entries.map(async ([name, source]) => {
      try {
        const { sound } = await Audio.Sound.createAsync(source);
        _sounds[name] = sound;
      } catch (e) {
        console.warn(`[sound] Failed to load ${name}:`, e);
      }
    }),
  );
}

export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
}

async function play(name: string): Promise<void> {
  if (!_enabled) return;
  const sound = _sounds[name];
  if (!sound) return;
  try {
    await sound.replayAsync();
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
