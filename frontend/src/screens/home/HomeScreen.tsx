/**
 * Pantalla principal (Home / Dashboard).
 *
 * Muestra un resumen del estado del usuario:
 * listas activas, ahorro acumulado, tiendas cercanas.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

export const HomeScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>¡Hola! 👋</Text>
        <Text style={styles.title}>BargAIn</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Listas activas</Text>
          <Text style={styles.cardValue}>0</Text>
          <Text style={styles.cardSubtitle}>Crea tu primera lista</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Ahorro estimado</Text>
          <Text style={styles.cardValue}>0,00 €</Text>
          <Text style={styles.cardSubtitle}>Optimiza tu compra para ahorrar</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Tiendas cercanas</Text>
          <Text style={styles.cardValue}>—</Text>
          <Text style={styles.cardSubtitle}>Activa la ubicación para ver tiendas</Text>
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    ...typography.styles.body,
    color: colors.light.textSecondary,
  },
  title: {
    ...typography.styles.h1,
    color: colors.primary[700],
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    ...typography.styles.label,
    color: colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  cardValue: {
    ...typography.styles.h2,
    color: colors.light.text,
  },
  cardSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.light.textTertiary,
    marginTop: spacing.xs,
  },
});
