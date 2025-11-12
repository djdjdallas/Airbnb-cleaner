import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Input, Button } from '@/components';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { validateEmail, showErrorToast } from '@/utils';
import { AuthService } from '@/services/auth.service';

/**
 * Forgot Password Screen
 * Allows users to reset their password via email
 * Features:
 * - Email validation
 * - Success message after sending
 * - Loading states
 * - Error handling
 * - Link back to login
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear errors when user types
  useEffect(() => {
    if (emailError) setEmailError('');
    if (generalError) setGeneralError('');
  }, [email]);

  /**
   * Validates email input
   * @returns True if email is valid
   */
  const validateForm = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  /**
   * Handles password reset submission
   */
  const handleResetPassword = async () => {
    // Clear previous errors
    setEmailError('');
    setGeneralError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Attempt to send reset email
      const { error } = await AuthService.resetPassword(email.trim());

      if (error) {
        const errorMessage = showErrorToast(error);
        setGeneralError(errorMessage);
        return;
      }

      // Show success state
      setIsSuccess(true);
    } catch (error: any) {
      const errorMessage = showErrorToast({
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        details: error,
      });
      setGeneralError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles form submission via Enter key
   */
  const handleSubmitEditing = () => {
    handleResetPassword();
  };

  /**
   * Handles back to login navigation
   */
  const handleBackToLogin = () => {
    router.back();
  };

  // Success state view
  if (isSuccess) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Check your email</Text>
            <Text style={styles.heroSubtitle}>
              We've sent password reset instructions
            </Text>
          </View>

          {/* Success Section */}
          <View style={styles.formContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Email sent successfully</Text>
              <Text style={styles.successMessage}>
                We've sent a password reset link to{' '}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <Text style={styles.successInstructions}>
                Please check your inbox and follow the instructions to reset
                your password. The link will expire in 1 hour.
              </Text>
            </View>

            {/* Back to Login Button */}
            <Button
              title="Back to Sign In"
              onPress={handleBackToLogin}
              variant="primary"
              size="large"
              style={styles.backButton}
              testID="forgot-password-back-button"
            />

            {/* Resend Link */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the email? </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                accessibilityLabel="Try again"
                accessibilityRole="button"
              >
                <Text style={styles.resendLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Form view
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Reset your password</Text>
          <Text style={styles.heroSubtitle}>
            Enter your email and we'll send you reset instructions
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* General Error Message */}
          {generalError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText} accessibilityRole="alert">
                {generalError}
              </Text>
            </View>
          ) : null}

          {/* Info Message */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              We'll send you a secure link to reset your password. This link
              will expire in 1 hour.
            </Text>
          </View>

          {/* Email Input */}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            autoFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleSubmitEditing}
            editable={!isLoading}
            testID="forgot-password-email-input"
          />

          {/* Send Reset Link Button */}
          <Button
            title="Send Reset Link"
            onPress={handleResetPassword}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            style={styles.sendButton}
            testID="forgot-password-send-button"
          />

          {/* Back to Login Link */}
          <View style={styles.backToLoginContainer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                accessibilityLabel="Back to sign in"
                accessibilityRole="link"
                disabled={isLoading}
              >
                <Text style={styles.backToLoginLink}>← Back to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? spacing.xxxl : spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.rausch,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 24,
  },
  formContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  errorContainer: {
    backgroundColor: '#FEE',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: colors.foggy,
    lineHeight: 20,
  },
  sendButton: {
    marginBottom: spacing.xl,
  },
  backToLoginContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backToLoginLink: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    fontSize: 48,
    color: '#00C853',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.hof,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.foggy,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successEmail: {
    fontWeight: '600',
    color: colors.hof,
  },
  successInstructions: {
    fontSize: 14,
    color: colors.foggy,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.xl,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resendText: {
    fontSize: 14,
    color: colors.foggy,
  },
  resendLink: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
});
