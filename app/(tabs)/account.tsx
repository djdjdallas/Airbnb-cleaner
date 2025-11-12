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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getProfile } from '@/services/profile.service';
import { AuthService } from '@/services/auth.service';
import type { Profile } from '@/types';

interface SettingItem {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
}

export default function AccountScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: user } = await AuthService.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: serviceError } = await getProfile(userId);

      if (serviceError) {
        Alert.alert('Error', serviceError.message);
        return;
      }

      setProfile(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  // Get initials for avatar
  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format subscription status
  const formatSubscriptionStatus = (status: Profile['subscription_status']): string => {
    if (!status) return 'Free';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Navigation and action handlers
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleManageSubscription = () => {
    router.push('/subscription/manage');
  };

  const handleNotificationPreferences = () => {
    router.push('/settings/notifications');
  };

  const handleSmsSettings = () => {
    router.push('/settings/sms');
  };

  const handleHelpSupport = async () => {
    const supportUrl = 'https://cleanerscheduler.com/support';
    const canOpen = await Linking.canOpenURL(supportUrl);
    if (canOpen) {
      await Linking.openURL(supportUrl);
    } else {
      Alert.alert('Error', 'Unable to open support page');
    }
  };

  const handlePrivacyPolicy = async () => {
    const privacyUrl = 'https://cleanerscheduler.com/privacy';
    const canOpen = await Linking.canOpenURL(privacyUrl);
    if (canOpen) {
      await Linking.openURL(privacyUrl);
    } else {
      Alert.alert('Error', 'Unable to open privacy policy');
    }
  };

  const handleTermsOfService = async () => {
    const termsUrl = 'https://cleanerscheduler.com/terms';
    const canOpen = await Linking.canOpenURL(termsUrl);
    if (canOpen) {
      await Linking.openURL(termsUrl);
    } else {
      Alert.alert('Error', 'Unable to open terms of service');
    }
  };

  const handleSignOutPress = () => {
    setShowSignOutDialog(true);
  };

  const handleSignOutConfirm = async () => {
    setShowSignOutDialog(false);
    const { error } = await AuthService.signOut();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Navigation to sign in will be handled by auth state change
    router.replace('/auth/sign-in');
  };

  const handleSignOutCancel = () => {
    setShowSignOutDialog(false);
  };

  // Settings sections
  const settingsSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notification Preferences',
          onPress: handleNotificationPreferences,
          showChevron: true,
        },
        {
          icon: 'chatbubble-ellipses-outline',
          label: 'SMS Settings',
          onPress: handleSmsSettings,
          showChevron: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          onPress: handleHelpSupport,
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy Policy',
          onPress: handlePrivacyPolicy,
          showChevron: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: handleTermsOfService,
          showChevron: true,
        },
      ],
    },
  ];

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner testID="account-loading" />
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
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(profile?.full_name || null)}
              </Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name || 'No name set'}
            </Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            {profile?.phone && (
              <Text style={styles.profilePhone}>{profile.phone}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleEditProfile}
            style={styles.editButton}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.card}>
            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionLabel}>Current Plan</Text>
                <Text style={styles.subscriptionValue}>
                  {formatSubscriptionStatus(profile?.subscription_status)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleManageSubscription}
                style={styles.manageButton}
                accessibilityLabel="Manage subscription"
                accessibilityRole="button"
              >
                <Text style={styles.manageButtonText}>Manage</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.rausch}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <TouchableOpacity
                    onPress={item.onPress}
                    style={styles.settingItem}
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={colors.foggy}
                      />
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.value && (
                        <Text style={styles.settingValue}>{item.value}</Text>
                      )}
                      {item.showChevron && (
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.foggy}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            onPress={handleSignOutPress}
            style={styles.signOutButton}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        visible={showSignOutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleSignOutConfirm}
        onCancel={handleSignOutCancel}
        destructive={true}
        testID="sign-out-dialog"
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.hof,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.rausch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.hof,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.xxs,
  },
  profilePhone: {
    fontSize: 14,
    color: colors.foggy,
  },
  editButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.rausch,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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
  subscriptionContent: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.xxs,
  },
  subscriptionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.rausch,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.hof,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontSize: 14,
    color: colors.foggy,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 22 + spacing.md,
  },
  signOutContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  versionContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.foggy,
  },
});
