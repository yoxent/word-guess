import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

const TOOLTIP_MAX_WIDTH = 260;
const TOOLTIP_DISMISS_MS = 3500;

type HelpTooltipProps = {
  label: string;
  helpText: string;
  /** Icon size; defaults to 18 to match settings rows. */
  size?: number;
};

export function HelpTooltip({ label, helpText, size = 18 }: HelpTooltipProps) {
  const theme = useTheme();
  const buttonRef = useRef<View>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const hideTooltip = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setVisible(false);
  }, []);

  const showTooltip = useCallback(() => {
    if (visible) {
      hideTooltip();
      return;
    }
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setVisible(true);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(hideTooltip, TOOLTIP_DISMISS_MS);
    });
  }, [visible, hideTooltip]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const tooltipLeft = Math.max(
    12,
    Math.min(
      anchor.x + anchor.width / 2 - TOOLTIP_MAX_WIDTH / 2,
      screenWidth - TOOLTIP_MAX_WIDTH - 12,
    ),
  );
  const preferBelow = anchor.y + anchor.height + 88 < screenHeight;
  const verticalStyle = preferBelow
    ? { top: anchor.y + anchor.height + 8 }
    : { bottom: screenHeight - anchor.y + 8 };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          onPress={showTooltip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`About ${label}`}
          accessibilityHint={helpText}
        >
          <MaterialIcons
            name="help-outline"
            size={size}
            color={theme.colors.icon.muted}
          />
        </TouchableOpacity>
      </View>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideTooltip}
        statusBarTranslucent
      >
        <Pressable
          style={styles.tooltipBackdrop}
          onPress={hideTooltip}
          accessibilityLabel="Dismiss help"
        >
          <Pressable
            style={[
              styles.tooltipBubble,
              verticalStyle,
              {
                left: tooltipLeft,
                backgroundColor: theme.colors.surface.elevated,
                borderColor: theme.colors.surface.muted,
              },
            ]}
            onPress={() => {}}
          >
            <Text
              style={[styles.tooltipText, { color: theme.colors.text.primary }]}
            >
              {helpText}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tooltipBackdrop: {
    flex: 1,
  },
  tooltipBubble: {
    position: 'absolute',
    maxWidth: TOOLTIP_MAX_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipText: {
    ...typography.small,
    lineHeight: 18,
  },
});
