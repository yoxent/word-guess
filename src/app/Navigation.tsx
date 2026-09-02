import React, { useCallback, useMemo } from 'react';
import { BackHandler, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useFocusEffect,
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
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
import { handleHardwareBackPress } from './hardwareBackPress';

const Stack = createNativeStackNavigator<RootStackParamList>();

// D-165–D-167: Centralized BackHandler — block during ads/IAP; skip-to-final on tile reveal.
// MUST be rendered INSIDE <NavigationContainer> so useFocusEffect has navigation context.
function BackHandlerController() {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        handleHardwareBackPress,
      );
      return () => subscription.remove();
    }, [])
  );
  return null;
}

function HeaderBackButton({
  tintColor,
  onPress,
}: {
  tintColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        marginLeft: Platform.OS === 'android' ? 4 : 0,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <MaterialIcons name="arrow-back-ios" size={22} color={tintColor} />
    </TouchableOpacity>
  );
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
        screenOptions={({ navigation }) => ({
          headerTintColor: theme.colors.text.primary,
          headerStyle: { backgroundColor: theme.colors.surface.header },
          contentStyle: { backgroundColor: theme.colors.surface.background },
          animationTypeForReplace: 'push',
          // native-stack ignores headerBackImage; use headerLeft so Android
          // also gets the iOS-style "<" chevron instead of the default "<-".
          headerLeft: ({ tintColor, canGoBack }) =>
            canGoBack ? (
              <HeaderBackButton
                tintColor={tintColor}
                onPress={() => navigation.goBack()}
              />
            ) : null,
        })}
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
