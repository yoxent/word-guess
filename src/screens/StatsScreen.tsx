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
import * as Clipboard from 'expo-clipboard';
import { useColors } from '../hooks/useColors';
import { typography } from '../constants/typography';
import { statsConfig } from '../config/ui';
import { StatCard } from '../components/ui/StatCard';
import { useStatsStore } from '../stores';
import { generateShareText } from '../utils/share';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 16;
const CARD_PADDING = 24;
const CHART_WIDTH = SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_PADDING * 2;

export function StatsScreen() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          padding: SCREEN_PADDING,
          paddingTop: 8,
        },
        loadingContainer: {
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        emptyCard: {
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 24,
          margin: 16,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        emptyTitle: {
          ...typography.cardTitle,
          color: colors.textPrimary,
          marginBottom: 8,
        },
        emptySubtitle: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
        },
        // Overview grid
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
          color: colors.textPrimary,
        },
        statLabel: {
          ...typography.statLabel,
          color: colors.textSecondary,
          marginTop: 2,
        },
        perModeRow: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.tileEmpty,
        },
        perModeItem: {
          alignItems: 'center',
        },
        perModeLabel: {
          ...typography.statLabel,
          color: colors.textSecondary,
        },
        perModeValue: {
          ...typography.body,
          color: colors.textPrimary,
          fontWeight: '600',
          marginTop: 2,
        },
        // By-length table
        tableHeader: {
          flexDirection: 'row',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.tileEmpty,
        },
        tableHeaderCell: {
          textAlign: 'center',
          ...typography.statLabel,
          color: colors.textSecondary,
        },
        tableRow: {
          flexDirection: 'row',
          paddingVertical: 8,
          minHeight: 36,
          alignItems: 'center',
        },
        tableRowAlt: {
          backgroundColor: colors.background,
        },
        lengthLabel: {
          justifyContent: 'center',
        },
        tableCell: {
          textAlign: 'center',
          ...typography.body,
          color: colors.textPrimary,
        },
        // Chart
        chartContainer: {
          alignItems: 'center',
        },
        // Share button (FAB)
        shareButton: {
          position: 'absolute',
          right: SCREEN_PADDING,
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        },
        shareButtonText: {
          color: colors.textInverse,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
        },
      }),
    [colors],
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
    statsConfig.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // D-170 / LAUNCH-07: stats-read performance marker (SQLite read)
    // Guarded by __DEV__ so it is stripped from production AAB builds.
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
      const animations = cardAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: i * 80,
          useNativeDriver: true,
        })
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

  // ── Loading state ──
  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ── Empty state (no games) ──
  if (!stats && !isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No games played yet.</Text>
          <Text style={styles.emptySubtitle}>Complete a game to see your stats!</Text>
        </View>
      </View>
    );
  }

  if (!stats) return null;

  // Sort config by order
  const sortedConfig = [...statsConfig].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (insets.bottom + 80) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />}
      >
        {sortedConfig.map((config, i) => (
          <Animated.View
            key={config.id}
            style={{
              opacity: cardAnims[i],
              transform: [{
                translateY: cardAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              }],
            }}
          >
            <StatCard title={config.title}>
              {config.type === 'overview' && <OverviewContent />}
              {config.type === 'byLength' && <ByLengthContent />}
              {config.type === 'guessDistribution' && <GuessDistributionContent />}
            </StatCard>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Share FAB */}
      {lastGameResult && (
        <TouchableOpacity
          style={[styles.shareButton, { bottom: insets.bottom + 16 }]}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
        >
          <Text style={styles.shareButtonText}>
            {sharing ? 'Copied!' : 'Share Results'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Internal Content Components ──

  function OverviewContent() {
    if (!stats) return null;

    const overviewItems = [
      { value: stats.totalGames.toString(), label: 'Total Games' },
      { value: stats.wins.toString(), label: 'Wins' },
      { value: `${stats.winRate}%`, label: 'Win %' },
      { value: stats.currentStreak.toString(), label: 'Current Streak' },
      { value: stats.maxStreak.toString(), label: 'Best Streak' },
    ];

    const perModeLabels: Record<string, string> = {
      daily: 'Daily',
      endless: 'Endless',
      'non-daily': 'Free/Random',
    };

    return (
      <>
        <View style={styles.statGrid}>
          {overviewItems.map((item) => (
            <View key={item.label} style={styles.statItem}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Per-mode streaks subsection */}
        {stats.perModeStreaks && Object.keys(stats.perModeStreaks).length > 0 && (
          <View style={styles.perModeRow}>
            {Object.entries(stats.perModeStreaks).map(([mode, streak]) => (
              <View key={mode} style={styles.perModeItem}>
                <Text style={styles.perModeLabel}>
                  {perModeLabels[mode] || mode}
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
        {/* Header row */}
        <View style={[styles.tableHeader, { paddingLeft: maxLabelWidth }]}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Played</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Won</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Win %</Text>
        </View>
        {/* Data rows */}
        {lengths.map((len) => {
          const entry = stats!.gamesByLength[len];
          const played = entry?.played ?? 0;
          const won = entry?.won ?? 0;
          const winPct = played > 0 ? Math.round((won / played) * 100) : 0;

          return (
            <View
              key={len}
              style={[styles.tableRow, len % 2 === 0 ? styles.tableRowAlt : undefined]}
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
    const chartData = {
      labels: distribution.length > 0
        ? distribution.slice(1).map((_, i) => (i + 1).toString())
        : [''],
      datasets: [{
        data: distribution.length > 0
          ? distribution.slice(1)
          : [0],
      }],
    };

    if (distribution.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={{ ...typography.body, color: colors.textSecondary }}>
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
          withHorizontalLabels={true}
          withVerticalLabels={true}
          segments={4}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity, index) => {
              const count = chartData.datasets[0].data[index ?? 0] ?? 0;
              return count > 0 ? 'rgba(106, 170, 100, 1)' : 'rgba(211, 214, 218, 1)';
            },
            labelColor: () => colors.textSecondary,
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: colors.tileEmpty,
            },
            propsForLabels: {
              fontSize: 12,
              fontWeight: '600',
            },
            barPercentage: 0.7,
          }}
          style={{
            borderRadius: 3,
          }}
        />
      </View>
    );
  }
}
