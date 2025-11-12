import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Input, Button } from '@/components';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { validateEmail, validatePassword, showErrorToast } from '@/utils';
import { AuthService } from '@/services/auth.service';

/**
 * Sign Up Screen
 * Allows users to create a new account
 * Features:
 * - Full name, email, and password inputs
 * - Password strength indicator
 * - SMS consent checkbox
 * - Form validation
 * - Loading states
 * - Error handling
 */
export default function SignUpScreen() {
  const router = useRouter();
  const emailInputRef = useRef<RNTextInput>(null);
  const passwordInputRef = useRef<RNTextInput>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);

  // Error state
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: '', color: colors.foggy });

  // Clear errors when user types
  useEffect(() => {
    if (fullNameError) setFullNameError('');
    if (generalError) setGeneralError('');
  }, [fullName]);

  useEffect(() => {
    if (emailError) setEmailError('');
    if (generalError) setGeneralError('');
  }, [email]);

  useEffect(() => {
    if (passwordError) setPasswordError('');
    if (generalError) setGeneralError('');
    updatePasswordStrength(password);
  }, [password]);

  /**
   * Updates password strength indicator
   */
  const updatePasswordStrength = (pwd: string) => {
    if (!pwd) {
      setPasswordStrength({ score: 0, label: '', color: colors.foggy });
      return;
    }

    let score = 0;
    let label = '';
    let color = colors.error;

    // Check length
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;

    // Check character types
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    // Determine strength label and color
    if (score <= 1) {
      label = 'Weak';
      color = colors.error;
    } else if (score <= 3) {
      label = 'Fair';
      color = '#FFA500';
    } else if (score <= 4) {
      label = 'Good';
      color = colors.babu;
    } else {
      label = 'Strong';
      color = '#00C853';
    }

    setPasswordStrength({ score, label, color });
  };

  /**
   * Validates form inputs
   * @returns True if form is valid
   */
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate full name
    if (!fullName.trim()) {
      setFullNameError('Full name is required');
      isValid = false;
    } else if (fullName.trim().length < 2) {
      setFullNameError('Name must be at least 2 characters');
      isValid = false;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.errors[0]);
      isValid = false;
    }

    return isValid;
  };

  /**
   * Handles sign up submission
   */
  const handleSignUp = async () => {
    // Clear previous errors
    setFullNameError('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Attempt sign up
      const { data, error } = await AuthService.signUp(
        email.trim(),
        password,
        fullName.trim()
      );

      if (error) {
        const errorMessage = showErrorToast(error);
        setGeneralError(errorMessage);
        return;
      }

      if (data?.user) {
        // Sign up successful - navigate to onboarding
        router.replace('/(onboarding)/welcome');
      }
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
    handleSignUp();
  };

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
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSubtitle}>
            Join to streamline your cleaning business
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

          {/* Full Name Input */}
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            autoCapitalize="words"
            error={fullNameError}
            autoFocus={true}
            returnKeyType="next"
            onSubmitEditing={() => emailInputRef.current?.focus()}
            blurOnSubmit={false}
            editable={!isLoading}
            testID="signup-name-input"
          />

          {/* Email Input */}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            blurOnSubmit={false}
            editable={!isLoading}
            testID="signup-email-input"
            ref={emailInputRef}
          />

          {/* Password Input */}
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password"
            secureTextEntry={true}
            autoCapitalize="none"
            error={passwordError}
            returnKeyType="done"
            onSubmitEditing={handleSubmitEditing}
            editable={!isLoading}
            testID="signup-password-input"
            ref={passwordInputRef}
          />

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <View style={styles.passwordStrengthBar}>
                <View
                  style={[
                    styles.passwordStrengthFill,
                    {
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.passwordStrengthLabel,
                  { color: passwordStrength.color },
                ]}
              >
                {passwordStrength.label}
              </Text>
            </View>
          )}

          {/* SMS Consent Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setSmsConsent(!smsConsent)}
            disabled={isLoading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: smsConsent }}
            accessibilityLabel="Receive SMS notifications"
          >
            <View
              style={[
                styles.checkbox,
                smsConsent && styles.checkboxChecked,
              ]}
            >
              {smsConsent && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to receive SMS notifications about my cleaning jobs
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <Button
            title="Create Account"
            onPress={handleSignUp}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            style={styles.createAccountButton}
            testID="signup-create-button"
          />

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                accessibilityLabel="Sign in"
                accessibilityRole="link"
                disabled={isLoading}
              >
                <Text style={styles.signInLink}>Sign In</Text>
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
  passwordStrengthContainer: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  passwordStrengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.rausch,
    borderColor: colors.rausch,
  },
  checkmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.hof,
    lineHeight: 20,
  },
  createAccountButton: {
    marginBottom: spacing.xl,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signInText: {
    fontSize: 14,
    color: colors.foggy,
  },
  signInLink: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
});
