/**
 * Pantalla de detalle de lista de la compra.
 *
 * Muestra los productos de una lista con sus precios.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '@/theme';
import type { ListsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;

export const ListDetailScreen: React.FC<Props> = ({ route }) => {
  const { listName } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{listName}</Text>
        <Text style={styles.subtitle}>0 productos</Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Lista vacía</Text>
        <Text style={styles.emptySubtitle}>
          Añade productos para empezar a comparar precios
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  title: {
    ...typography.styles.h2,
    color: colors.light.text,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.styles.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.styles.body,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
});
