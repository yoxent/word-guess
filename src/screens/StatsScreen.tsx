import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../constants/typography';
import { layout } from '../constants/layout';
import { statsConfig } from '../config/ui';
import { StatCard } from '../components/ui/StatCard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useStatsStore } from '../stores';
import { generateShareText } from '../utils/share';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = layout.screenPadding;
const CARD_PADDING = 24;
const CHART_WIDTH = SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_PADDING * 2;

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
          alignItems: 'center',
          justifyContent: 'space-around',
          marginBottom: 16,
        },
        overviewStats: {
          flex: 1,
          alignItems: 'center',
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
        streakLabel: {
          ...typography.small,
          color: theme.colors.text.secondary,
        },
        // Per-mode streaks
        perModeRow: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.tile.empty,
        },
        perModeItem: {
          alignItems: 'center',
        },
        perModeLabel: {
          ...typography.statLabel,
          color: theme.colors.text.secondary,
        },
        perModeValue: {
          ...typography.body,
          color: theme.colors.text.primary,
          fontWeight: '600',
          marginTop: 2,
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
          ...typography.body,
          color: theme.colors.text.primary,
        },
        // Chart
        chartContainer: {
          alignItems: 'center',
        },
        // Share FAB — pill-shaped, sky blue, spring press
        shareButton: {
          position: 'absolute',
          right: SCREEN_PADDING,
          backgroundColor: theme.colors.brand.primary,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 14,
          paddingHorizontal: 28,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        },
        shareButtonText: {
          ...typography.button,
          color: '#FFFFFF',
        },
      }),
    [theme],
  );

  const stats = useStatsStore((s) => s.stats);
  const isLoading = useStatsStore((s) => s.isLoading);
  const lastGameResult = useStatsStore((s) => s.lastGameResult);
  const loadStats = useStatsStore((s) => s.loadStats);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  // Entrance animation
  const cardAnims = useRef(
    statsConfig.map(() => new Animated.Value(0)),
  ).current;

  // Share button spring animation
  const shareScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (__DEV__) {
      console.time('stats-read');
    }
    loadStats();
    if (__DEV__) {
      console.timeEnd('stats-read');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stats) {
      const animations = cardAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      );
      Animated.stagger(80, animations).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const handleShare = useCallback(async () => {
    if (!lastGameResult || sharing) return;
    setSharing(true);

    try {
      const shareText = generateShareText({
        mode: lastGameResult.mode,
        word: lastGameResult.word,
        attempts: lastGameResult.attempts,
        won: lastGameResult.won,
        maxAttempts: lastGameResult.maxAttempts,
        guesses: lastGameResult.feedback,
        date: lastGameResult.date,
      });
      await Clipboard.setStringAsync(shareText);
      Alert.alert('Copied', 'Results copied to clipboard!');
    } catch {
      Alert.alert('Error', 'Could not copy results. Please try again.');
    }

    setTimeout(() => setSharing(false), 1000);
  }, [lastGameResult, sharing]);

  const onSharePressIn = () => {
    Animated.spring(shareScale, {
      toValue: 0.93,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

  const onSharePressOut = () => {
    Animated.spring(shareScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

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

      {/* Share FAB — pill-shaped with spring press */}
      {lastGameResult && (
        <Animated.View
          style={[
            styles.shareButton,
            {
              bottom: insets.bottom + 16,
              transform: [{ scale: shareScale }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleShare}
            onPressIn={onSharePressIn}
            onPressOut={onSharePressOut}
            disabled={sharing}
            activeOpacity={1}
            accessible
            accessibilityRole="button"
            accessibilityLabel={sharing ? 'Results copied' : 'Share Results'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <MaterialIcons
              name={sharing ? 'check' : 'share'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.shareButtonText}>
              {sharing ? 'Copied!' : 'Share'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );

  // ── Internal Content Components ──

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
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
          <View style={styles.overviewStats}>
            <Text style={styles.statValue}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <Text style={styles.streakText}>{stats.maxStreak}</Text>
            </View>
            <Text style={styles.streakLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Per-mode streaks */}
        {stats.perModeStreaks &&
          Object.keys(stats.perModeStreaks).length > 0 && (
            <View style={styles.perModeRow}>
              {Object.entries(stats.perModeStreaks).map(([mode, streak]) => (
                <View key={mode} style={styles.perModeItem}>
                  <Text style={styles.perModeLabel}>
                    {(() => {
                      const isHard = mode.endsWith('_hard');
                      const base = mode.replace(/_normal$|_hard$/, '');
                      const label = base === 'non-daily' ? 'Free/Random' : base.charAt(0).toUpperCase() + base.slice(1);
                      return isHard ? label + ' 🔥' : label;
                    })()}
                  </Text>
                  <Text style={styles.perModeValue}>
                    {streak.current} streak
                  </Text>
                </View>
              ))}
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
          const winPct =
            played > 0 ? Math.round((won / played) * 100) : 0;

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
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {winPct}%
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  function GuessDistributionContent() {
    if (!stats) return null;

    const distribution = stats.guessDistribution;
    const chartData = {
      labels:
        distribution.length > 0
          ? distribution.slice(1).map((_, i) => (i + 1).toString())
          : [''],
      datasets: [
        {
          data: distribution.length > 0 ? distribution.slice(1) : [0],
        },
      ],
    };

    if (distribution.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text
            style={{ ...typography.body, color: theme.colors.text.secondary }}
          >
            No wins yet — complete a game to see your distribution.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={CHART_WIDTH}
          height={200}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          showBarTops={false}
          showValuesOnTopOfBars={false}
          withHorizontalLabels
          withVerticalLabels
          segments={4}
          chartConfig={{
            backgroundColor: theme.colors.surface.card,
            backgroundGradientFrom: theme.colors.surface.card,
            backgroundGradientTo: theme.colors.surface.card,
            decimalPlaces: 0,
            color: (opacity, index) => {
              // Sky blue for bars with data, muted for empty
              const count =
                chartData.datasets[0].data[index ?? 0] ?? 0;
              return count > 0
                ? `rgba(66, 165, 245, ${opacity})` // sky blue
                : `rgba(176, 190, 197, ${opacity * 0.5})`; // muted blue-gray
            },
            labelColor: () => theme.colors.text.secondary,
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: theme.colors.tile.empty,
            },
            propsForLabels: {
              fontSize: 12,
              fontWeight: '600',
            },
            barPercentage: 0.7,
          }}
          style={{ borderRadius: 3 }}
        />
      </View>
    );
  }
}
