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
import { PropertyCard } from '@/components/PropertyCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getAllProperties } from '@/services/properties.service';
import { AuthService } from '@/services/auth.service';
import type { Property } from '@/types';

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      const { data, error: serviceError } = await getAllProperties(userId);

      if (serviceError) {
        setError(serviceError.message);
        Alert.alert('Error', serviceError.message);
        return;
      }

      setProperties(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchProperties();
    }
  }, [userId, fetchProperties]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProperties();
  }, [fetchProperties]);

  // Navigation handlers
  const handleAddProperty = () => {
    router.push('/property/add');
  };

  const handlePropertyPress = (propertyId: string) => {
    router.push(`/property/${propertyId}`);
  };

  // Render item
  const renderProperty = ({ item }: { item: Property }) => (
    <PropertyCard
      property={item}
      onPress={() => handlePropertyPress(item.id)}
      testID={`property-card-${item.id}`}
    />
  );

  // Key extractor
  const keyExtractor = (item: Property) => item.id;

  // Empty state
  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <EmptyState
        icon={<Ionicons name="home-outline" size={64} color={colors.foggy} />}
        title="No Properties Yet"
        description="Add your first property to start managing cleanings and tracking bookings."
        actionLabel="Add Property"
        onAction={handleAddProperty}
        testID="empty-properties-state"
      />
    );
  };

  // List header
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Properties</Text>
      <TouchableOpacity
        onPress={handleAddProperty}
        style={styles.addButton}
        accessibilityLabel="Add property"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={colors.rausch} />
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LoadingSpinner testID="properties-loading" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          properties.length === 0 && styles.emptyListContent,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
  },
  addButton: {
    padding: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
