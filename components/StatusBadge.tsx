import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export type StatusType =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'active'
  | 'inactive';

export type BadgeSize = 'small' | 'medium';

export interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  style?: ViewStyle;
  testID?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  style,
  testID,
}) => {
  const getStatusColor = (): string => {
    switch (status) {
      case 'pending':
        return colors.pending;
      case 'confirmed':
        return colors.confirmed;
      case 'completed':
        return colors.completed;
      case 'cancelled':
        return colors.cancelled;
      case 'active':
        return colors.babu;
      case 'inactive':
        return colors.foggy;
      default:
        return colors.foggy;
    }
  };

  const getStatusLabel = (): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const badgeColor = getStatusColor();

  return (
    <View
      style={[
        styles.badge,
        size === 'small' && styles.badgeSmall,
        { backgroundColor: `${badgeColor}20` },
        style,
      ]}
      accessibilityLabel={`Status: ${getStatusLabel()}`}
      accessibilityRole="text"
      testID={testID}
    >
      <Text
        style={[
          styles.text,
          size === 'small' && styles.textSmall,
          { color: badgeColor },
        ]}
      >
        {getStatusLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  textSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
});
