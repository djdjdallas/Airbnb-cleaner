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
 * Login Screen
 * Allows users to sign in with email and password
 * Features:
 * - Email and password validation
 * - Loading states
 * - Error handling
 * - Airbnb-style hero section
 * - Links to signup and password reset
 */
export default function LoginScreen() {
  const router = useRouter();
  const passwordInputRef = useRef<RNTextInput>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Clear errors when user types
  useEffect(() => {
    if (emailError) setEmailError('');
    if (generalError) setGeneralError('');
  }, [email]);

  useEffect(() => {
    if (passwordError) setPasswordError('');
    if (generalError) setGeneralError('');
  }, [password]);

  /**
   * Validates form inputs
   * @returns True if form is valid
   */
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  /**
   * Handles sign in submission
   */
  const handleSignIn = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Attempt sign in
      const { data, error } = await AuthService.signIn(email.trim(), password);

      if (error) {
        const errorMessage = showErrorToast(error);
        setGeneralError(errorMessage);
        return;
      }

      if (data?.user) {
        // Sign in successful - navigate to main app
        router.replace('/(tabs)/properties');
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
    handleSignIn();
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
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>
            Sign in to manage your cleaning schedule
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
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            blurOnSubmit={false}
            editable={!isLoading}
            testID="login-email-input"
          />

          {/* Password Input */}
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={true}
            autoCapitalize="none"
            error={passwordError}
            returnKeyType="done"
            onSubmitEditing={handleSubmitEditing}
            editable={!isLoading}
            testID="login-password-input"
            ref={passwordInputRef}
          />

          {/* Forgot Password Link */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              accessibilityLabel="Forgot password"
              accessibilityRole="link"
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Sign In Button */}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            style={styles.signInButton}
            testID="login-signin-button"
          />

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity
                accessibilityLabel="Sign up"
                accessibilityRole="link"
                disabled={isLoading}
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    color: colors.rausch,
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    marginBottom: spacing.xl,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signUpText: {
    fontSize: 14,
    color: colors.foggy,
  },
  signUpLink: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
});
