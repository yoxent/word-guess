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
import { useColors } from '../hooks/useColors';
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

// ── Top 3 medal colors ──

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};

// ── Component ──

export function LeaderboardScreen() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },

        // ── Segment control ──
        segmentContainer: {
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.tileEmpty,
        },
        segmentTab: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 14,
          position: 'relative',
        },
        segmentText: {
          ...typography.body,
          color: colors.textSecondary,
          fontWeight: '500',
        },
        activeSegmentText: {
          color: colors.accent,
          fontWeight: '700',
        },
        activeIndicator: {
          position: 'absolute',
          bottom: 0,
          height: 3,
          width: '60%',
          backgroundColor: colors.accent,
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
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 8,
        },
        authSubtitle: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 20,
        },
        googleSignInButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          gap: 10,
          minWidth: 220,
        },
        googleSignInText: {
          ...typography.settingsRow,
          color: colors.textInverse,
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
          color: colors.textPrimary,
          marginTop: 12,
          marginBottom: 4,
        },
        emptySubtitle: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
        },

        // ── Error ──
        errorTitle: {
          ...typography.body,
          color: colors.danger,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 16,
        },
        retryButton: {
          backgroundColor: colors.accent,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 24,
        },
        retryText: {
          ...typography.settingsRow,
          color: colors.textInverse,
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
          backgroundColor: colors.surface,
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
          backgroundColor: `${colors.accent}1A`, // accent at ~10% opacity
        },
        rankContainer: {
          width: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankText: {
          ...typography.settingsRow,
          fontWeight: '700',
          color: colors.textSecondary,
          fontSize: 15,
        },
        playerNameText: {
          ...typography.settingsRow,
          color: colors.textPrimary,
          flex: 1,
          marginLeft: 8,
        },
        currentPlayerName: {
          fontWeight: '700',
          color: colors.accent,
        },
        scoreText: {
          ...typography.settingsRow,
          fontWeight: '700',
          color: colors.accent,
          marginLeft: 8,
        },
        currentPlayerScore: {
          color: colors.accent,
        },
      }),
    [colors],
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
          <MaterialIcons name="emoji-events" size={64} color={colors.textSecondary} />
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
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color={colors.textInverse} />
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
      <MaterialIcons name="leaderboard" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>{EMPTY_MESSAGES[activeTab]}</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="error-outline" size={48} color={colors.danger} />
      <Text style={styles.errorTitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadLeaderboard} activeOpacity={0.7}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
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
            tintColor={colors.accent}
            colors={[colors.accent]}
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
