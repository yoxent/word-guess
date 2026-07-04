import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Navigation } from './Navigation';
import { colors } from '@/constants/colors';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </>
  );
}
