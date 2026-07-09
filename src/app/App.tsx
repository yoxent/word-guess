import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Navigation } from './Navigation';
import { LoadingScreen } from '../screens/LoadingScreen';
import { fetchAdUnitIds } from '../services/remoteConfig';
import { configureGoogleSignIn } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import * as syncQueue from '../services/syncQueue';
import * as firestoreService from '../services/firestoreService';
import * as sound from '../services/sound';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Fire-and-forget: fetch Remote Config ad unit IDs (does not block startup)
    fetchAdUnitIds();

    // Initialize sound system — fire-and-forget, does not block startup
    sound.init();
    // Sync sound enabled state on init
    sound.setEnabled(useSettingsStore.getState().soundEnabled);

    // Brief delay ensures dictionary JSON is fully parsed and
    // provides a smooth splash-to-app transition
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
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
        <StatusBar style="dark" />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </>
  );
}
