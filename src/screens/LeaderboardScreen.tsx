import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { layout } from '../constants/layout';
import { typography } from '../constants/typography';
import { useAuthStore } from '../stores/authStore';
import {
  getLeaderboardData,
  reconcileLocalLeaderboardScores,
} from '../services/leaderboardService';
import type { LeaderboardData, LeaderboardEntry } from '../types';
import type { LeaderboardType } from '../services/firestoreService';
import {
  resolveLeaderboardView,
  shouldApplyLeaderboardResult,
} from './leaderboardView';

// ── Tab config ──

const TAB_LABELS: Record<LeaderboardType, string> = {
  daily_streak: 'Daily streak',
  endless_streak: 'Endless streak',
  endless_total: 'Endless words',
};

const TAB_TYPES: LeaderboardType[] = ['daily_streak', 'endless_streak', 'endless_total'];

const TAB_ICONS: Record<LeaderboardType, string> = {
  daily_streak: '🌅',
  endless_streak: '🔥',
  endless_total: '🏆',
};

const TAB_SCORE_HINT: Record<LeaderboardType, string> = {
  daily_streak: 'consecutive Daily wins',
  endless_streak: 'current Endless run',
  endless_total: 'Endless words cleared',
};

// ── Empty state messages ──

const EMPTY_MESSAGES: Record<LeaderboardType, string> = {
  daily_streak:
    'No Daily streaks yet.\nWin Daily Challenges on consecutive days to climb this board.',
  endless_streak:
    'No Endless streaks yet.\nWin games in Endless mode to set a streak.',
  endless_total:
    'No Endless word totals yet.\nPlay Endless mode — this ranks total words cleared.',
};

// ── Top 3 medal config ──

const MEDAL_CONFIG: Record<number, { icon: string; color: string; bg: string }> = {
  1: { icon: '🥇', color: '#FFD700', bg: '#FFF8E1' },
  2: { icon: '🥈', color: '#C0C0C0', bg: '#F5F5F5' },
  3: { icon: '🥉', color: '#CD7F32', bg: '#FFF3E0' },
};

// ── Component ──

export function LeaderboardScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
          padding: layout.screenPadding,
        },

        // ── Pill segmented control ──
        segmentContainer: {
          flexDirection: 'row',
          backgroundColor: theme.colors.surface.muted,
          borderRadius: layout.buttonBorderRadius,
          padding: 4,
          marginBottom: 16,
        },
        segmentTab: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: layout.buttonBorderRadius - 2,
        },
        segmentTabActive: {
          backgroundColor: theme.colors.brand.primary,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        },
        segmentIcon: {
          fontSize: 14,
        },
        segmentText: {
          ...typography.small,
          color: theme.colors.text.secondary,
          fontWeight: '600',
        },
        segmentTextActive: {
          color: '#FFFFFF',
          fontWeight: '700',
        },

        // ── Auth gate ──
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

        // ── Loading ──
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        },

        // ── Empty ──
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

        // ── Error ──
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

        // ── List ──
        listContent: {
          paddingBottom: 32,
        },
        // Entry row — rounded card
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
        // Rank
        rankContainer: {
          width: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankMedal: {
          fontSize: 24,
        },
        rankText: {
          ...typography.cardTitle,
          fontWeight: '800',
          color: theme.colors.text.secondary,
        },
        // Player info
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
        youBadge: {
          ...typography.small,
          color: theme.colors.brand.primary,
          fontWeight: '700',
          marginTop: 1,
        },
        // Score
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
        scoreTop3: {
          fontSize: 20,
        },
      }),
    [theme],
  );

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAuthPending = useAuthStore((s) => s.isAuthPending);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);

  const [activeTab, setActiveTab] = useState<LeaderboardType>('daily_streak');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const activeTabRef = useRef(activeTab);
  const hasFocusedRef = useRef(false);
  activeTabRef.current = activeTab;

  const loadLeaderboard = useCallback(async (type: LeaderboardType = activeTabRef.current) => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      hasFocusedRef.current = true;
      // Heal local scores once when the screen is opened; tab switches only fetch.
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
    requestIdRef.current += 1; // invalidate any in-flight fetch for the old tab
    setActiveTab(tab);
    setData(null);
    setIsLoading(true);
    setError(null);
  }, []);

  // ── Sign-in gate ──
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

  // ── Pill segmented control ──
  const renderSegment = () => (
    <View style={styles.segmentContainer}>
      {TAB_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.segmentTab,
            activeTab === type && styles.segmentTabActive,
          ]}
          onPress={() => handleTabChange(type)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === type }}
          accessibilityLabel={TAB_LABELS[type]}
        >
          <Text style={styles.segmentIcon}>{TAB_ICONS[type]}</Text>
          <Text
            style={[
              styles.segmentText,
              activeTab === type && styles.segmentTextActive,
            ]}
          >
            {TAB_LABELS[type]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
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

  const renderEntryRow = ({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const medal = MEDAL_CONFIG[item.rank];

    return (
      <View
        style={[
          styles.entryRow,
          item.isCurrentPlayer && styles.currentPlayerRow,
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {isTop3 && medal ? (
            <Text style={styles.rankMedal}>{medal.icon}</Text>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        {/* Player info */}
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
          {item.isCurrentPlayer && (
            <Text style={styles.youBadge}>YOU</Text>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text
            style={[
              styles.scoreText,
              isTop3 && styles.scoreTop3,
              isTop3 && medal && { color: medal.color },
            ]}
          >
            {item.score}
          </Text>
          <Text style={styles.scoreHint}>{TAB_SCORE_HINT[activeTab]}</Text>
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
      <FlatList
        key={activeTab}
        data={data!.entries}
        keyExtractor={(item) => `${activeTab}-${item.playerId}-${item.rank}`}
        renderItem={renderEntryRow}
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
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderSegment()}
      {renderContent()}
    </View>
  );
}
