/**
 * Regression: win/lose SFX must await seekTo(0) before play().
 * Fire-and-forget seek left longer clips silent on Android.
 *
 * testSetup.ts mocks ../services/sound globally — unmock for this file.
 */

jest.unmock('../sound');

const mockSeekTo = jest.fn(() => Promise.resolve());
const mockPlay = jest.fn();
const mockPause = jest.fn();

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    loop: false,
    playing: false,
    seekTo: mockSeekTo,
    play: mockPlay,
    pause: mockPause,
  })),
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      bgmVolume: 0.75,
      sfxVolume: 0.75,
    }),
  },
}));

describe('sound replay', () => {
  beforeEach(() => {
    mockSeekTo.mockClear();
    mockPlay.mockClear();
    mockPause.mockClear();
    mockSeekTo.mockImplementation(() => Promise.resolve());
  });

  it('awaits seekTo(0) before play for win SFX', async () => {
    const sound = require('../sound');
    await sound.init();
    mockSeekTo.mockClear();
    mockPlay.mockClear();
    mockPause.mockClear();

    let resolveSeek!: () => void;
    const seekGate = new Promise<void>((resolve) => {
      resolveSeek = resolve;
    });
    mockSeekTo.mockImplementation(() => seekGate);

    sound.playWin();

    // Let the async play() body reach await seekTo(...)
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).not.toHaveBeenCalled();

    resolveSeek();
    await seekGate;
    await Promise.resolve();
    await Promise.resolve();

    expect(mockPlay).toHaveBeenCalled();
  });
});
