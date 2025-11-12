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
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getAllJobs, getUpcomingJobs, JobFilters } from '@/services/jobs.service';
import { getAllProperties } from '@/services/properties.service';
import { AuthService } from '@/services/auth.service';
import type { CleaningJob, Property, JobStatus } from '@/types';

interface JobSection {
  title: string;
  date: string;
  data: CleaningJob[];
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CleaningJob[]>([]);
  const [sections, setSections] = useState<JobSection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | 'all'>('all');
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

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

  // Fetch properties for filter
  const fetchProperties = useCallback(async () => {
    if (!userId) return;

    const { data } = await getAllProperties(userId);
    if (data) {
      setProperties(data);
    }
  }, [userId]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);

      // Calculate date range for next 30 days
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      // Build filters
      const filters: JobFilters = {
        startDate: today.toISOString(),
        endDate: futureDate.toISOString(),
      };

      if (selectedProperty !== 'all') {
        filters.propertyId = selectedProperty;
      }

      if (selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }

      const { data, error: serviceError } = await getAllJobs(userId, filters);

      if (serviceError) {
        setError(serviceError.message);
        Alert.alert('Error', serviceError.message);
        return;
      }

      setJobs(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedProperty, selectedStatus]);

  // Group jobs by date
  useEffect(() => {
    const grouped: { [key: string]: CleaningJob[] } = {};

    jobs.forEach(job => {
      const date = new Date(job.checkout_date);
      const dateKey = date.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(job);
    });

    // Convert to sections array
    const newSections: JobSection[] = Object.keys(grouped)
      .sort()
      .map(dateKey => {
        const date = new Date(dateKey);
        return {
          title: formatSectionDate(date),
          date: dateKey,
          data: grouped[dateKey].sort(
            (a, b) =>
              new Date(a.checkout_date).getTime() - new Date(b.checkout_date).getTime()
          ),
        };
      });

    setSections(newSections);
  }, [jobs]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchProperties();
      fetchJobs();
    }
  }, [userId, fetchProperties, fetchJobs]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [fetchJobs]);

  // Format section date
  const formatSectionDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateString = date.toDateString();
    const todayString = today.toDateString();
    const tomorrowString = tomorrow.toDateString();

    if (dateString === todayString) {
      return 'Today';
    } else if (dateString === tomorrowString) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Navigation handlers
  const handleJobPress = (jobId: string) => {
    router.push(`/job/${jobId}`);
  };

  // Filter handlers
  const handlePropertySelect = (propertyId: string) => {
    setSelectedProperty(propertyId);
    setShowPropertyPicker(false);
  };

  const handleStatusSelect = (status: JobStatus | 'all') => {
    setSelectedStatus(status);
    setShowStatusPicker(false);
  };

  // Render item
  const renderJob = ({ item }: { item: CleaningJob }) => (
    <JobCard
      job={item}
      onPress={() => handleJobPress(item.id)}
      testID={`job-card-${item.id}`}
    />
  );

  // Render section header
  const renderSectionHeader = ({ section }: { section: JobSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} jobs</Text>
    </View>
  );

  // Key extractor
  const keyExtractor = (item: CleaningJob) => item.id;

  // Empty state
  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <EmptyState
        icon={<Ionicons name="calendar-outline" size={64} color={colors.foggy} />}
        title="No Upcoming Jobs"
        description="There are no scheduled cleaning jobs for the next 30 days. Check back later or adjust your filters."
        testID="empty-schedule-state"
      />
    );
  };

  // List header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
      </View>
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setShowPropertyPicker(!showPropertyPicker)}
            style={styles.filterButton}
            accessibilityLabel="Filter by property"
            accessibilityRole="button"
          >
            <Ionicons name="home-outline" size={18} color={colors.rausch} />
            <Text style={styles.filterButtonText}>
              {selectedProperty === 'all'
                ? 'All Properties'
                : properties.find(p => p.id === selectedProperty)?.name || 'Property'}
            </Text>
            <Ionicons
              name={showPropertyPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.foggy}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            style={styles.filterButton}
            accessibilityLabel="Filter by status"
            accessibilityRole="button"
          >
            <Ionicons name="filter-outline" size={18} color={colors.rausch} />
            <Text style={styles.filterButtonText}>
              {selectedStatus === 'all' ? 'All Status' : selectedStatus}
            </Text>
            <Ionicons
              name={showStatusPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.foggy}
            />
          </TouchableOpacity>
        </View>

        {showPropertyPicker && (
          <View style={styles.picker}>
            <TouchableOpacity
              onPress={() => handlePropertySelect('all')}
              style={styles.pickerItem}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  selectedProperty === 'all' && styles.pickerItemTextSelected,
                ]}
              >
                All Properties
              </Text>
            </TouchableOpacity>
            {properties.map(property => (
              <TouchableOpacity
                key={property.id}
                onPress={() => handlePropertySelect(property.id)}
                style={styles.pickerItem}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedProperty === property.id && styles.pickerItemTextSelected,
                  ]}
                >
                  {property.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showStatusPicker && (
          <View style={styles.picker}>
            {(['all', 'pending', 'confirmed', 'completed'] as const).map(status => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusSelect(status)}
                style={styles.pickerItem}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedStatus === status && styles.pickerItemTextSelected,
                  ]}
                >
                  {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LoadingSpinner testID="schedule-loading" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderJob}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.emptyListContent,
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
        stickySectionHeadersEnabled={false}
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
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.hof,
    fontWeight: '500',
  },
  picker: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    fontSize: 14,
    color: colors.hof,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: colors.rausch,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
  },
  sectionCount: {
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
