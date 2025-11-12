import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { CleanerCard } from '@/components/CleanerCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getAllCleaners } from '@/services/cleaners.service';
import { AuthService } from '@/services/auth.service';
import type { Cleaner } from '@/types';

export default function CleanersScreen() {
  const router = useRouter();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [filteredCleaners, setFilteredCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Get user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: user } = await AuthService.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Fetch cleaners
  const fetchCleaners = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      const { data, error: serviceError } = await getAllCleaners(userId);

      if (serviceError) {
        setError(serviceError.message);
        Alert.alert('Error', serviceError.message);
        return;
      }

      setCleaners(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cleaners';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Apply filter when cleaners or filter state changes
  useEffect(() => {
    if (showActiveOnly) {
      setFilteredCleaners(cleaners.filter(cleaner => cleaner.active));
    } else {
      setFilteredCleaners(cleaners);
    }
  }, [cleaners, showActiveOnly]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchCleaners();
    }
  }, [userId, fetchCleaners]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCleaners();
  }, [fetchCleaners]);

  // Navigation handlers
  const handleAddCleaner = () => {
    router.push('/cleaner/add');
  };

  const handleCleanerPress = (cleanerId: string) => {
    router.push(`/cleaner/${cleanerId}`);
  };

  // Toggle filter
  const handleToggleFilter = () => {
    setShowActiveOnly(!showActiveOnly);
  };

  // Render item
  const renderCleaner = ({ item }: { item: Cleaner }) => (
    <CleanerCard
      cleaner={item}
      onPress={() => handleCleanerPress(item.id)}
      testID={`cleaner-card-${item.id}`}
    />
  );

  // Key extractor
  const keyExtractor = (item: Cleaner) => item.id;

  // Empty state
  const renderEmptyState = () => {
    if (loading) return null;

    if (showActiveOnly && cleaners.length > 0) {
      return (
        <EmptyState
          icon={<Ionicons name="people-outline" size={64} color={colors.foggy} />}
          title="No Active Cleaners"
          description="All your cleaners are currently inactive. Toggle the filter to see all cleaners."
          testID="empty-active-cleaners-state"
        />
      );
    }

    return (
      <EmptyState
        icon={<Ionicons name="people-outline" size={64} color={colors.foggy} />}
        title="No Cleaners Yet"
        description="Add your first cleaner to start assigning cleaning jobs and managing schedules."
        actionLabel="Add Cleaner"
        onAction={handleAddCleaner}
        testID="empty-cleaners-state"
      />
    );
  };

  // List header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cleaners</Text>
        <TouchableOpacity
          onPress={handleAddCleaner}
          style={styles.addButton}
          accessibilityLabel="Add cleaner"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={colors.rausch} />
        </TouchableOpacity>
      </View>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          onPress={handleToggleFilter}
          style={styles.filterButton}
          accessibilityLabel={showActiveOnly ? 'Show all cleaners' : 'Show active cleaners only'}
          accessibilityRole="button"
        >
          <Ionicons
            name={showActiveOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={20}
            color={showActiveOnly ? colors.rausch : colors.foggy}
          />
          <Text
            style={[
              styles.filterText,
              showActiveOnly && styles.filterTextActive,
            ]}
          >
            Active Only
          </Text>
        </TouchableOpacity>
        {cleaners.length > 0 && (
          <Text style={styles.countText}>
            {filteredCleaners.length} of {cleaners.length}
          </Text>
        )}
      </View>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LoadingSpinner testID="cleaners-loading" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCleaners}
        renderItem={renderCleaner}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          filteredCleaners.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.rausch}
            colors={[colors.rausch]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
  },
  addButton: {
    padding: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  filterText: {
    fontSize: 14,
    color: colors.foggy,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.rausch,
    fontWeight: '600',
  },
  countText: {
    fontSize: 14,
    color: colors.foggy,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
