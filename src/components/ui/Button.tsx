import React, { useRef, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { typography } from '../../constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Primary interactive button — pill-shaped, spring press animation,
 * color shift on press, DM Sans bold.
 *
 * Variants:
 * - primary: solid sky blue bg, white text
 * - secondary: outlined, accent border + text
 * - danger: solid coral bg, white text
 * - ghost: text only, accent color
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 20, // pill shape
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 50,
          minWidth: 120,
          position: 'relative',
          overflow: 'hidden',
        },
        pressedOverlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        },
        text: {
          ...typography.button,
        },
        loadingText: {
          opacity: 0,
        },
      }),
    [],
  );

  // Resolve variant to color slot
  const colors = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return {
          bg: theme.colors.button.secondary.bg,
          fg: theme.colors.button.secondary.fg,
          bgDark: theme.colors.button.secondary.bg,
          border: theme.colors.button.secondary.border,
        };
      case 'danger':
        return {
          bg: theme.colors.button.danger.bg,
          fg: theme.colors.button.danger.fg,
          bgDark: theme.colors.button.danger.bgDark,
          border: 'transparent',
        };
      case 'ghost':
        return {
          bg: 'transparent',
          fg: theme.colors.button.ghost.fg,
          bgDark: 'transparent',
          border: 'transparent',
        };
      default: // primary
        return {
          bg: theme.colors.button.primary.bg,
          fg: theme.colors.button.primary.fg,
          bgDark: theme.colors.button.primary.bgDark,
          border: 'transparent',
        };
    }
  }, [variant, theme]);

  const hasBorder = variant === 'secondary';
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);

  // Spring press animation — scale + overlay opacity + haptic
  // Both scale and pressAnim use native driver for smooth 60fps.
  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 4,
        tension: 40,
      }),
      Animated.timing(pressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 40,
      }),
      Animated.timing(pressAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pressOverlayOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Soft shadow — colored for primary, neutral for secondary
  const shadowColor = variant === 'primary' ? colors.bg : '#000';

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDisabled ? 0 : 0.2,
          shadowRadius: 8,
          elevation: isDisabled ? 0 : 4,
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            // Fill the wrapper so caller `style={{ width }}` actually sizes
            // the visible pill — without this, only the invisible Animated.View
            // stretches and the touchable shrink-wraps to the label length.
            alignSelf: 'stretch',
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: hasBorder ? 1.5 : 0,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        activeOpacity={1} // we handle opacity via animation
        accessible
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <Animated.View style={[styles.pressedOverlay, { opacity: pressOverlayOpacity }]} />
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.fg}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text
          style={[
            styles.text,
            { color: colors.fg },
            loading && styles.loadingText,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
