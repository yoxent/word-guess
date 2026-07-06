import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScreenProps, RootStackParamList } from '../types';
import { colors } from '../constants/colors';
import { Button } from '../components/ui';

type Props = ScreenProps<'Result'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Result'>;

export function ResultScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const { sessionId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Results</Text>
      <Text style={styles.info}>Session: {sessionId}</Text>
      <Text style={styles.placeholder}>
        Game result will display here (Phase 2)
      </Text>
      <View style={styles.spacer} />
      <Button title="Back to Home" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  spacer: {
    height: 32,
  },
});
