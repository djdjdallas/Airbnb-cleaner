import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/onboarding/add-property');
  };

  const handleSkip = () => {
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

        {/* Welcome Message */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome to Cleaner Scheduler!</Text>
          <Text style={styles.subtitle}>
            Let's get your account set up in 2 quick steps
          </Text>
        </View>

        {/* Checklist */}
        <Card style={styles.checklistCard}>
          <View style={styles.checklistItem}>
            <View style={styles.checklistIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={iconSizes.lg}
                color={colors.babu}
              />
            </View>
            <View style={styles.checklistTextContainer}>
              <Text style={styles.checklistTitle}>Add your first property</Text>
              <Text style={styles.checklistDescription}>
                Connect your Airbnb or VRBO calendar
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.checklistItem}>
            <View style={styles.checklistIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={iconSizes.lg}
                color={colors.babu}
              />
            </View>
            <View style={styles.checklistTextContainer}>
              <Text style={styles.checklistTitle}>Add your first cleaner</Text>
              <Text style={styles.checklistDescription}>
                They'll receive automatic SMS notifications
              </Text>
            </View>
          </View>
        </Card>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={iconSizes.md}
            color={colors.info}
          />
          <Text style={styles.infoText}>
            Don't worry, you can skip these steps and add them later from your dashboard
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            size="large"
            style={styles.primaryButton}
            testID="get-started-button"
            accessibilityLabel="Get started with setup"
          />

          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
            accessibilityLabel="Skip setup and go to dashboard"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip and go to dashboard</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.rausch,
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
  checklistCard: {
    marginBottom: spacing.lg,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checklistIconContainer: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  checklistTextContainer: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  checklistDescription: {
    fontSize: 14,
    color: colors.foggy,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    width: '100%',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foggy,
  },
});
