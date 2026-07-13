import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { layout } from '../constants/layout';
import { typography } from '../constants/typography';
import { useAuthStore } from '../stores/authStore';
import { useStatsStore } from '../stores/statsStore';
import {
  getLeaderboardData,
  reconcileLocalLeaderboardScores,
} from '../services/leaderboardService';
import { getLeaderboardMetrics } from '../services/leaderboardMetrics';
import type { LeaderboardData, LeaderboardEntry } from '../types';
import type { LeaderboardType } from '../services/firestoreService';
import {
  resolveLeaderboardView,
  shouldApplyLeaderboardResult,
} from './leaderboardView';
import { getPodiumTitle } from './leaderboardFlair';
import { formatPlacementLabel } from './leaderboardPlacement';

// ── Tab config ──

const TAB_LABELS: Record<LeaderboardType, string> = {
  daily_streak: 'Daily streak',
  endless_streak: 'Endless streak',
  endless_total: 'Endless words',
  best_streak: 'Best streak',
  sharpshooter: 'Sharpshooter',
};

const TAB_CHIPS: Record<LeaderboardType, string> = {
  daily_streak: 'Daily',
  endless_streak: 'Run',
  endless_total: 'Words',
  best_streak: 'Best',
  sharpshooter: 'Sharp',
};

const TAB_TYPES: LeaderboardType[] = [
  'daily_streak',
  'endless_streak',
  'endless_total',
  'best_streak',
  'sharpshooter',
];

const TAB_ICONS: Record<LeaderboardType, string> = {
  daily_streak: '🌅',
  endless_streak: '🔥',
  endless_total: '🏆',
  best_streak: '⭐',
  sharpshooter: '🎯',
};

const TAB_SCORE_HINT: Record<LeaderboardType, string> = {
  daily_streak: 'consecutive Daily wins',
  endless_streak: 'current Endless run',
  endless_total: 'Endless words cleared',
  best_streak: 'best streak ever',
  sharpshooter: 'fast-win points',
};

/** Short board blurb shown under the chip row. */
const TAB_DESCRIPTIONS: Record<LeaderboardType, string> = {
  daily_streak: 'Who has the longest current Daily Challenge win streak.',
  endless_streak: 'Who is on the longest current Endless win run.',
  endless_total: 'Who has cleared the most Endless words lifetime.',
  best_streak: 'Who holds the best streak ever, across any mode.',
  sharpshooter: 'Who earns the most points from wins in 1–3 guesses.',
};

const EMPTY_MESSAGES: Record<LeaderboardType, string> = {
  daily_streak:
    'No Daily streaks yet.\nWin Daily Challenges on consecutive days to climb this board.',
  endless_streak:
    'No Endless streaks yet.\nWin games in Endless mode to set a streak.',
  endless_total:
    'No Endless word totals yet.\nPlay Endless mode — this ranks total words cleared.',
  best_streak:
    'No best streaks yet.\nBuild a streak in any mode to claim the top.',
  sharpshooter:
    'No Sharpshooter scores yet.\nWin in 1–3 guesses to earn points.',
};

const MEDAL_CONFIG: Record<number, { icon: string; color: string; bg: string }> =
  {
    1: { icon: '🥇', color: '#D4A017', bg: '#FFF8E1' },
    2: { icon: '🥈', color: '#8A8A8A', bg: '#F0F0F0' },
    3: { icon: '🥉', color: '#C47A3A', bg: '#FFF3E0' },
  };

const PODIUM_ORDER: Array<1 | 2 | 3> = [2, 1, 3];

function localScoreForTab(
  type: LeaderboardType,
  metrics: ReturnType<typeof getLeaderboardMetrics>,
): number {
  switch (type) {
    case 'daily_streak':
      return metrics.dailyStreak;
    case 'endless_streak':
      return metrics.endlessStreak;
    case 'endless_total':
      return metrics.endlessTotalWords;
    case 'best_streak':
      return metrics.bestStreak;
    case 'sharpshooter':
      return metrics.sharpshooter;
  }
}

// ── Component ──

