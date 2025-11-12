import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Cleaner } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export interface CleanerCardProps {
  cleaner: Cleaner;
  onPress?: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
  testID?: string;
}

export const CleanerCard: React.FC<CleanerCardProps> = ({
  cleaner,
  onPress,
  onEdit,
  onDeactivate,
  testID,
}) => {
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatRate = (rate: number | null): string => {
    if (rate === null) return 'Rate not set';
    return `$${rate.toFixed(2)}/hr`;
  };

  return (
    <Card onPress={onPress} testID={testID}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(cleaner.name)}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {cleaner.name}
            </Text>
            <StatusBadge
              status={cleaner.active ? 'active' : 'inactive'}
              size="small"
            />
          </View>

          <Text style={styles.phone}>{formatPhone(cleaner.phone)}</Text>
          <Text style={styles.rate}>{formatRate(cleaner.hourly_rate)}</Text>

          {(onEdit || onDeactivate) && (
            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity
                  onPress={onEdit}
                  style={styles.actionButton}
                  accessibilityLabel="Edit cleaner"
                  accessibilityRole="button"
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
              )}
              {onDeactivate && (
                <TouchableOpacity
                  onPress={onDeactivate}
                  style={styles.actionButton}
                  accessibilityLabel={
                    cleaner.active ? 'Deactivate cleaner' : 'Activate cleaner'
                  }
                  accessibilityRole="button"
                >
                  <Text style={[styles.actionText, styles.deactivateText]}>
                    {cleaner.active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.babu,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  initials: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    flex: 1,
  },
  phone: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.xs,
  },
  rate: {
    fontSize: 14,
    color: colors.hof,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
  deactivateText: {
    color: colors.error,
  },
});
