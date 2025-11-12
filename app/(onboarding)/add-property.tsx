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
import { validateICalUrl } from '@/utils';
import { createProperty } from '@/services/properties.service';
import { useAuthStore } from '@/stores/authStore';

interface FormData {
  name: string;
  address: string;
  ical_url: string;
}

export default function AddPropertyScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    ical_url: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);

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
      newErrors.name = 'Property name is required';
    }

    if (!formData.ical_url.trim()) {
      newErrors.ical_url = 'iCal URL is required';
    } else if (!validateICalUrl(formData.ical_url.trim())) {
      newErrors.ical_url = 'Please enter a valid iCal URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a property');
      return;
    }

    setLoading(true);

    const { data, error } = await createProperty(user.id, {
      name: formData.name.trim(),
      address: formData.address.trim() || undefined,
      ical_url: formData.ical_url.trim(),
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      router.push('/onboarding/add-cleaner');
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
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 2</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Your First Property</Text>
            <Text style={styles.description}>
              We'll sync with your Airbnb/VRBO calendar to automatically detect checkouts
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Property Name"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              placeholder="e.g., Beach House, Mountain Cabin"
              error={errors.name}
              autoCapitalize="words"
              testID="property-name-input"
              accessibilityLabel="Property name"
            />

            <Input
              label="Address (Optional)"
              value={formData.address}
              onChangeText={(value) => handleChange('address', value)}
              placeholder="Full property address"
              error={errors.address}
              autoCapitalize="words"
              testID="property-address-input"
              accessibilityLabel="Property address"
            />

            <Input
              label="iCal URL"
              value={formData.ical_url}
              onChangeText={(value) => handleChange('ical_url', value)}
              placeholder="https://..."
              error={errors.ical_url}
              autoCapitalize="none"
              keyboardType="url"
              testID="property-ical-input"
              accessibilityLabel="Calendar iCal URL"
            />

            {/* Help Section */}
            <Card style={styles.helpCard}>
              <TouchableOpacity
                style={styles.helpHeader}
                onPress={() => setHelpExpanded(!helpExpanded)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={helpExpanded ? 'Hide help' : 'Show help'}
                accessibilityHint="Instructions for finding your iCal URL"
              >
                <View style={styles.helpHeaderLeft}>
                  <Ionicons
                    name="help-circle-outline"
                    size={iconSizes.md}
                    color={colors.info}
                  />
                  <Text style={styles.helpTitle}>How to find your iCal URL</Text>
                </View>
                <Ionicons
                  name={helpExpanded ? 'chevron-up' : 'chevron-down'}
                  size={iconSizes.sm}
                  color={colors.foggy}
                />
              </TouchableOpacity>

              {helpExpanded && (
                <View style={styles.helpContent}>
                  <View style={styles.helpSection}>
                    <Text style={styles.helpPlatform}>Airbnb:</Text>
                    <Text style={styles.helpText}>
                      1. Log into Airbnb on desktop{'\n'}
                      2. Go to Calendar for your listing{'\n'}
                      3. Click "Availability Settings"{'\n'}
                      4. Scroll to "Calendar sync"{'\n'}
                      5. Click "Export Calendar"{'\n'}
                      6. Copy the link shown
                    </Text>
                  </View>

                  <View style={styles.helpSection}>
                    <Text style={styles.helpPlatform}>VRBO:</Text>
                    <Text style={styles.helpText}>
                      1. Log into VRBO on desktop{'\n'}
                      2. Go to your property{'\n'}
                      3. Click "Calendar"{'\n'}
                      4. Click "Import/Export"{'\n'}
                      5. Select "Export" tab{'\n'}
                      6. Copy the iCal link
                    </Text>
                  </View>

                  <View style={styles.helpSection}>
                    <Text style={styles.helpPlatform}>Booking.com:</Text>
                    <Text style={styles.helpText}>
                      1. Log into Booking.com Extranet{'\n'}
                      2. Go to "Rates and Availability"{'\n'}
                      3. Click "Calendar import/export"{'\n'}
                      4. Click "Export calendar"{'\n'}
                      5. Copy the calendar URL
                    </Text>
                  </View>

                  <View style={styles.helpNote}>
                    <Ionicons
                      name="information-circle"
                      size={iconSizes.sm}
                      color={colors.info}
                    />
                    <Text style={styles.helpNoteText}>
                      The URL should start with "https://" or "webcal://" and typically ends with ".ics"
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="large"
              style={styles.submitButton}
              testID="continue-button"
              accessibilityLabel="Continue to next step"
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
  helpCard: {
    marginBottom: spacing.lg,
    backgroundColor: `${colors.info}05`,
    borderWidth: 1,
    borderColor: `${colors.info}20`,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
    marginLeft: spacing.sm,
  },
  helpContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.info}20`,
  },
  helpSection: {
    marginBottom: spacing.lg,
  },
  helpPlatform: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: 14,
    color: colors.foggy,
    lineHeight: 20,
  },
  helpNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  helpNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    marginLeft: spacing.sm,
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
