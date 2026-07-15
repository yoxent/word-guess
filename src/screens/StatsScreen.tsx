import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../constants/typography';
import { layout } from '../constants/layout';
import { statsConfig } from '../config/ui';
import { StatCard } from '../components/ui/StatCard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { useStatsStore, useSettingsStore } from '../stores';
import type { PlayerStats } from '../types';

const SCREEN_PADDING = layout.screenPadding;

/** Matches `applyGameToStats` / `computeStatsFromHistory` (D-76). */
const CURRENT_STREAK_HELP =
  "Win streak for the mode you last played (Daily, Endless, or Random — Normal or Hard). Switch modes and this number follows that mode's streak.";

/** Matches max of all per-mode max streaks. */
const BEST_STREAK_HELP =
  'Your longest win streak across any mode or difficulty — not tied to one category.';

export function StatsScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
        },
        scrollContent: {
          padding: SCREEN_PADDING,
        },
        loadingContainer: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        emptyCard: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.cardBorderRadius,
          padding: 28,
          margin: 16,
          alignItems: 'center',
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 4,
        },
        emptyTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 8,
        },
        emptySubtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
        },
        // Overview with progress ring
        overviewTop: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          marginBottom: 16,
        },
        overviewStats: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
        },
        // Stat grid
        statGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        statItem: {
          width: '50%',
          alignItems: 'center',
          paddingVertical: 8,
        },
        statValue: {
          ...typography.statValue,
          color: theme.colors.text.primary,
        },
        statLabel: {
          ...typography.statLabel,
          color: theme.colors.text.secondary,
          marginTop: 2,
        },
        // Streak badge
        streakBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: `${theme.colors.brand.secondary}18`,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginTop: 4,
        },
        streakText: {
          ...typography.cardTitle,
          color: theme.colors.brand.secondary,
        },
        streakLabelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginTop: 6,
        },
        streakLabel: {
          ...typography.small,
          color: theme.colors.text.secondary,
          textAlign: 'center',
        },
        // Per-mode streaks — 3 columns (Daily / Endless / Free·Random), normal + hard stacked
        perModeRow: {
          flexDirection: 'row',
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.tile.empty,
          gap: 8,
        },
        perModeItem: {
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          backgroundColor: theme.colors.surface.muted,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 6,
        },
        perModeLabel: {
          ...typography.statLabel,
          color: theme.colors.text.secondary,
          marginBottom: 6,
          textAlign: 'center',
        },
        // Same type for Normal + Hard — don't override fontWeight (mismatched
        // weight vs FONTS.caption makes RN fall back to a different system font).
        perModeValue: {
          ...typography.small,
          color: theme.colors.text.primary,
          marginTop: 2,
        },
        perModeHard: {
          ...typography.small,
          color: theme.colors.brand.secondary,
          marginTop: 4,
        },
        // By-length table
        tableHeader: {
          flexDirection: 'row',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tile.empty,
        },
        tableHeaderCell: {
          textAlign: 'center',
          ...typography.statLabel,
          color: theme.colors.text.secondary,
        },
        tableRow: {
          flexDirection: 'row',
          paddingVertical: 8,
          minHeight: 36,
          alignItems: 'center',
        },
        tableRowAlt: {
          backgroundColor: theme.colors.surface.background,
        },
        lengthLabel: {
          justifyContent: 'center',
        },
        tableCell: {
          textAlign: 'center',
          ...typography.small,
          color: theme.colors.text.primary,
        },
        // Guess distribution — Wordle-style horizontal bars (even spacing, no chart-kit)
        distributionList: {
          gap: 6,
        },
        distributionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 28,
        },
        distributionLabel: {
          ...typography.statLabel,
          color: theme.colors.text.secondary,
          width: 20,
          textAlign: 'center',
        },
        distributionBarTrack: {
          flex: 1,
          marginHorizontal: 8,
          height: 28,
          borderRadius: 6,
          backgroundColor: theme.colors.surface.muted,
          overflow: 'hidden',
          justifyContent: 'center',
        },
        distributionBarFill: {
          height: '100%',
          borderRadius: 6,
          minWidth: 28,
          justifyContent: 'center',
          paddingHorizontal: 8,
        },
        distributionCount: {
          ...typography.small,
        },
      }),
    [theme],
  );

  const isLoading = useStatsStore((s) => s.isLoading);
  const loadStats = useStatsStore((s) => s.loadStats);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  /** Snapshot only updated on enter / pull — store changes while idle do not refresh the UI. */
  const [displayStats, setDisplayStats] = React.useState<PlayerStats | null>(
    () => useStatsStore.getState().stats,
  );

  // Entrance animation — start visible when reduceMotion so cards never stay at opacity 0
  const cardAnims = useRef(
    statsConfig.map(() => new Animated.Value(reduceMotion ? 1 : 0)),
  ).current;

  const refreshDisplay = useCallback(async () => {
    if (__DEV__) {
      console.time('stats-read');
    }
    await loadStats();
    if (__DEV__) {
      console.timeEnd('stats-read');
    }
    setDisplayStats(useStatsStore.getState().stats);
  }, [loadStats]);

  // Refresh when entering the page (not while idle on it)
  useFocusEffect(
    useCallback(() => {
      void refreshDisplay();
    }, [refreshDisplay]),
  );

  useEffect(() => {
    if (!displayStats) return;
    if (reduceMotion) {
      cardAnims.forEach((anim) => anim.setValue(1));
      return;
    }
    cardAnims.forEach((anim) => anim.setValue(0));
    const animations = cardAnims.map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(80, animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStats, reduceMotion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDisplay();
    setRefreshing(false);
  }, [refreshDisplay]);

  const stats = displayStats;

  // ── Internal Content Components (must be before early returns for clarity) ──

  function OverviewContent() {
    if (!stats) return null;

    const winRate = stats.winRate / 100;

    return (
      <>
        {/* Top row: Progress ring + key stats */}
        <View style={styles.overviewTop}>
          <View style={styles.overviewStats}>
            <ProgressRing
              progress={winRate}
              size={100}
              strokeWidth={8}
              label="Win Rate"
            />
          </View>
          <View style={styles.overviewStats}>
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>Games</Text>
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text style={styles.streakText}>{stats.currentStreak}</Text>
            </View>
            <View style={styles.streakLabelRow}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <HelpTooltip
                label="Current Streak"
                helpText={CURRENT_STREAK_HELP}
                size={14}
              />
            </View>
          </View>
          <View style={styles.overviewStats}>
            <Text style={styles.statValue}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <Text style={styles.streakText}>{stats.maxStreak}</Text>
            </View>
            <View style={styles.streakLabelRow}>
              <Text style={styles.streakLabel}>Best Streak</Text>
              <HelpTooltip
                label="Best Streak"
                helpText={BEST_STREAK_HELP}
                size={14}
              />
            </View>
          </View>
        </View>

        {/* Per-mode streaks — 3 mode columns, normal + hard stacked (no overflow) */}
        {stats.perModeStreaks && (
          <View style={styles.perModeRow}>
            {(
              [
                { id: 'daily', label: 'Daily' },
                { id: 'endless', label: 'Endless' },
                { id: 'random', label: 'Random' },
              ] as const
            ).map(({ id, label }) => {
              const normal = stats.perModeStreaks?.[`${id}_normal`]?.current ?? 0;
              const hard = stats.perModeStreaks?.[`${id}_hard`]?.current ?? 0;
              return (
                <View key={id} style={styles.perModeItem}>
                  <Text style={styles.perModeLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.perModeValue}>Normal {normal}</Text>
                  <Text style={styles.perModeHard}>Hard {hard}</Text>
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  }

  function ByLengthContent() {
    if (!stats) return null;

    const lengths = [5, 6, 7, 8, 9, 10];
    const maxLabelWidth = 70;

    return (
      <View>
        <View style={[styles.tableHeader, { paddingLeft: maxLabelWidth }]}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Played</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Won</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Win %</Text>
        </View>
        {lengths.map((len) => {
          const entry = stats!.gamesByLength[len];
          const played = entry?.played ?? 0;
          const won = entry?.won ?? 0;
          const winPct = played > 0 ? Math.round((won / played) * 100) : 0;

          return (
            <View
              key={len}
              style={[
                styles.tableRow,
                len % 2 === 0 ? styles.tableRowAlt : undefined,
              ]}
            >
              <View style={[styles.lengthLabel, { width: maxLabelWidth }]}>
                <Text style={styles.tableCell}>{len} letters</Text>
              </View>
              <Text style={[styles.tableCell, { flex: 1 }]}>{played}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{won}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{winPct}%</Text>
            </View>
          );
        })}
      </View>
    );
  }

  function GuessDistributionContent() {
    if (!stats) return null;

    const distribution = stats.guessDistribution;
    if (distribution.length === 0) {
      return (
        <Text
          style={{ ...typography.body, color: theme.colors.text.secondary }}
        >
          No wins yet — complete a game to see your distribution.
        </Text>
      );
    }

    // Indices 1..N (skip unused 0). Always at least 1–6 after storage pad.
    const bins = distribution.slice(1);
    const maxCount = Math.max(...bins, 1);

    return (
      <View style={styles.distributionList}>
        {bins.map((count, i) => {
          const attempt = i + 1;
          const filled = count > 0;
          // Zero bins get a short muted chip; filled bars scale to max
          const widthPct = filled ? Math.max(22, (count / maxCount) * 100) : 0;

          return (
            <View key={attempt} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{attempt}</Text>
              <View style={styles.distributionBarTrack}>
                <View
                  style={[
                    styles.distributionBarFill,
                    filled
                      ? {
                          width: `${widthPct}%`,
                          backgroundColor: theme.colors.brand.primary,
                        }
                      : {
                          width: 28,
                          backgroundColor: theme.colors.tile.empty,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.distributionCount,
                      {
                        color: filled
                          ? '#FFFFFF'
                          : theme.colors.text.secondary,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // ── Loading state ──
  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.status.accent} />
      </View>
    );
  }

  // ── Empty state ──
  if (!stats && !isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.emptyCard}>
          <MaterialIcons
            name="bar-chart"
            size={48}
            color={theme.colors.icon.muted}
          />
          <Text style={[styles.emptyTitle, { marginTop: 12 }]}>
            No games played yet
          </Text>
          <Text style={styles.emptySubtitle}>
            Complete a game to see your stats!
          </Text>
        </View>
      </View>
    );
  }

  if (!stats) return null;

  const sortedConfig = [...statsConfig].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.status.accent]}
          />
        }
      >
        {sortedConfig.map((config, i) => (
          <Animated.View
            key={config.id}
            style={{
              opacity: cardAnims[i],
              transform: [
                {
                  translateY: cardAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            <StatCard title={config.title}>
              {config.type === 'overview' && <OverviewContent />}
              {config.type === 'byLength' && <ByLengthContent />}
              {config.type === 'guessDistribution' && (
                <GuessDistributionContent />
              )}
            </StatCard>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
