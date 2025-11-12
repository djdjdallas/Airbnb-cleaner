/**
 * Manage Subscription Screen
 * Allows users to view and manage their Stripe subscription
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AuthService } from '@/services/auth.service';
import {
  getSubscriptionStatus,
  getInvoices,
  cancelSubscription,
  updatePaymentMethod,
  formatCurrency,
  getCardBrandName,
  StripeServiceError,
} from '@/services/stripe.service';
import type { StripeSubscription, StripeInvoice } from '@/types';

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Get user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: user } = await AuthService.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        Alert.alert('Error', 'Please sign in to manage your subscription');
        router.back();
      }
    };
    fetchUserId();
  }, [router]);

  // Fetch subscription and invoices
  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const [subscriptionData, invoicesData] = await Promise.all([
        getSubscriptionStatus(userId),
        getInvoices(userId, 10),
      ]);

      setSubscription(subscriptionData);
      setInvoices(invoicesData);
    } catch (error) {
      if (error instanceof StripeServiceError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to load subscription data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Format subscription status
  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
      case 'trialing':
        return colors.success;
      case 'past_due':
      case 'unpaid':
        return colors.warning;
      case 'canceled':
      case 'incomplete_expired':
        return colors.error;
      default:
        return colors.foggy;
    }
  };

  // Get invoice status color
  const getInvoiceStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'open':
        return colors.warning;
      case 'void':
      case 'uncollectible':
        return colors.error;
      default:
        return colors.foggy;
    }
  };

  // Handle change plan
  const handleChangePlan = () => {
    router.push('/subscription/plans');
  };

  // Handle update payment method
  const handleUpdatePaymentMethod = async () => {
    if (!userId) return;

    setActionLoading(true);
    try {
      const result = await updatePaymentMethod(userId);
      if (result.success) {
        Alert.alert('Success', 'Payment method updated successfully');
        await fetchData();
      }
    } catch (error) {
      if (error instanceof StripeServiceError) {
        if (error.code !== 'Canceled') {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert('Error', 'Failed to update payment method');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel subscription
  const handleCancelPress = () => {
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!userId) return;

    setShowCancelDialog(false);
    setActionLoading(true);

    try {
      await cancelSubscription(userId, false); // Cancel at period end
      Alert.alert(
        'Subscription Canceled',
        'Your subscription will remain active until the end of your billing period.'
      );
      await fetchData();
    } catch (error) {
      if (error instanceof StripeServiceError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to cancel subscription');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDialogDismiss = () => {
    setShowCancelDialog(false);
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner testID="subscription-loading" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.rausch}
            colors={[colors.rausch]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.hof} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* No Subscription State */}
        {!subscription && (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={colors.foggy} />
            <Text style={styles.emptyStateTitle}>No Active Subscription</Text>
            <Text style={styles.emptyStateText}>
              Subscribe to unlock premium features and manage unlimited properties.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleChangePlan}
              disabled={actionLoading}
            >
              <Text style={styles.primaryButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Details */}
        {subscription && (
          <>
            {/* Current Plan Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Plan</Text>
              <View style={styles.card}>
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planAmount}>
                      {formatCurrency(subscription.plan.amount, subscription.plan.currency)}
                    </Text>
                    <Text style={styles.planInterval}>
                      per {subscription.plan.interval}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(subscription.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(subscription.status) },
                      ]}
                    >
                      {formatStatus(subscription.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.planDetails}>
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Billing Period</Text>
                    <Text style={styles.planDetailValue}>
                      {format(new Date(subscription.current_period_start * 1000), 'MMM d')} -{' '}
                      {format(new Date(subscription.current_period_end * 1000), 'MMM d, yyyy')}
                    </Text>
                  </View>

                  {subscription.cancel_at_period_end && (
                    <View style={styles.planDetailRow}>
                      <Text style={styles.planDetailLabel}>Cancels On</Text>
                      <Text style={[styles.planDetailValue, { color: colors.error }]}>
                        {format(new Date(subscription.current_period_end * 1000), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Payment Method */}
                {subscription.default_payment_method?.card && (
                  <View style={styles.paymentMethodSection}>
                    <View style={styles.separator} />
                    <View style={styles.paymentMethodRow}>
                      <View style={styles.paymentMethodInfo}>
                        <Text style={styles.paymentMethodLabel}>Payment Method</Text>
                        <Text style={styles.paymentMethodValue}>
                          {getCardBrandName(subscription.default_payment_method.card.brand)} ****
                          {subscription.default_payment_method.card.last4}
                        </Text>
                        <Text style={styles.paymentMethodExpiry}>
                          Expires {subscription.default_payment_method.card.exp_month}/
                          {subscription.default_payment_method.card.exp_year}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleUpdatePaymentMethod}
                        disabled={actionLoading}
                        style={styles.updateButton}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color={colors.rausch} />
                        ) : (
                          <Text style={styles.updateButtonText}>Update</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleChangePlan}
                disabled={actionLoading}
              >
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.rausch} />
                <Text style={styles.secondaryButtonText}>Change Plan</Text>
              </TouchableOpacity>

              {!subscription.cancel_at_period_end && (
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={handleCancelPress}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Invoice History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invoice History</Text>
              {invoices.length === 0 ? (
                <View style={styles.emptyInvoices}>
                  <Text style={styles.emptyInvoicesText}>No invoices yet</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {invoices.map((invoice, index) => (
                    <React.Fragment key={invoice.id}>
                      <View style={styles.invoiceItem}>
                        <View style={styles.invoiceLeft}>
                          <Text style={styles.invoiceDate}>
                            {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                          </Text>
                          <View style={styles.invoiceStatusContainer}>
                            <View
                              style={[
                                styles.invoiceStatusDot,
                                { backgroundColor: getInvoiceStatusColor(invoice.status || '') },
                              ]}
                            />
                            <Text style={styles.invoiceStatus}>
                              {invoice.status?.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.invoiceRight}>
                          <Text style={styles.invoiceAmount}>
                            {formatCurrency(invoice.amount_paid, invoice.currency)}
                          </Text>
                          {invoice.hosted_invoice_url && (
                            <TouchableOpacity
                              onPress={() => {
                                // Open invoice URL
                                if (invoice.hosted_invoice_url) {
                                  // You would use Linking.openURL here
                                  console.log('Open invoice:', invoice.hosted_invoice_url);
                                }
                              }}
                            >
                              <Ionicons name="download-outline" size={20} color={colors.rausch} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {index < invoices.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        visible={showCancelDialog}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDialogDismiss}
        destructive={true}
        testID="cancel-subscription-dialog"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.hof,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.foggy,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  planInfo: {
    flex: 1,
  },
  planAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.hof,
  },
  planInterval: {
    fontSize: 14,
    color: colors.foggy,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planDetails: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  planDetailLabel: {
    fontSize: 14,
    color: colors.foggy,
  },
  planDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.hof,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  paymentMethodSection: {
    marginTop: spacing.md,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: colors.foggy,
    marginBottom: spacing.xs,
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.hof,
    marginBottom: spacing.xxs,
  },
  paymentMethodExpiry: {
    fontSize: 12,
    color: colors.foggy,
  },
  updateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.rausch,
  },
  primaryButton: {
    backgroundColor: colors.rausch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.rausch,
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.rausch,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  emptyInvoices: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyInvoicesText: {
    fontSize: 14,
    color: colors.foggy,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  invoiceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  invoiceStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  invoiceStatus: {
    fontSize: 12,
    color: colors.foggy,
    fontWeight: '500',
  },
  invoiceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
  },
});
