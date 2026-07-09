import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 120,
        },
        text: {
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [],
  );

  // Pick the semantic button slot for the active variant. Every variant
  // resolves to a uniform {bg, fg, border} shape so the JSX below is
  // identical regardless of variant.
  const slot: { bg: string; fg: string; border: string } =
    variant === 'secondary'
      ? { ...theme.colors.button.secondary }
      : variant === 'danger'
        ? { ...theme.colors.button.danger, border: 'transparent' }
        : variant === 'ghost'
          ? { bg: 'transparent', fg: theme.colors.button.ghost.fg, border: 'transparent' }
          : { ...theme.colors.button.primary, border: 'transparent' };

  const hasBorder = variant === 'secondary' || variant === 'ghost';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: slot.bg,
          borderColor: slot.border ?? 'transparent',
          borderWidth: hasBorder ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: slot.fg }]}>{title}</Text>
    </TouchableOpacity>
  );
}
