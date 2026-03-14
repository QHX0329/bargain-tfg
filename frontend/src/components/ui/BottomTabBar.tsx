/**
 * [C07] BottomTabBar — Barra de navegación inferior de BargAIn.
 *
 * Tabs: Home | Buscar | Lista | Ruta | Perfil
 *
 * Diseño "Mercado Mediterráneo Digital":
 *   - Superficie crema cerámica (colors.surface) con borde superior naranja
 *     ultra-fino cuando hay un tab activo.
 *   - Tab activo: icono + label naranja Triana con indicador pill animado.
 *   - Tab inactivo: gris tierra, sin label.
 *   - Safe area respetada con react-native-safe-area-context.
 *   - Animación Reanimated 2: indicador deslizante y escala del icono activo.
 *
 * Uso con Expo Router (file-based routing):
 *   Pasar las props directamente desde el TabLayout de Expo Router.
 *
 * @example — standalone (para preview / Storybook)
 * <BottomTabBar
 *   tabs={TAB_DEFINITIONS}
 *   activeIndex={0}
 *   onTabPress={(index) => router.replace(tabs[index].route)}
 * />
 */

import React, { useEffect } from "react";
import {
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
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  colors,
  textStyles,
  spacing,
  borderRadius,
  sizes,
  shadows,
} from "@/theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TabDefinition {
  /** Identificador único del tab */
  key: string;
  /** Ruta para Expo Router (e.g. '/(tabs)/home') */
  route: string;
  /** Etiqueta visible cuando el tab está activo */
  label: string;
  /** Icono en estado normal (componente React, e.g. Ionicons) */
  icon: React.ReactNode;
  /** Icono en estado activo — si no se provee, usa `icon` */
  iconActive?: React.ReactNode;
  /** Número de notificaciones pendientes (0 = sin badge) */
  badgeCount?: number;
  /** accessibilityLabel personalizado */
  accessibilityLabel?: string;
}

export interface BottomTabBarProps {
  /** Definición de los tabs */
  tabs: TabDefinition[];
  /** Índice del tab actualmente seleccionado */
  activeIndex: number;
  /** Callback al presionar un tab */
  onTabPress: (index: number) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const INDICATOR_WIDTH = 32;
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 260,
  mass: 0.9,
};
const ICON_SPRING = {
  damping: 12,
  stiffness: 300,
  mass: 0.6,
};

// ─── Componente de tab individual ─────────────────────────────────────────────

interface TabItemProps {
  tab: TabDefinition;
  isActive: boolean;
  onPress: (event: GestureResponderEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.1 : 1);
  const labelOpacity = useSharedValue(isActive ? 1 : 0);
  const labelTranslateY = useSharedValue(isActive ? 0 : 4);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.12 : 1, ICON_SPRING);
    labelOpacity.value = withSpring(isActive ? 1 : 0, SPRING_CONFIG);
    labelTranslateY.value = withSpring(isActive ? 0 : 4, SPRING_CONFIG);
  }, [isActive, scale, labelOpacity, labelTranslateY]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  const iconColor = isActive ? colors.primary : colors.textMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.75}
      accessibilityRole="tab"
      accessibilityLabel={tab.accessibilityLabel ?? tab.label}
      accessibilityState={{ selected: isActive }}
    >
      {/* Badge de notificación */}
      <View style={styles.iconWrapper}>
        <Animated.View style={iconAnimatedStyle}>
          {/* Clona el icono inyectando el color correcto si es string */}
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

      {/* Label animado — solo visible en tab activo */}
      <Animated.Text
        style={[
          textStyles.labelSmall,
          styles.label,
          { color: iconColor },
          labelAnimatedStyle,
        ]}
        numberOfLines={1}
        accessible={false}
        importantForAccessibility="no"
      >
        {tab.label}
      </Animated.Text>
    </TouchableOpacity>
  );
};

// ─── Indicador deslizante ────────────────────────────────────────────────────

interface SlidingIndicatorProps {
  activeIndex: number;
  tabCount: number;
}

const SlidingIndicator: React.FC<SlidingIndicatorProps> = ({
  activeIndex,
  tabCount,
}) => {
  const tabWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const tabW = tabWidth.value;
    const target = activeIndex * tabW + tabW / 2 - INDICATOR_WIDTH / 2;
    translateX.value = withSpring(target, SPRING_CONFIG);

    return {
      transform: [{ translateX: translateX.value }],
      opacity: interpolate(tabW, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View
      style={[styles.indicatorTrack, styles.pointerNone]}
      onLayout={(e) => {
        tabWidth.value = e.nativeEvent.layout.width / tabCount;
      }}
    >
      <Animated.View style={[styles.indicator, animatedStyle]} />
    </View>
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
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        shadows.tabBar,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Navegación principal"
    >
      {/* Línea decorativa superior con color activo */}
      <View style={styles.topAccent} />

      {/* Indicador deslizante */}
      <SlidingIndicator activeIndex={activeIndex} tabCount={tabs.length} />

      {/* Tabs */}
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
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  topAccent: {
    height: 2,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.xl,
    borderBottomLeftRadius: borderRadius.pill,
    borderBottomRightRadius: borderRadius.pill,
    opacity: 0.15,
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
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    textAlign: "center",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: sizes.notificationDot + 8,
    height: sizes.notificationDot + 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.error,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    ...textStyles.labelSmall,
    color: colors.white,
    fontSize: 9,
    lineHeight: 11,
  },
  indicatorTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: "row",
  },
  pointerNone: {
    pointerEvents: "none",
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: INDICATOR_WIDTH,
    height: 3,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: borderRadius.pill,
    borderBottomRightRadius: borderRadius.pill,
  },
});

export default BottomTabBar;
