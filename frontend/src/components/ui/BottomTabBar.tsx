/**
 * [C07] BottomTabBar — Barra de navegación inferior de BargAIn.
 *
 * Diseño iOS HIG nativo:
 *   - Icono + label siempre visibles (Apple HIG §Tab Bars).
 *   - Tab activo: icono + label con color primario.
 *   - Tab inactivo: gris neutro, icon + label visibles.
 *   - Safe area respetada con react-native-safe-area-context.
 *   - Animación sutil: escala del icono activo con spring physics.
 *   - Fondo translúcido con blur (iOS) / sólido (Android).
 */

import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colors,
  spacing,
  sizes,
} from "@/theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TabDefinition {
  key: string;
  route: string;
  label: string;
  icon: React.ReactNode;
  iconActive?: React.ReactNode;
  badgeCount?: number;
  accessibilityLabel?: string;
}

export interface BottomTabBarProps {
  tabs: TabDefinition[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ICON_SPRING = {
  damping: 14,
  stiffness: 320,
  mass: 0.7,
};

// ─── Tab individual ───────────────────────────────────────────────────────────

interface TabItemProps {
  tab: TabDefinition;
  isActive: boolean;
  onPress: (event: GestureResponderEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.08 : 1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.08 : 1, ICON_SPRING);
  }, [isActive, scale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelColor = isActive ? colors.primary : colors.textMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={tab.accessibilityLabel ?? tab.label}
      accessibilityState={{ selected: isActive }}
    >
      {/* Icono con badge */}
      <View style={styles.iconWrapper}>
        <Animated.View style={iconAnimatedStyle}>
          {isActive && tab.iconActive ? tab.iconActive : tab.icon}
        </Animated.View>

        {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
          <View
            style={styles.badge}
            accessibilityLabel={`${tab.badgeCount} notificaciones`}
          >
            <Text style={styles.badgeText}>
              {tab.badgeCount > 99 ? "99+" : String(tab.badgeCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Label — siempre visible (iOS HIG) */}
      <Text
        style={[styles.label, { color: labelColor }]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.xs) },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Navegación principal"
    >
      <View style={styles.tabRow}>
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={index === activeIndex}
            onPress={() => onTabPress(index)}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === "ios" ? "rgba(252, 248, 240, 0.94)" : colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    // Sombra sutil hacia arriba (iOS)
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -0.5 },
        shadowOpacity: 0.1,
        shadowRadius: 0,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabRow: {
    flexDirection: "row",
    height: sizes.tabBarHeight,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    gap: 2,
    minHeight: 44,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
});

export default BottomTabBar;
