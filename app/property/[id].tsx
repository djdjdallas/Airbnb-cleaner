import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';
import type { PropertyWithCleaners } from '@/types';
import { formatDate, formatRelativeTime } from '@/utils';
import {
  getPropertyWithDetails,
  deleteProperty,
  syncPropertyCalendar,
} from '@/services/properties.service';
import { useAuthStore } from '@/stores/authStore';

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [property, setProperty] = useState<PropertyWithCleaners | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProperty();
    }
  }, [id]);

  const loadProperty = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getPropertyWithDetails(id);

    if (fetchError) {
      setError(fetchError.message);
      Alert.alert('Error', fetchError.message);
    } else if (data) {
      setProperty(data);
    }

    setLoading(false);
  };

  const handleSync = async () => {
    if (!id) return;

    setSyncing(true);

    const { data, error: syncError } = await syncPropertyCalendar(id);

    if (syncError) {
      Alert.alert('Sync Failed', syncError.message);
    } else {
      Alert.alert('Success', 'Calendar synced successfully');
      loadProperty(); // Reload property data
    }

    setSyncing(false);
  };

  const handleCopyICalUrl = async () => {
    if (property?.ical_url) {
      await Clipboard.setStringAsync(property.ical_url);
      Alert.alert('Copied', 'iCal URL copied to clipboard');
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const { error: deleteError } = await deleteProperty(id);

    if (deleteError) {
      Alert.alert('Error', deleteError.message);
    } else {
      Alert.alert('Success', 'Property deleted successfully');
      router.back();
    }

    setDeleteDialogVisible(false);
  };

  const handleEdit = () => {
    router.push(`/property/edit/${id}`);
  };

  const maskICalUrl = (url: string) => {
    if (url.length <= 20) return url;
    return `${url.substring(0, 30)}...${url.substring(url.length - 10)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSizes.md} color={colors.hof} />
          </TouchableOpacity>
        </View>
        <EmptyState
          title="Property Not Found"
          message={error || 'Unable to load property details'}
          actionText="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSizes.md} color={colors.hof} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Property Info */}
        <View style={styles.section}>
          <Text style={styles.propertyName}>{property.name}</Text>
          {property.address && <Text style={styles.propertyAddress}>{property.address}</Text>}
        </View>

        {/* Calendar Sync Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Calendar Sync</Text>
          </View>

          <View style={styles.syncInfo}>
            <Text style={styles.label}>iCal URL</Text>
            <View style={styles.urlContainer}>
              <Text style={styles.urlText} numberOfLines={1}>
                {maskICalUrl(property.ical_url)}
              </Text>
              <TouchableOpacity onPress={handleCopyICalUrl} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={iconSizes.sm} color={colors.rausch} />
              </TouchableOpacity>
            </View>
          </View>

          {property.last_synced && (
            <View style={styles.syncInfo}>
              <Text style={styles.label}>Last Synced</Text>
              <Text style={styles.value}>{formatRelativeTime(property.last_synced)}</Text>
              <Text style={styles.subValue}>{formatDate(property.last_synced, 'PPpp')}</Text>
            </View>
          )}

          {(property as any).sync_error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={iconSizes.sm} color={colors.error} />
              <Text style={styles.errorText}>{(property as any).sync_error}</Text>
            </View>
          )}

          <Button
            title={syncing ? 'Syncing...' : 'Sync Now'}
            onPress={handleSync}
            loading={syncing}
            disabled={syncing}
            variant="secondary"
            size="medium"
            style={styles.syncButton}
          />
        </Card>

        {/* Assigned Cleaners Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Assigned Cleaners</Text>
          </View>

          {property.cleaners && property.cleaners.length > 0 ? (
            <View style={styles.cleanersList}>
              {property.cleaners.map((pc) => (
                <TouchableOpacity
                  key={pc.id}
                  style={styles.cleanerItem}
                  onPress={() => router.push(`/cleaner/${pc.cleaner_id}`)}
                >
                  <View style={styles.cleanerInfo}>
                    <View style={styles.cleanerAvatar}>
                      <Ionicons name="person" size={iconSizes.sm} color={colors.white} />
                    </View>
                    <View style={styles.cleanerDetails}>
                      <Text style={styles.cleanerName}>
                        {pc.cleaner?.name || 'Unknown Cleaner'}
                      </Text>
                      {pc.is_primary && (
                        <StatusBadge status="active" size="small" style={styles.primaryBadge} />
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.foggy} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No cleaners assigned yet</Text>
          )}

          <Button
            title="Add Cleaner"
            onPress={() => router.push(`/property/${id}/assign-cleaner`)}
            variant="outline"
            size="medium"
            style={styles.addButton}
            icon={<Ionicons name="add" size={iconSizes.sm} color={colors.rausch} />}
          />
        </Card>

        {/* Upcoming Cleanings Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Upcoming Cleanings</Text>
          </View>

          {property.upcoming_jobs && property.upcoming_jobs.length > 0 ? (
            <View style={styles.jobsList}>
              {property.upcoming_jobs.slice(0, 5).map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobItem}
                  onPress={() => router.push(`/job/${job.id}`)}
                >
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobDate}>{formatDate(job.checkout_date, 'MMM d')}</Text>
                    <View style={styles.jobDetails}>
                      <Text style={styles.jobTime}>{formatDate(job.checkout_date, 'h:mm a')}</Text>
                      {job.cleaner && (
                        <Text style={styles.jobCleaner}>{job.cleaner.name}</Text>
                      )}
                    </View>
                  </View>
                  <StatusBadge status={job.status} size="small" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming cleanings</Text>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Edit Property"
            onPress={handleEdit}
            variant="outline"
            size="large"
            style={styles.actionButton}
          />
          <Button
            title="Delete Property"
            onPress={() => setDeleteDialogVisible(true)}
            variant="danger"
            size="large"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Property"
        message={`Are you sure you want to delete "${property.name}"? This action cannot be undone and will delete all associated cleaning jobs.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
  },
  headerSpacer: {
    width: iconSizes.md + spacing.sm * 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  propertyName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    fontSize: 16,
    color: colors.foggy,
    lineHeight: 24,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    marginLeft: spacing.sm,
  },
  syncInfo: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: colors.foggy,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  value: {
    fontSize: 16,
    color: colors.hof,
  },
  subValue: {
    fontSize: 14,
    color: colors.foggy,
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}10`,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  syncButton: {
    marginTop: spacing.sm,
  },
  cleanersList: {
    marginBottom: spacing.md,
  },
  cleanerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cleanerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cleanerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.rausch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanerDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  primaryBadge: {
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.foggy,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  addButton: {
    marginTop: spacing.sm,
  },
  jobsList: {
    marginBottom: spacing.md,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobDate: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.hof,
    width: 60,
  },
  jobDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  jobTime: {
    fontSize: 14,
    color: colors.hof,
  },
  jobCleaner: {
    fontSize: 12,
    color: colors.foggy,
    marginTop: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
