import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';

import { colors, spacing, borderRadius, iconSizes } from '@/constants/theme';
import { validatePhone } from '@/utils';
import { createCleaner } from '@/services/cleaners.service';
import { useAuthStore } from '@/stores/authStore';

interface FormData {
  name: string;
  phone: string;
  hourly_rate: string;
}

export default function AddCleanerScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    hourly_rate: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Cleaner name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.hourly_rate.trim()) {
      const rate = parseFloat(formData.hourly_rate);
      if (isNaN(rate) || rate < 0) {
        newErrors.hourly_rate = 'Please enter a valid hourly rate';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a cleaner');
      return;
    }

    setLoading(true);

    const { data, error } = await createCleaner(user.id, {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      hourly_rate: formData.hourly_rate.trim()
        ? parseFloat(formData.hourly_rate.trim())
        : undefined,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      router.push('/onboarding/complete');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/properties');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>Step 2 of 2</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Your First Cleaner</Text>
            <Text style={styles.description}>
              They'll receive automatic SMS notifications when cleanings are needed
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Cleaner Name"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              placeholder="Full name"
              error={errors.name}
              autoCapitalize="words"
              testID="cleaner-name-input"
              accessibilityLabel="Cleaner name"
            />

            <Input
              label="Phone Number"
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              placeholder="+1 (555) 123-4567"
              error={errors.phone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              testID="cleaner-phone-input"
              accessibilityLabel="Phone number"
            />

            <Input
              label="Hourly Rate (Optional)"
              value={formData.hourly_rate}
              onChangeText={(value) => handleChange('hourly_rate', value)}
              placeholder="$25.00"
              error={errors.hourly_rate}
              keyboardType="decimal-pad"
              testID="cleaner-rate-input"
              accessibilityLabel="Hourly rate"
            />

            {/* SMS Consent Info */}
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle"
                  size={iconSizes.md}
                  color={colors.info}
                />
                <Text style={styles.infoTitle}>About SMS Notifications</Text>
              </View>
              <Text style={styles.infoText}>
                By adding a cleaner, you confirm that they have consented to receive automated SMS
                notifications about cleaning jobs.
              </Text>
              <View style={styles.infoDivider} />
              <Text style={styles.infoSubtext}>
                This complies with TCPA regulations. Cleaners can opt out at any time by replying
                STOP to any message or updating their preferences in the app.
              </Text>
            </Card>

            <Button
              title="Finish Setup"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="large"
              style={styles.submitButton}
              testID="finish-setup-button"
              accessibilityLabel="Finish setup"
            />

            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Skip this step"
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.rausch,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foggy,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 16,
    color: colors.foggy,
    lineHeight: 24,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.lg,
    backgroundColor: `${colors.info}05`,
    borderWidth: 1,
    borderColor: `${colors.info}20`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
    marginLeft: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.hof,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoDivider: {
    height: 1,
    backgroundColor: `${colors.info}20`,
    marginBottom: spacing.md,
  },
  infoSubtext: {
    fontSize: 13,
    color: colors.foggy,
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: spacing.md,
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
