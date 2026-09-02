import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useGameStore } from '../../stores/gameStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import { Confetti } from '../game/Confetti';
import {
  isInputPhase,
  isModalPhase,
  tutorialCopy,
  tutorialSampleTiles,
} from '../../services/tutorialScript';
import { typography, noFontScaling } from '../../constants/typography';
import { layout } from '../../constants/layout';
import { FONTS } from '../../utils/fonts';
import { AppText } from './AppText';
import type { TileFeedback } from '../../types';

type TutorialCoachProps = {
  onFinish: () => void;
};

export function TutorialCoach({ onFinish }: TutorialCoachProps) {
  const theme = useTheme();
  const active = useTutorialStore((s) => s.active);
  const phase = useTutorialStore((s) => s.phase);
  const continueExplain = useTutorialStore((s) => s.continueExplain);
  const feedbackRows = useGameStore((s) => s.session?.feedback);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: 16,
          paddingVertical: 10,
          paddingHorizontal: 20,
          marginHorizontal: 8,
          alignSelf: 'center',
          borderWidth: 1,
          borderColor: theme.colors.surface.muted,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 4,
        },
        reminderWord: {
          fontFamily: FONTS.button,
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: 5,
          color: theme.colors.text.primary,
          textAlign: 'center',
        },
        continueText: {
          ...typography.button,
          color: '#FFFFFF',
        },
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(13, 27, 42, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
          paddingVertical: 24,
        },
        modalCard: {
          width: '100%',
          maxWidth: 300,
          maxHeight: '100%',
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 18,
          alignItems: 'stretch',
          gap: 16,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        },
        modalTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          textAlign: 'center',
          lineHeight: 32,
        },
        samplesRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
        },
        sampleTile: {
          width: 52,
          height: 52,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sampleLetter: {
          fontFamily: FONTS.button,
          fontSize: 24,
          fontWeight: '700',
          color: theme.colors.text.inverse,
        },
        sampleLetterDark: {
          color: theme.colors.text.onPresent,
        },
        modalBody: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          lineHeight: 28,
          letterSpacing: 0.2,
        },
        modalButton: {
          backgroundColor: theme.colors.brand.primary,
          borderRadius: 20,
          paddingVertical: 14,
          alignItems: 'center',
        },
      }),
    [theme],
  );

  if (!active) return null;

  const copy = tutorialCopy(phase);
  const showBanner = isInputPhase(phase);
  const showModal = isModalPhase(phase);
  const samples = tutorialSampleTiles(phase, feedbackRows);

  const tileColor = (kind: TileFeedback): string => {
    if (kind === 'correct') return theme.colors.tile.correct;
    if (kind === 'present') return theme.colors.tile.present;
    return theme.colors.tile.absent;
  };

  return (
    <View pointerEvents="box-none">
      {showBanner ? (
        <View
          style={styles.card}
          pointerEvents="auto"
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Type ${copy.body}`}
        >
          <Text style={styles.reminderWord} allowFontScaling={false}>{copy.body}</Text>
        </View>
      ) : null}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={phase === 'complete' ? onFinish : continueExplain}
      >
        <View style={styles.overlay}>
          {phase === 'complete' && <Confetti />}
          <View
            style={styles.modalCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={copy.title ? `${copy.title}. ${copy.body}` : copy.body}
          >
            {copy.title ? <AppText style={styles.modalTitle}>{copy.title}</AppText> : null}
            {samples.length > 0 ? (
              <View style={styles.samplesRow}>
                {samples.map((tile, index) => (
                  <View
                    key={`${tile.letter}-${index}`}
                    style={[
                      styles.sampleTile,
                      { backgroundColor: tileColor(tile.feedback) },
                    ]}
                    accessible
                    accessibilityLabel={`${tile.letter}, ${tile.feedback}`}
                  >
                    <Text
                      {...noFontScaling}
                      style={[
                        styles.sampleLetter,
                        tile.feedback === 'present' && styles.sampleLetterDark,
                      ]}
                    >
                      {tile.letter}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <AppText style={styles.modalBody}>{copy.body}</AppText>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={phase === 'complete' ? onFinish : continueExplain}
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel={copy.continueLabel ?? 'Next'}
            >
              <AppText style={styles.continueText} numberOfLines={1}>
                {copy.continueLabel ?? 'Next'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
