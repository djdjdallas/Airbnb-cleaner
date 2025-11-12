import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';

export default function CompleteScreen() {
  const router = useRouter();

  const handleGoToDashboard = () => {
    router.replace('/(tabs)/properties');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="checkmark"
              size={iconSizes.xxl * 1.5}
              color={colors.white}
            />
          </View>
        </View>

        {/* Success Message */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>All Set!</Text>
          <Text style={styles.subtitle}>
            Your calendar will sync within the next hour. You'll be notified when your first
            cleaning is detected.
          </Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          <Card style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <View style={styles.iconCircleSmall}>
                <Ionicons
                  name="sync"
                  size={iconSizes.lg}
                  color={colors.babu}
                />
              </View>
            </View>
            <Text style={styles.infoCardTitle}>Automatic Calendar Sync</Text>
            <Text style={styles.infoCardDescription}>
              Your property calendars sync every 6 hours to detect new checkouts
            </Text>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <View style={styles.iconCircleSmall}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={iconSizes.lg}
                  color={colors.babu}
                />
              </View>
            </View>
            <Text style={styles.infoCardTitle}>SMS Notifications</Text>
            <Text style={styles.infoCardDescription}>
              Cleaners receive instant alerts when new cleaning jobs are scheduled
            </Text>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <View style={styles.iconCircleSmall}>
                <Ionicons
                  name="wallet"
                  size={iconSizes.lg}
                  color={colors.babu}
                />
              </View>
            </View>
            <Text style={styles.infoCardTitle}>Payment Tracking</Text>
            <Text style={styles.infoCardDescription}>
              Keep track of what you owe each cleaner with automatic payment calculations
            </Text>
          </Card>
        </View>

        {/* Additional Info */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={iconSizes.md}
            color={colors.info}
          />
          <Text style={styles.infoText}>
            You can add more properties and cleaners, or manage your settings anytime from the
            dashboard.
          </Text>
        </View>

        {/* Action Button */}
        <Button
          title="Go to Dashboard"
          onPress={handleGoToDashboard}
          variant="primary"
          size="large"
          style={styles.primaryButton}
          testID="go-to-dashboard-button"
          accessibilityLabel="Go to dashboard"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.babu,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.foggy,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  infoCardsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  infoCardIcon: {
    marginBottom: spacing.md,
  },
  iconCircleSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.babu}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  infoCardDescription: {
    fontSize: 14,
    color: colors.foggy,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
  },
});
