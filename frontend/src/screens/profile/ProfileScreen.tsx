/**
 * Pantalla de perfil de usuario.
 */

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, textStyles } from "@/theme";
import { useAuthStore } from "@/store/authStore";

export const ProfileScreen: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const { height } = useWindowDimensions();
  const isCompact = height <= 650;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.avatarContainer,
            isCompact && styles.avatarContainerCompact,
          ]}
        >
          <View style={[styles.avatar, isCompact && styles.avatarCompact]}>
            <Ionicons
              name="person"
              size={isCompact ? 28 : 36}
              color={colors.primary}
            />
          </View>
          <Text style={styles.userName}>Usuario</Text>
          <Text style={styles.userEmail}>usuario@ejemplo.com</Text>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={[styles.menuItem, isCompact && styles.menuItemCompact]}
          >
            <Ionicons
              name="settings-outline"
              size={isCompact ? 18 : 20}
              color={colors.text}
              style={styles.menuIcon}
            />
            <Text
              style={[styles.menuText, isCompact && styles.menuTextCompact]}
              numberOfLines={isCompact ? 1 : undefined}
              ellipsizeMode="tail"
            >
              Configuración
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isCompact && styles.menuItemCompact]}
          >
            <Ionicons
              name="options-outline"
              size={isCompact ? 18 : 20}
              color={colors.text}
              style={styles.menuIcon}
            />
            <Text
              style={[styles.menuText, isCompact && styles.menuTextCompact]}
              numberOfLines={isCompact ? 1 : undefined}
              ellipsizeMode="tail"
            >
              Preferencias de optimización
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isCompact && styles.menuItemCompact]}
          >
            <Ionicons
              name="stats-chart-outline"
              size={isCompact ? 18 : 20}
              color={colors.text}
              style={styles.menuIcon}
            />
            <Text
              style={[styles.menuText, isCompact && styles.menuTextCompact]}
              numberOfLines={isCompact ? 1 : undefined}
              ellipsizeMode="tail"
            >
              Historial de ahorro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, isCompact && styles.menuItemCompact]}
          >
            <Ionicons
              name="help-circle-outline"
              size={isCompact ? 18 : 20}
              color={colors.text}
              style={styles.menuIcon}
            />
            <Text
              style={[styles.menuText, isCompact && styles.menuTextCompact]}
              numberOfLines={isCompact ? 1 : undefined}
              ellipsizeMode="tail"
            >
              Ayuda
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isCompact && styles.logoutButtonCompact]}
          onPress={logout}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...textStyles.heading2,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  avatarContainerCompact: {
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarCompact: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: spacing.sm,
  },
  userName: {
    ...textStyles.heading3,
    color: colors.text,
  },
  userEmail: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  menuSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    minHeight: 44,
  },
  menuItemCompact: {
    paddingVertical: spacing.md,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuText: {
    ...textStyles.body,
    color: colors.text,
  },
  menuTextCompact: {
    ...textStyles.bodySmall,
  },
  logoutButton: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    minHeight: 44,
    justifyContent: "center",
  },
  logoutButtonCompact: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...textStyles.button,
    color: colors.error,
  },
});
