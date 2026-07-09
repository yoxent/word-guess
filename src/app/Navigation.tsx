import React, { useCallback } from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet, BackHandler } from 'react-native';
import {
  useNavigation,
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
import { darkColors } from '../constants/colors';
import { useColors } from '../hooks/useColors';
import { useGameStore } from '../stores/gameStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function NavMenuButton() {
  const navigation = useNavigation<NavProp>();
  const colors = useColors();
  const handlePress = useCallback(() => {
    Alert.alert('Navigate to...', '', [
      { text: 'Home', onPress: () => navigation.navigate('Home') },
      { text: 'Statistics', onPress: () => navigation.navigate('Stats') },
      { text: 'Settings', onPress: () => navigation.navigate('Settings') },
      { text: 'Leaderboard', onPress: () => navigation.navigate('Leaderboard') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [navigation]);

  return (
    <TouchableOpacity onPress={handlePress} style={styles.menuButton}>
      <Text style={[styles.menuIcon, { color: colors.headerText }]}>⋮</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuIcon: {
    fontSize: 24,
  },
});

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
          if (gameStore.flushPendingInputs) {
            gameStore.flushPendingInputs();
          }
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
  const colors = useColors();
  // D-189: Nav theme injection — prevent white flash on navigation
  const navTheme = colors === darkColors ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <BackHandlerController />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTintColor: colors.headerText,
          headerStyle: { backgroundColor: colors.headerBackground },
          contentStyle: { backgroundColor: colors.background },
          animationTypeForReplace: 'push',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
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
            headerRight: () => <NavMenuButton />,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerRight: () => <NavMenuButton />,
          }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: 'Leaderboard',
            headerRight: () => <NavMenuButton />,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
