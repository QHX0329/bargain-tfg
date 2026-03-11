/**
 * Pantalla de listas de la compra.
 *
 * Muestra todas las listas del usuario con opción de crear nuevas.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '@/theme';
import type { ListsStackParamList } from '@/navigation/types';

type ListsScreenNavigationProp = NativeStackNavigationProp<ListsStackParamList, 'Lists'>;

export const ListsScreen: React.FC = () => {
  const navigation = useNavigation<ListsScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Listas</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Sin listas todavía</Text>
        <Text style={styles.emptySubtitle}>
          Crea tu primera lista de la compra{'\n'}y empieza a ahorrar
        </Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>Crear lista</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.styles.h2,
    color: colors.light.text,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: {
    ...typography.styles.button,
    color: colors.white,
    fontSize: 13,
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
    marginBottom: spacing['2xl'],
  },
  createButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  createButtonText: {
    ...typography.styles.button,
    color: colors.white,
  },
});
