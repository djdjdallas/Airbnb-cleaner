import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CleaningJob, Property, Cleaner } from '../types';
import { colors, spacing } from '../constants/theme';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export interface JobCardProps {
  job: CleaningJob & {
    property?: Property;
    cleaner?: Cleaner | null;
  };
  onPress?: () => void;
  testID?: string;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, testID }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card onPress={onPress} testID={testID}>
      <View style={styles.container}>
        {/* Timeline indicator */}
        <View style={styles.timeline}>
          <View style={[styles.timelineDot, { backgroundColor: colors.rausch }]} />
          <View style={styles.timelineLine} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.propertyName} numberOfLines={1}>
              {job.property?.name || 'Unknown Property'}
            </Text>
            <StatusBadge status={job.status} size="small" />
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Checkout:</Text>
              <Text style={styles.value}>{formatDate(job.checkout_date)}</Text>
            </View>

            {job.checkin_date && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Check-in:</Text>
                <Text style={styles.value}>{formatDate(job.checkin_date)}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.label}>Cleaner:</Text>
              <Text style={styles.value}>
                {job.cleaner?.name || 'Not assigned'}
              </Text>
            </View>

            {job.amount_owed !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Amount:</Text>
                <Text
                  style={[
                    styles.value,
                    styles.amount,
                    job.payment_status === 'paid' && styles.paidAmount,
                  ]}
                >
                  ${job.amount_owed.toFixed(2)}{' '}
                  {job.payment_status === 'paid' ? '(Paid)' : '(Unpaid)'}
                </Text>
              </View>
            )}
          </View>

          {job.notes && (
            <Text style={styles.notes} numberOfLines={2}>
              {job.notes}
            </Text>
          )}

          {job.confirmed_at && (
            <Text style={styles.confirmedText}>
              Confirmed {formatTime(job.confirmed_at)}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  timeline: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    flex: 1,
    marginRight: spacing.sm,
  },
  details: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: colors.foggy,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: colors.hof,
    fontWeight: '600',
  },
  amount: {
    color: colors.error,
  },
  paidAmount: {
    color: colors.success,
  },
  notes: {
    fontSize: 13,
    color: colors.foggy,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  confirmedText: {
    fontSize: 11,
    color: colors.success,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
