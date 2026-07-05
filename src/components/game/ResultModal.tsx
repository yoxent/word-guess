import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';
import { useGameStore } from '@/stores';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui';
import { Confetti } from './Confetti';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMOJI_MAP: Record<string, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
  empty: '⬛',
};

export function ResultModal() {
  const navigation = useNavigation<Nav>();
  const session = useGameStore((s) => s.session);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!session || session.status === 'playing') {
    return null;
  }

  const isWin = session.status === 'won';

  // Build emoji grid
  const emojiRows = session.feedback.map((rowFeedback) => {
    return rowFeedback
      .map((f) => EMOJI_MAP[f.feedback] || '⬛')
      .join('');
  });
  const emojiText = emojiRows.join('\n');

  const handleBackToMenu = () => {
    resetGame();
    navigation.navigate('Home');
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        {isWin && <Confetti />}
        <View style={styles.card}>
          <Text style={[styles.title, { color: isWin ? colors.success : colors.danger }]}>
            {isWin ? 'You Won!' : 'Game Over'}
          </Text>

          <Text style={styles.word}>{session.word.toUpperCase()}</Text>

          {/*
           * Definition will show here after Plan 02-03
           * when dictionaryStore.getDefinition() is wired up.
           */}

          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>{emojiText}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Back to Menu" onPress={handleBackToMenu} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '85%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  word: {
    fontSize: 32,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 2,
  },
  emojiContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
});