export function LeaderboardScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.screenPadding,
        },

        chipScroll: {
          flexGrow: 0,
          flexShrink: 0,
          marginBottom: 10,
          marginHorizontal: -layout.screenPadding,
          maxHeight: 36,
        },
        chipScrollContent: {
          paddingHorizontal: layout.screenPadding,
          gap: 8,
          alignItems: 'center',
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'center',
          gap: 4,
          paddingVertical: 5,
          paddingHorizontal: 12,
          borderRadius: 16,
          backgroundColor: theme.colors.surface.muted,
        },
        chipActive: {
          backgroundColor: theme.colors.brand.primary,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        },
        chipIcon: {
          fontSize: 14,
        },
        chipText: {
          ...typography.small,
          color: theme.colors.text.secondary,
          fontWeight: '700',
        },
        chipTextActive: {
          color: '#FFFFFF',
        },
        boardDescription: {
          ...typography.small,
          color: theme.colors.text.secondary,
          opacity: 0.72,
          marginBottom: 12,
          lineHeight: 18,
          paddingHorizontal: 2,
        },

        authGate: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        authIcon: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: `${theme.colors.brand.primary}15`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        },
        authTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 8,
        },
        authSubtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 22,
        },
        googleSignInButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 14,
          paddingHorizontal: 28,
          gap: 10,
          minWidth: 220,
          shadowColor: theme.colors.button.primary.bg,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        googleSignInText: {
          ...typography.button,
          color: theme.colors.button.primary.fg,
        },

        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        },

        emptyContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        emptyIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.colors.surface.muted,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        },
        emptyTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 6,
        },
        emptySubtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          lineHeight: 22,
        },

        errorIcon: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: `${theme.colors.status.danger}15`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        },
        errorTitle: {
          ...typography.body,
          color: theme.colors.status.danger,
          textAlign: 'center',
          marginBottom: 16,
        },
        retryButton: {
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 12,
          paddingHorizontal: 28,
          shadowColor: theme.colors.button.primary.bg,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        },
        retryText: {
          ...typography.button,
          color: theme.colors.button.primary.fg,
        },

        listContent: {
          paddingBottom: 16,
        },

        podiumRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16,
          minHeight: 168,
        },
        podiumCard: {
          flex: 1,
          alignItems: 'center',
          borderRadius: layout.cardBorderRadius,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderWidth: 1.5,
        },
        podiumCardFirst: {
          paddingTop: 18,
          paddingBottom: 16,
          minHeight: 156,
        },
        podiumCardSecond: {
          minHeight: 132,
        },
        podiumCardThird: {
          minHeight: 118,
        },
        podiumMedal: {
          fontSize: 28,
          marginBottom: 4,
        },
        podiumName: {
          ...typography.small,
          fontWeight: '700',
          color: theme.colors.text.primary,
          textAlign: 'center',
        },
        podiumFlair: {
          ...typography.small,
          color: theme.colors.text.secondary,
          fontWeight: '600',
          marginTop: 2,
          textAlign: 'center',
        },
        podiumScore: {
          ...typography.cardTitle,
          fontWeight: '800',
          marginTop: 6,
        },
        podiumYou: {
          ...typography.small,
          fontWeight: '800',
          color: theme.colors.brand.primary,
          marginTop: 2,
        },

        entryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.cardBorderRadius,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        currentPlayerRow: {
          backgroundColor: theme.colors.surface.muted,
          borderWidth: 1.5,
          borderColor: theme.colors.brand.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        rankContainer: {
          width: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankText: {
          ...typography.cardTitle,
          fontWeight: '800',
          color: theme.colors.text.secondary,
        },
        playerInfo: {
          flex: 1,
          marginLeft: 10,
        },
        playerNameText: {
          ...typography.settingsRow,
          color: theme.colors.text.primary,
          fontWeight: '500',
        },
        currentPlayerName: {
          fontWeight: '700',
          color: theme.colors.brand.primary,
        },
        flairText: {
          ...typography.small,
          color: theme.colors.text.secondary,
          fontWeight: '600',
          marginTop: 2,
        },
        youBadge: {
          ...typography.small,
          color: theme.colors.brand.primary,
          fontWeight: '700',
          marginTop: 1,
        },
        scoreContainer: {
          alignItems: 'flex-end',
          marginLeft: 12,
        },
        scoreText: {
          ...typography.cardTitle,
          fontWeight: '800',
          color: theme.colors.brand.primary,
        },
        scoreHint: {
          ...typography.small,
          color: theme.colors.text.secondary,
          marginTop: 1,
        },

        footer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.surface.muted,
          backgroundColor: theme.colors.surface.card,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginHorizontal: -layout.screenPadding,
          paddingBottom: 16,
        },
        footerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        footerLabel: {
          ...typography.settingsRow,
          fontWeight: '700',
          color: theme.colors.brand.primary,
        },
        footerMeta: {
          ...typography.small,
          color: theme.colors.text.secondary,
          fontWeight: '600',
          marginTop: 2,
        },
        footerScore: {
          ...typography.cardTitle,
          fontWeight: '800',
          color: theme.colors.brand.primary,
        },
      }),
    [theme],
  );

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAuthPending = useAuthStore((s) => s.isAuthPending);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const stats = useStatsStore((s) => s.stats);

  const [activeTab, setActiveTab] = useState<LeaderboardType>('daily_streak');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const activeTabRef = useRef(activeTab);
  const hasFocusedRef = useRef(false);
  activeTabRef.current = activeTab;

  const localMetrics = useMemo(() => getLeaderboardMetrics(stats), [stats]);
  const localScore = localScoreForTab(activeTab, localMetrics);

  const loadLeaderboard = useCallback(
    async (type: LeaderboardType = activeTabRef.current) => {
      const requestId = ++requestIdRef.current;
      try {
        setError(null);
        setIsLoading(true);
        const result = await getLeaderboardData(type);
        if (
          !shouldApplyLeaderboardResult(
            requestId,
            requestIdRef.current,
            type,
            activeTabRef.current,
          )
        ) {
          return;
        }
        setData(result);
      } catch {
        if (
          !shouldApplyLeaderboardResult(
            requestId,
            requestIdRef.current,
            type,
            activeTabRef.current,
          )
        ) {
          return;
        }
        setError('Failed to load leaderboard. Please try again.');
        setData(null);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      hasFocusedRef.current = true;
      void reconcileLocalLeaderboardScores().finally(() => {
        loadLeaderboard(activeTabRef.current);
      });
      return () => {
        hasFocusedRef.current = false;
      };
    }, [isLoggedIn, loadLeaderboard]),
  );

  useEffect(() => {
    if (!isLoggedIn || !hasFocusedRef.current) return;
    loadLeaderboard(activeTab);
  }, [activeTab, isLoggedIn, loadLeaderboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard(activeTabRef.current);
    setRefreshing(false);
  }, [loadLeaderboard]);

  const handleTabChange = useCallback((tab: LeaderboardType) => {
    if (tab === activeTabRef.current) return;
    requestIdRef.current += 1;
    setActiveTab(tab);
    setData(null);
    setIsLoading(true);
    setError(null);
  }, []);

  const currentPlayerEntry = useMemo(
    () => data?.entries.find((e) => e.isCurrentPlayer) ?? null,
    [data],
  );

  const podiumEntries = useMemo(() => {
    if (!data?.entries.length) return [];
    return data.entries.filter((e) => e.rank <= 3);
  }, [data]);

  const listEntries = useMemo(() => {
    if (!data?.entries.length) return [];
    return data.entries.filter((e) => e.rank > 3);
  }, [data]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.authGate}>
          <View style={styles.authIcon}>
            <MaterialIcons
              name="emoji-events"
              size={40}
              color={theme.colors.brand.primary}
            />
          </View>
          <Text style={styles.authTitle}>Leaderboards</Text>
          <Text style={styles.authSubtitle}>
            Sign in with Play Games to see how you rank against other players.
          </Text>
          <TouchableOpacity
            style={styles.googleSignInButton}
            onPress={() => googleSignIn()}
            activeOpacity={0.7}
            disabled={isAuthPending}
          >
            {isAuthPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons
                  name="sports-esports"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.googleSignInText}>
                  Sign in with Play Games
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
      contentContainerStyle={styles.chipScrollContent}
    >
      {TAB_TYPES.map((type) => {
        const active = activeTab === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => handleTabChange(type)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={TAB_LABELS[type]}
          >
            <Text style={styles.chipIcon}>{TAB_ICONS[type]}</Text>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {TAB_CHIPS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <MaterialIcons
          name="leaderboard"
          size={36}
          color={theme.colors.text.secondary}
        />
      </View>
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>{EMPTY_MESSAGES[activeTab]}</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.errorIcon}>
        <MaterialIcons
          name="error-outline"
          size={36}
          color={theme.colors.status.danger}
        />
      </View>
      <Text style={styles.errorTitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadLeaderboard()}
        activeOpacity={0.7}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.status.accent} />
    </View>
  );

  const renderPodium = () => {
    if (podiumEntries.length === 0) return null;
    const byRank = new Map(podiumEntries.map((e) => [e.rank, e]));

    return (
      <View style={styles.podiumRow}>
        {PODIUM_ORDER.map((rank) => {
          const entry = byRank.get(rank);
          const medal = MEDAL_CONFIG[rank];
          if (!entry || !medal) {
            return <View key={rank} style={{ flex: 1 }} />;
          }
          const podiumTitle = getPodiumTitle(rank);
          const heightStyle =
            rank === 1
              ? styles.podiumCardFirst
              : rank === 2
                ? styles.podiumCardSecond
                : styles.podiumCardThird;

          return (
            <View
              key={entry.playerId}
              style={[
                styles.podiumCard,
                heightStyle,
                {
                  backgroundColor: medal.bg,
                  borderColor: medal.color,
                },
                entry.isCurrentPlayer && styles.currentPlayerRow,
              ]}
            >
              <Text style={styles.podiumMedal}>{medal.icon}</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {entry.isCurrentPlayer ? 'You' : entry.playerName}
              </Text>
              {podiumTitle ? (
                <Text style={[styles.podiumFlair, { color: medal.color }]}>
                  {podiumTitle}
                </Text>
              ) : null}
              {entry.isCurrentPlayer ? (
                <Text style={styles.podiumYou}>YOU</Text>
              ) : null}
              <Text style={[styles.podiumScore, { color: medal.color }]}>
                {entry.score}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEntryRow = ({ item }: { item: LeaderboardEntry }) => {
    return (
      <View
        style={[
          styles.entryRow,
          item.isCurrentPlayer && styles.currentPlayerRow,
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>

        <View style={styles.playerInfo}>
          <Text
            style={[
              styles.playerNameText,
              item.isCurrentPlayer && styles.currentPlayerName,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.isCurrentPlayer ? 'You' : item.playerName}
          </Text>
          {item.isCurrentPlayer ? (
            <Text style={styles.youBadge}>YOU</Text>
          ) : null}
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    const score = currentPlayerEntry?.score ?? localScore;
    const hasScore = score > 0;
    const rank = hasScore
      ? (currentPlayerEntry?.rank ?? data?.currentPlayerRank ?? null)
      : null;
    const rankLabel = formatPlacementLabel(rank, score);

    return (
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>You · {rankLabel}</Text>
            <Text style={styles.footerMeta}>
              {hasScore
                ? TAB_SCORE_HINT[activeTab]
                : 'Play to earn a score on this board'}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.footerScore}>{hasScore ? score : '—'}</Text>
            <Text style={styles.scoreHint}>your score</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    const view = resolveLeaderboardView({ isLoading, error, data });
    if (view === 'loading') return renderLoadingState();
    if (view === 'error') return renderErrorState();
    if (view === 'empty') return renderEmptyState();

    return (
      <>
        <FlatList
          key={activeTab}
          data={listEntries}
          keyExtractor={(item) => `${activeTab}-${item.playerId}-${item.rank}`}
          renderItem={renderEntryRow}
          ListHeaderComponent={renderPodium}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.status.accent}
              colors={[theme.colors.status.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
        {renderFooter()}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderChips()}
      <Text style={styles.boardDescription}>{TAB_DESCRIPTIONS[activeTab]}</Text>
      {renderContent()}
    </View>
  );
}
