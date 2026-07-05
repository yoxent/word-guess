import React, { useCallback } from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  GameScreen,
  ResultScreen,
  StatsScreen,
  SettingsScreen,
  LeaderboardScreen,
} from '../screens';
import { colors } from '../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function NavMenuButton() {
  const navigation = useNavigation<NavProp>();
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
      <Text style={styles.menuIcon}>⋮</Text>
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
    color: colors.headerText,
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
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
        options={{
          title: 'Word Guess',
          headerRight: () => <NavMenuButton />,
        }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ title: 'Game', headerShown: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: 'Results', headerShown: false }}
      />
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
  );
}
