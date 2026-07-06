import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Navigation } from './Navigation';
import { LoadingScreen } from '../screens/LoadingScreen';
import { fetchAdUnitIds } from '../services/remoteConfig';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Fire-and-forget: fetch Remote Config ad unit IDs (does not block startup)
    fetchAdUnitIds();

    // Brief delay ensures dictionary JSON is fully parsed and
    // provides a smooth splash-to-app transition
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
