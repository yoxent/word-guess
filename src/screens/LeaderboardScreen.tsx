import React, { useState, useCallback, useMemo } from 'react';
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
import { typography } from '../constants/typography';
import { useAuthStore } from '../stores/authStore';
import { getLeaderboardData } from '../services/leaderboardService';
import type { LeaderboardData, LeaderboardEntry } from '../types';
import type { LeaderboardType } from '../services/firestoreService';

// ── Tab labels ──

const TAB_LABELS: Record<LeaderboardType, string> = {
  daily_streak: 'Daily Streak',
  endless_streak: 'Endless Streak',
  endless_total: 'Endless Total',
};

const TAB_TYPES: LeaderboardType[] = ['daily_streak', 'endless_streak', 'endless_total'];

// ── Empty state messages ──

const EMPTY_MESSAGES: Record<LeaderboardType, string> = {
  daily_streak: 'No daily entries yet. Win a Daily Challenge to appear here.',
  endless_streak: 'No endless entries yet. Play Endless mode to set a streak.',
  endless_total: 'No endless entries yet. Play Endless mode to guess words.',
};

// ── Top 3 medal colors (intentionally NOT theme-aware — gold/silver/bronze are universal) ──

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
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
        },

        // ── Segment control ──
        segmentContainer: {
          flexDirection: 'row',
          backgroundColor: theme.colors.surface.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tile.empty,
        },
        segmentTab: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 14,
          position: 'relative',
        },
        segmentText: {
          ...typography.body,
          color: theme.colors.text.secondary,
          fontWeight: '500',
        },
        activeSegmentText: {
          color: theme.colors.status.accent,
          fontWeight: '700',
        },
        activeIndicator: {
          position: 'absolute',
          bottom: 0,
          height: 3,
          width: '60%',
          backgroundColor: theme.colors.status.accent,
          borderRadius: 1.5,
        },

        // ── Auth gate ──
        authGate: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        authTitle: {
          ...typography.cardTitle,
          color: theme.colors.text.primary,
          marginTop: 16,
          marginBottom: 8,
        },
        authSubtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 20,
        },
        googleSignInButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          gap: 10,
          minWidth: 220,
        },
        googleSignInText: {
          ...typography.settingsRow,
          color: theme.colors.button.primary.fg,
          fontWeight: '600',
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
        emptyTitle: {
          ...typography.cardTitle,
          color: theme.colors.text.primary,
          marginTop: 12,
          marginBottom: 4,
        },
        emptySubtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          lineHeight: 20,
        },

        // ── Error ──
        errorTitle: {
          ...typography.body,
          color: theme.colors.status.danger,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 16,
        },
        retryButton: {
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 24,
        },
        retryText: {
          ...typography.settingsRow,
          color: theme.colors.button.primary.fg,
          fontWeight: '600',
        },

        // ── List ──
        listContent: {
          padding: 16,
          paddingBottom: 32,
        },
        entryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface.card,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        },
        currentPlayerRow: {
          backgroundColor: `${theme.colors.status.accent}1A`, // accent at ~10% opacity
        },
        rankContainer: {
          width: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankText: {
          ...typography.settingsRow,
          fontWeight: '700',
          color: theme.colors.text.secondary,
          fontSize: 15,
        },
        playerNameText: {
          ...typography.settingsRow,
          color: theme.colors.text.primary,
          flex: 1,
          marginLeft: 8,
        },
        currentPlayerName: {
          fontWeight: '700',
          color: theme.colors.status.accent,
        },
        scoreText: {
          ...typography.settingsRow,
          fontWeight: '700',
          color: theme.colors.status.accent,
          marginLeft: 8,
        },
        currentPlayerScore: {
          color: theme.colors.status.accent,
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

  // ── Data loading ──

  const loadLeaderboard = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await getLeaderboardData(activeTab);
      setData(result);
    } catch (e) {
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Auto-refresh on focus (D-151)
  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      loadLeaderboard();
    }, [activeTab, isLoggedIn, loadLeaderboard]),
  );

  // ── Pull-to-refresh ──

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  // ── Tab switching ──

  const handleTabChange = useCallback((tab: LeaderboardType) => {
    setActiveTab(tab);
    setIsLoading(true);
    setError(null);
    // Data loading will trigger via useFocusEffect
  }, []);

  // ── Sign-in gate (D-150) ──

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.authGate}>
          <MaterialIcons name="emoji-events" size={64} color={theme.colors.icon.muted} />
          <Text style={styles.authTitle}>Leaderboards</Text>
          <Text style={styles.authSubtitle}>
            Sign in with Google to see how you rank against other players.
          </Text>
          <TouchableOpacity
            style={styles.googleSignInButton}
            onPress={() => googleSignIn()}
            activeOpacity={0.7}
            disabled={isAuthPending}
          >
            {isAuthPending ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color={theme.colors.icon.inverse} />
                <Text style={styles.googleSignInText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render helpers ──

  const renderSegment = () => (
    <View style={styles.segmentContainer}>
      {TAB_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={styles.segmentTab}
          onPress={() => handleTabChange(type)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === type && styles.activeSegmentText,
            ]}
          >
            {TAB_LABELS[type]}
          </Text>
          {activeTab === type && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="leaderboard" size={48} color={theme.colors.icon.muted} />
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>{EMPTY_MESSAGES[activeTab]}</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="error-outline" size={48} color={theme.colors.status.danger} />
      <Text style={styles.errorTitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadLeaderboard} activeOpacity={0.7}>
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
    const medalColor = MEDAL_COLORS[item.rank];

    return (
      <View
        style={[
          styles.entryRow,
          item.isCurrentPlayer && styles.currentPlayerRow,
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {isTop3 ? (
            <MaterialIcons
              name="emoji-events"
              size={22}
              color={medalColor}
            />
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>
        {/* Player name */}
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
        {/* Score */}
        <Text
          style={[
            styles.scoreText,
            isTop3 && { color: medalColor },
            item.isCurrentPlayer && styles.currentPlayerScore,
          ]}
        >
          {item.score}
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading && !data) {
      return renderLoadingState();
    }

    if (error && !data) {
      return renderErrorState();
    }

    if (!data || data.entries.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={data.entries}
        keyExtractor={(item) => `${item.playerId}-${item.rank}`}
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
