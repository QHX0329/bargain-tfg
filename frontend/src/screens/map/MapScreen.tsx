/**
 * Pantalla del mapa de tiendas.
 *
 * Placeholder que mostrará el mapa con tiendas cercanas
 * usando React Native Maps + Google Maps API.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

export const MapScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderTitle}>Mapa de tiendas</Text>
        <Text style={styles.placeholderSubtitle}>
          Aquí se mostrarán los supermercados{'\n'}y comercios cercanos a tu ubicación
        </Text>
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
  title: {
    ...typography.styles.h2,
    color: colors.light.text,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceVariant,
    margin: spacing.xl,
    borderRadius: 16,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  placeholderTitle: {
    ...typography.styles.h3,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  placeholderSubtitle: {
    ...typography.styles.body,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
});
