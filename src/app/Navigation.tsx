import React, { useCallback, useMemo } from 'react';
import { BackHandler, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useFocusEffect,
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  GameScreen,
  StatsScreen,
  SettingsScreen,
  LeaderboardScreen,
} from '../screens';
import { useTheme } from '../hooks/useTheme';
import { useGameStore } from '../stores/gameStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

// D-165-D-167: Centralized BackHandler — block back during tile animation (skip-to-final-state)
// NOTE: isAdShowing and isIAPActive are not present in the current adStore/settingsStore; the
// ad and IAP lifecycles are managed in their respective screens. Future phase may add these
// flags so the BackHandler can block during ad display / IAP flow. (Deviation 06-04-1)
// MUST be rendered INSIDE <NavigationContainer> so useFocusEffect has navigation context.
// Previously this hook was called in the outer Navigation() function alongside the
// <NavigationContainer> JSX, which crashed with "Couldn't find a navigation object" on RN 0.86.
function BackHandlerController() {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const gameStore = useGameStore.getState();

        // During tile animation: skip to final state (D-167)
        if (gameStore.isRevealing) {
          gameStore.setIsRevealing(false);
          gameStore.flushPendingInputs();
          gameStore.finalizeRevealOutcome();
          return true;
        }

        // Otherwise: allow default back navigation
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );
  return null;
}

export function Navigation() {
  const theme = useTheme();
  const navTheme = useMemo(
    () => ({
      ...(theme.colors.mode === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(theme.colors.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: 'transparent',
      },
    }),
    [theme.colors.mode],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <BackHandlerController />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTintColor: theme.colors.text.primary,
          headerStyle: { backgroundColor: theme.colors.surface.header },
          contentStyle: { backgroundColor: theme.colors.surface.background },
          animationTypeForReplace: 'push',
          headerBackImage: ({ tintColor }) => (
            <MaterialIcons
              name="arrow-back-ios"
              size={22}
              color={tintColor}
              style={{ marginLeft: Platform.OS === 'android' ? 4 : 0 }}
            />
          ),
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ title: 'Game', headerShown: false }}
        />
        {/* Result route removed in 06-04 — ResultScreen was deleted in 06-03; ResultModal handles
            game results as an overlay. */}
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            title: 'Statistics',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: 'Leaderboard',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
