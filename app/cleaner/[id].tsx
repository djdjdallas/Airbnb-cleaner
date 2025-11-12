import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';
import type { CleanerWithStats, CleaningJob } from '@/types';
import { formatDate, formatCurrency, formatPhone } from '@/utils';
import { getCleanerWithStats } from '@/services/cleaners.service';
import { getAllJobs, markJobAsPaid } from '@/services/jobs.service';
import { useAuthStore } from '@/stores/authStore';

export default function CleanerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [cleaner, setCleaner] = useState<CleanerWithStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<CleaningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCleaner();
      loadRecentJobs();
    }
  }, [id]);

  const loadCleaner = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getCleanerWithStats(id);

    if (fetchError) {
      setError(fetchError.message);
      Alert.alert('Error', fetchError.message);
    } else if (data) {
      setCleaner(data);
    }

    setLoading(false);
  };

  const loadRecentJobs = async () => {
    if (!id || !user) return;

    const { data, error: jobsError } = await getAllJobs(user.id, {
      cleanerId: id,
    });

    if (!jobsError && data) {
      setRecentJobs(data.slice(0, 10));
    }
  };

  const handleCall = () => {
    if (cleaner?.phone) {
      const phoneUrl = `tel:${cleaner.phone}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone calls on this device');
        }
      });
    }
  };

  const handleText = () => {
    if (cleaner?.phone) {
      const smsUrl = `sms:${cleaner.phone}`;
      Linking.canOpenURL(smsUrl).then((supported) => {
        if (supported) {
          Linking.openURL(smsUrl);
        } else {
          Alert.alert('Error', 'Unable to send text messages on this device');
        }
      });
    }
  };

  const handleEdit = () => {
    router.push(`/cleaner/edit/${id}`);
  };

  const handleMarkJobAsPaid = async (jobId: string) => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this job as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            const { error } = await markJobAsPaid(jobId);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'Job marked as paid');
              loadCleaner(); // Reload to update unpaid amount
              loadRecentJobs(); // Reload jobs
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !cleaner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSizes.md} color={colors.hof} />
          </TouchableOpacity>
        </View>
        <EmptyState
          title="Cleaner Not Found"
          message={error || 'Unable to load cleaner details'}
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
          <Text style={styles.headerTitle}>Cleaner Details</Text>
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={iconSizes.md} color={colors.rausch} />
          </TouchableOpacity>
        </View>

        {/* Cleaner Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={iconSizes.xxl} color={colors.white} />
          </View>
          <Text style={styles.cleanerName}>{cleaner.name}</Text>
        </View>

        {/* Contact Info */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="call" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>

          <View style={styles.contactInfo}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.phoneNumber}>{formatPhone(cleaner.phone)}</Text>
          </View>

          <View style={styles.contactActions}>
            <Button
              title="Call"
              onPress={handleCall}
              variant="secondary"
              size="medium"
              style={styles.contactButton}
              icon={<Ionicons name="call" size={iconSizes.sm} color={colors.white} />}
            />
            <Button
              title="Text"
              onPress={handleText}
              variant="outline"
              size="medium"
              style={styles.contactButton}
              icon={<Ionicons name="chatbubble-outline" size={iconSizes.sm} color={colors.rausch} />}
            />
          </View>
        </Card>

        {/* Hourly Rate */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Hourly Rate</Text>
          </View>

          <View style={styles.rateContainer}>
            {cleaner.hourly_rate ? (
              <Text style={styles.rate}>{formatCurrency(cleaner.hourly_rate)}/hr</Text>
            ) : (
              <Text style={styles.noRate}>No rate set</Text>
            )}
          </View>
        </Card>

        {/* Payment Summary */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>

          <View style={styles.paymentSummary}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Unpaid</Text>
              <Text style={styles.paymentAmount}>
                {formatCurrency(cleaner.unpaid_amount)}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Jobs</Text>
              <Text style={styles.paymentValue}>{cleaner.total_jobs}</Text>
            </View>

            {cleaner.last_job_date && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Last Job</Text>
                <Text style={styles.paymentValue}>
                  {formatDate(cleaner.last_job_date, 'MMM d, yyyy')}
                </Text>
              </View>
            )}
          </View>

          <Button
            title="View Payment History"
            onPress={() => router.push(`/cleaner/${id}/payments`)}
            variant="outline"
            size="medium"
            style={styles.paymentButton}
          />
        </Card>

        {/* Assigned Properties */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Assigned Properties</Text>
          </View>

          {cleaner.assigned_properties && cleaner.assigned_properties.length > 0 ? (
            <View style={styles.propertiesList}>
              {cleaner.assigned_properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={styles.propertyItem}
                  onPress={() => router.push(`/property/${property.id}`)}
                >
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>{property.name}</Text>
                    {property.address && (
                      <Text style={styles.propertyAddress}>{property.address}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.foggy} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No properties assigned</Text>
          )}
        </Card>

        {/* Recent Jobs */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Recent Jobs</Text>
          </View>

          {recentJobs.length > 0 ? (
            <View style={styles.jobsList}>
              {recentJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobItem}
                  onPress={() => router.push(`/job/${job.id}`)}
                >
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobDate}>
                      {formatDate(job.checkout_date, 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.jobProperty}>
                      {job.property?.name || 'Unknown Property'}
                    </Text>
                    {job.amount_owed && (
                      <Text style={styles.jobAmount}>
                        {formatCurrency(job.amount_owed)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.jobStatusContainer}>
                    <StatusBadge status={job.status} size="small" />
                    {job.payment_status === 'unpaid' && job.amount_owed && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkJobAsPaid(job.id);
                        }}
                      >
                        <Text style={styles.payButtonText}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No recent jobs</Text>
          )}
        </Card>
      </ScrollView>
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
  editButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.rausch,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cleanerName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
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
  contactInfo: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  phoneNumber: {
    fontSize: 18,
    color: colors.hof,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contactButton: {
    flex: 1,
  },
  rateContainer: {
    paddingVertical: spacing.sm,
  },
  rate: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.babu,
  },
  noRate: {
    fontSize: 16,
    color: colors.foggy,
    fontStyle: 'italic',
  },
  paymentSummary: {
    marginBottom: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.foggy,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
  },
  paymentValue: {
    fontSize: 16,
    color: colors.hof,
  },
  paymentButton: {
    marginTop: spacing.sm,
  },
  propertiesList: {
    marginBottom: spacing.sm,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    fontSize: 14,
    color: colors.foggy,
  },
  emptyText: {
    fontSize: 14,
    color: colors.foggy,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  jobsList: {
    marginBottom: spacing.sm,
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
    flex: 1,
  },
  jobDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  jobProperty: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.xs,
  },
  jobAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.babu,
  },
  jobStatusContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  payButton: {
    backgroundColor: colors.babu,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
});
