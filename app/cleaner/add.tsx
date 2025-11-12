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

import { colors, spacing, iconSizes } from '@/constants/theme';
import type { CleanerFormData } from '@/types';
import { validatePhone } from '@/utils';
import { createCleaner } from '@/services/cleaners.service';
import { useAuthStore } from '@/stores/authStore';

export default function AddCleanerScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState<CleanerFormData>({
    name: '',
    phone: '',
    hourly_rate: '',
  });

  const [errors, setErrors] = useState<Partial<CleanerFormData>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof CleanerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CleanerFormData> = {};

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

    const hourlyRate = formData.hourly_rate.trim()
      ? parseFloat(formData.hourly_rate)
      : undefined;

    const { data, error } = await createCleaner(user.id, {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      hourly_rate: hourlyRate,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      Alert.alert('Success', 'Cleaner added successfully');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={iconSizes.md} color={colors.hof} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Cleaner</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Cleaner Name"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              placeholder="e.g., John Smith"
              error={errors.name}
              autoCapitalize="words"
              testID="cleaner-name-input"
            />

            <Input
              label="Phone Number"
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              placeholder="(555) 123-4567"
              error={errors.phone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              testID="cleaner-phone-input"
            />

            <Input
              label="Hourly Rate (Optional)"
              value={formData.hourly_rate}
              onChangeText={(value) => handleChange('hourly_rate', value)}
              placeholder="25.00"
              error={errors.hourly_rate}
              keyboardType="decimal-pad"
              testID="cleaner-rate-input"
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={iconSizes.md} color={colors.info} />
              <Text style={styles.infoText}>
                Phone number will be used to send SMS notifications about cleaning jobs. Make sure
                to enter a mobile number that can receive text messages.
              </Text>
            </View>

            <Button
              title="Add Cleaner"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="large"
              style={styles.submitButton}
              testID="add-cleaner-button"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  keyboardAvoid: {
    flex: 1,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  form: {
    padding: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
