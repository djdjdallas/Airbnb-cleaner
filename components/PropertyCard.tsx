import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Property } from '../types';
import { colors, spacing } from '../constants/theme';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export interface PropertyCardProps {
  property: Property & {
    next_cleaning_date?: string | null;
  };
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  testID?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onEdit,
  onDelete,
  testID,
}) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not synced yet';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card onPress={onPress} testID={testID}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {property.name}
          </Text>
          <StatusBadge
            status={property.active ? 'active' : 'inactive'}
            size="small"
          />
        </View>
        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                style={styles.actionButton}
                accessibilityLabel="Edit property"
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={styles.actionButton}
                accessibilityLabel="Delete property"
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, styles.deleteText]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {property.address && (
        <Text style={styles.address} numberOfLines={2}>
          {property.address}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Next Cleaning:</Text>
          <Text style={styles.value}>
            {formatDate(property.next_cleaning_date)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Last Sync:</Text>
          <Text style={styles.value}>{formatDate(property.last_synced)}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.hof,
    flex: 1,
  },
  address: {
    fontSize: 14,
    color: colors.foggy,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  footer: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.foggy,
    fontWeight: '500',
  },
  value: {
    fontSize: 12,
    color: colors.hof,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: colors.rausch,
    fontWeight: '600',
  },
  deleteText: {
    color: colors.error,
  },
});
