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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Input } from '@/components/Input';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';
import type { JobWithDetails, JobStatus } from '@/types';
import { formatDate, formatCurrency, formatPhone, formatRelativeTime } from '@/utils';
import {
  getJobWithDetails,
  updateJob,
  markJobAsPaid,
  deleteJob,
} from '@/services/jobs.service';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

  useEffect(() => {
    if (job) {
      setNotes(job.notes || '');
    }
  }, [job]);

  const loadJob = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getJobWithDetails(id);

    if (fetchError) {
      setError(fetchError.message);
      Alert.alert('Error', fetchError.message);
    } else if (data) {
      setJob(data);
    }

    setLoading(false);
  };

  const handleCall = () => {
    if (job?.cleaner?.phone) {
      const phoneUrl = `tel:${job.cleaner.phone}`;
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
    if (job?.cleaner?.phone) {
      const smsUrl = `sms:${job.cleaner.phone}`;
      Linking.canOpenURL(smsUrl).then((supported) => {
        if (supported) {
          Linking.openURL(smsUrl);
        } else {
          Alert.alert('Error', 'Unable to send text messages on this device');
        }
      });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!id) return;

    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this job as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            const { error } = await markJobAsPaid(id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'Job marked as paid');
              loadJob();
            }
          },
        },
      ]
    );
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    setSavingNotes(true);

    const { error } = await updateJob(id, { notes: notes.trim() || null });

    setSavingNotes(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditingNotes(false);
      loadJob();
    }
  };

  const handleCancelJob = async () => {
    if (!id) return;

    const { error } = await updateJob(id, { status: 'cancelled' });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Job cancelled successfully');
      setCancelDialogVisible(false);
      loadJob();
    }
  };

  const handleReassignCleaner = () => {
    router.push(`/job/${id}/reassign`);
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return colors.pending;
      case 'confirmed':
        return colors.confirmed;
      case 'completed':
        return colors.completed;
      case 'cancelled':
        return colors.cancelled;
      default:
        return colors.foggy;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSizes.md} color={colors.hof} />
          </TouchableOpacity>
        </View>
        <EmptyState
          title="Job Not Found"
          message={error || 'Unable to load job details'}
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
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Property Info */}
        <TouchableOpacity
          style={styles.propertySection}
          onPress={() => router.push(`/property/${job.property.id}`)}
        >
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{job.property.name}</Text>
            {job.property.address && (
              <Text style={styles.propertyAddress}>{job.property.address}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.foggy} />
        </TouchableOpacity>

        {/* Dates Section */}
        <Card style={styles.card}>
          <View style={styles.datesContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Checkout</Text>
              <Text style={styles.dateValue}>{formatDate(job.checkout_date, 'MMM d')}</Text>
              <Text style={styles.dateTime}>{formatDate(job.checkout_date, 'h:mm a')}</Text>
              <Text style={styles.dateYear}>{formatDate(job.checkout_date, 'yyyy')}</Text>
            </View>
            {job.checkin_date && (
              <>
                <Ionicons name="arrow-forward" size={iconSizes.md} color={colors.foggy} />
                <View style={styles.dateBox}>
                  <Text style={styles.dateLabel}>Check-in</Text>
                  <Text style={styles.dateValue}>{formatDate(job.checkin_date, 'MMM d')}</Text>
                  <Text style={styles.dateTime}>{formatDate(job.checkin_date, 'h:mm a')}</Text>
                  <Text style={styles.dateYear}>{formatDate(job.checkin_date, 'yyyy')}</Text>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Cleaner Info */}
        {job.cleaner ? (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={iconSizes.md} color={colors.rausch} />
              <Text style={styles.cardTitle}>Assigned Cleaner</Text>
            </View>

            <TouchableOpacity
              style={styles.cleanerInfo}
              onPress={() => router.push(`/cleaner/${job.cleaner!.id}`)}
            >
              <View style={styles.cleanerAvatar}>
                <Ionicons name="person" size={iconSizes.md} color={colors.white} />
              </View>
              <View style={styles.cleanerDetails}>
                <Text style={styles.cleanerName}>{job.cleaner.name}</Text>
                <Text style={styles.cleanerPhone}>{formatPhone(job.cleaner.phone)}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.cleanerActions}>
              <Button
                title="Call"
                onPress={handleCall}
                variant="secondary"
                size="medium"
                style={styles.cleanerButton}
                icon={<Ionicons name="call" size={iconSizes.sm} color={colors.white} />}
              />
              <Button
                title="Text"
                onPress={handleText}
                variant="outline"
                size="medium"
                style={styles.cleanerButton}
                icon={<Ionicons name="chatbubble-outline" size={iconSizes.sm} color={colors.rausch} />}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.noCleanerText}>No cleaner assigned yet</Text>
            <Button
              title="Assign Cleaner"
              onPress={handleReassignCleaner}
              variant="primary"
              size="medium"
              style={styles.assignButton}
            />
          </Card>
        )}

        {/* Status Timeline */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Status Timeline</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: job.sms_sent_at ? colors.completed : colors.foggy },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>SMS Sent</Text>
                {job.sms_sent_at ? (
                  <>
                    <Text style={styles.timelineValue}>
                      {formatRelativeTime(job.sms_sent_at)}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(job.sms_sent_at, 'MMM d, h:mm a')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.timelineEmpty}>Not sent</Text>
                )}
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: job.confirmed_at ? colors.confirmed : colors.foggy },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Confirmed</Text>
                {job.confirmed_at ? (
                  <>
                    <Text style={styles.timelineValue}>
                      {formatRelativeTime(job.confirmed_at)}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(job.confirmed_at, 'MMM d, h:mm a')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.timelineEmpty}>Not confirmed</Text>
                )}
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: job.completed_at ? colors.completed : colors.foggy },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Completed</Text>
                {job.completed_at ? (
                  <>
                    <Text style={styles.timelineValue}>
                      {formatRelativeTime(job.completed_at)}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(job.completed_at, 'MMM d, h:mm a')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.timelineEmpty}>Not completed</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusLabel}>Current Status</Text>
            <StatusBadge status={job.status} />
          </View>
        </Card>

        {/* Payment Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount Owed</Text>
              <Text style={styles.paymentAmount}>
                {job.amount_owed ? formatCurrency(job.amount_owed) : '$0.00'}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Status</Text>
              <StatusBadge
                status={job.payment_status === 'paid' ? 'completed' : 'pending'}
                size="small"
              />
            </View>
          </View>

          {job.payment_status === 'unpaid' && job.amount_owed && (
            <Button
              title="Mark as Paid"
              onPress={handleMarkAsPaid}
              variant="secondary"
              size="medium"
              style={styles.payButton}
            />
          )}
        </Card>

        {/* Notes Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={iconSizes.md} color={colors.rausch} />
            <Text style={styles.cardTitle}>Notes</Text>
            {!editingNotes && (
              <TouchableOpacity
                onPress={() => setEditingNotes(true)}
                style={styles.editNotesButton}
              >
                <Ionicons name="create-outline" size={iconSizes.sm} color={colors.rausch} />
              </TouchableOpacity>
            )}
          </View>

          {editingNotes ? (
            <>
              <Input
                label=""
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this cleaning job..."
                multiline
              />
              <View style={styles.notesActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setEditingNotes(false);
                    setNotes(job.notes || '');
                  }}
                  variant="outline"
                  size="medium"
                  style={styles.notesButton}
                />
                <Button
                  title="Save"
                  onPress={handleSaveNotes}
                  loading={savingNotes}
                  disabled={savingNotes}
                  variant="primary"
                  size="medium"
                  style={styles.notesButton}
                />
              </View>
            </>
          ) : (
            <Text style={[styles.notesText, !job.notes && styles.noNotes]}>
              {job.notes || 'No notes added'}
            </Text>
          )}
        </Card>

        {/* SMS Logs */}
        {job.sms_logs && job.sms_logs.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubbles" size={iconSizes.md} color={colors.rausch} />
              <Text style={styles.cardTitle}>SMS Conversation</Text>
            </View>

            <View style={styles.smsLogs}>
              {job.sms_logs.map((log) => (
                <View
                  key={log.id}
                  style={[
                    styles.smsMessage,
                    log.direction === 'outbound' ? styles.smsOutbound : styles.smsInbound,
                  ]}
                >
                  <Text
                    style={[
                      styles.smsText,
                      log.direction === 'outbound' && styles.smsTextOutbound,
                    ]}
                  >
                    {log.message}
                  </Text>
                  <Text
                    style={[
                      styles.smsTime,
                      log.direction === 'outbound' && styles.smsTimeOutbound,
                    ]}
                  >
                    {formatDate(log.created_at, 'MMM d, h:mm a')}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {job.cleaner && (
            <Button
              title="Reassign Cleaner"
              onPress={handleReassignCleaner}
              variant="outline"
              size="large"
              style={styles.actionButton}
            />
          )}
          {job.status !== 'cancelled' && (
            <Button
              title="Cancel Job"
              onPress={() => setCancelDialogVisible(true)}
              variant="danger"
              size="large"
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        visible={cancelDialogVisible}
        title="Cancel Job"
        message="Are you sure you want to cancel this cleaning job? The cleaner will be notified."
        confirmText="Cancel Job"
        cancelText="Go Back"
        destructive
        onConfirm={handleCancelJob}
        onCancel={() => setCancelDialogVisible(false)}
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
  propertySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    fontSize: 14,
    color: colors.foggy,
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
    flex: 1,
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  dateBox: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foggy,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  dateTime: {
    fontSize: 14,
    color: colors.foggy,
  },
  dateYear: {
    fontSize: 12,
    color: colors.foggy,
    marginTop: spacing.xs,
  },
  cleanerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  cleanerAvatar: {
    width: 50,
    height: 50,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  cleanerPhone: {
    fontSize: 14,
    color: colors.foggy,
  },
  cleanerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cleanerButton: {
    flex: 1,
  },
  noCleanerText: {
    fontSize: 14,
    color: colors.foggy,
    textAlign: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  assignButton: {
    marginTop: spacing.sm,
  },
  timeline: {
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    marginTop: 4,
    marginRight: spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  timelineValue: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.xs,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.foggy,
  },
  timelineEmpty: {
    fontSize: 14,
    color: colors.foggy,
    fontStyle: 'italic',
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  currentStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
  },
  paymentInfo: {
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
  },
  payButton: {
    marginTop: spacing.sm,
  },
  editNotesButton: {
    padding: spacing.sm,
  },
  notesText: {
    fontSize: 14,
    color: colors.hof,
    lineHeight: 20,
  },
  noNotes: {
    color: colors.foggy,
    fontStyle: 'italic',
  },
  notesActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  notesButton: {
    flex: 1,
  },
  smsLogs: {
    gap: spacing.md,
  },
  smsMessage: {
    maxWidth: '80%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  smsOutbound: {
    alignSelf: 'flex-end',
    backgroundColor: colors.rausch,
  },
  smsInbound: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
  },
  smsText: {
    fontSize: 14,
    color: colors.hof,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  smsTextOutbound: {
    color: colors.white,
  },
  smsTime: {
    fontSize: 11,
    color: colors.foggy,
  },
  smsTimeOutbound: {
    color: 'rgba(255, 255, 255, 0.8)',
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
