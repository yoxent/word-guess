import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSystemColorScheme } from '../hooks/useSystemColorScheme';
import { StatusBar } from 'expo-status-bar';
import { Navigation } from './Navigation';
import { LoadingScreen } from '../screens/LoadingScreen';
import { fetchAdUnitIds } from '../services/remoteConfig';
import { loadFonts } from '../utils/fonts';
import { configureGoogleSignIn } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { applyNativeThemeMode, useSettingsStore } from '../stores/settingsStore';
import { useAdStore } from '../stores/adStore';
import * as syncQueue from '../services/syncQueue';
import * as firestoreService from '../services/firestoreService';
import { initDatabase } from '../services/storage';
import * as sound from '../services/sound';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  // D-190: StatusBar style based on active theme
  const systemScheme = useSystemColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const activeTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    applyNativeThemeMode(themeMode);
  }, [themeMode]);

  // Subscribe to volume changes — when user adjusts a slider in Settings,
  // apply the new volume to the audio players immediately. This is the
  // toggle-side-effects pattern (see brain/wiki/toggle-side-effects.md)
  // generalized to numeric values.
  const bgmVolume = useSettingsStore((s) => s.bgmVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  useEffect(() => {
    sound.setBgmVolume(bgmVolume);
  }, [bgmVolume]);
  useEffect(() => {
    sound.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  // App lifecycle: pause BGM on background, resume on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        sound.pauseBgm();
      } else if (state === 'active') {
        sound.resumeBgm();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // D-170 / LAUNCH-07: startup-init performance marker
    // Measures non-blocking startup init: Remote Config ad unit fetch + sound system init.
    // Note: dictionary require() calls happen synchronously at module load
    // (dictionaryStore.ts), BEFORE this effect runs — they cannot be measured here.
    // Guarded by __DEV__ so it is stripped from production AAB builds.
    if (__DEV__) {
      console.time('startup-init');
    }

    // Load display + UI fonts — blocks first render briefly but
    // prevents flash of unstyled text. If loading fails, app continues
    // with system fonts.
    const init = async () => {
      await loadFonts();

      // Open SQLite before any game can complete — stats writes need it
      await initDatabase();

      // Fire-and-forget: fetch Remote Config ad unit IDs (does not block startup)
      fetchAdUnitIds();

      // Preload ads early so they're ready by the time user reaches game screen
      useAdStore.getState().preloadInterstitial();
      useAdStore.getState().preloadRewarded();

      // Initialize sound system (loads BGM + SFX players) — fire-and-forget
      sound.init();
      // BGM start is handled by sound.init() (plays if volume > 0)

      if (__DEV__) {
        console.timeEnd('startup-init');
      }

      // D-175: No artificial delay — Home screen stagger entrance handles visual transition
      setIsReady(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // D-118: Silent sign-in on startup — non-blocking, fire-and-forget
  useEffect(() => {
    if (!isReady) return;

    // Configure Google Sign-In once at startup
    configureGoogleSignIn();

    // Attempt silent sign-in (D-118) — restores previous session
    // Never blocks gameplay — runs asynchronously
    useAuthStore.getState().googleSignInSilently();
  }, [isReady]);

  // D-139: Periodic sync queue drain (every 30s while signed in) + AppState foreground drain
  useEffect(() => {
    if (!isReady) return;

    const drainHandler = async (event: syncQueue.SyncEvent) => {
      if (event.type === 'game_result') {
        const authState = useAuthStore.getState();
        if (!authState.isLoggedIn) return false;
        return await firestoreService.updatePlayerStats(
          authState.playerId!,
          authState.playerName ?? 'Player',
          event.data.stats as any,
        );
      }
      if (event.type === 'leaderboard_score') {
        const data = event.data as any;
        return await firestoreService.submitLeaderboardScore(
          data.type,
          data.playerId,
          data.playerName,
          data.score,
        );
      }
      return false;
    };

    // Periodic drain every 30s while app is active
    const intervalId = setInterval(() => {
      const authState = useAuthStore.getState();
      if (authState.isLoggedIn) {
        syncQueue.drainQueue(drainHandler);
      }
    }, 30000);

    // AppState foreground drain
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const authState = useAuthStore.getState();
        if (authState.isLoggedIn) {
          syncQueue.drainQueue(drainHandler);
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [isReady]);

  if (!isReady) {
    return (
      <>
        <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <Navigation />
    </>
  );
}
