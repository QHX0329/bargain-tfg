/**
 * [C01] BargainButton — Botón principal del design system de BargAIn.
 *
 * Variantes:
 *   primary  — Naranja Triana. CTA principal de la pantalla.
 *   secondary — Verde Oliva. Acciones de confirmación / éxito.
 *   ghost    — Fondo transparente, borde naranja. Acción secundaria.
 *   danger   — Rojo Alerta. Acciones destructivas (eliminar, cancelar).
 *
 * Tamaños: sm | md (default) | lg
 *
 * Características:
 *   - Reanimated 2: feedback de escala al presionar (scale spring).
 *   - Estado loading con indicador de actividad.
 *   - Estado disabled con opacidad reducida.
 *   - Icono izquierdo o derecho opcional.
 *   - Soporte accesibilidad completo.
 */

import React, { useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  colors,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  sizes,
} from "@/theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface BargainButtonProps {
  /** Texto del botón */
  label: string;
  /** Acción al presionar */
  onPress: () => void;
  /** Variante visual */
  variant?: ButtonVariant;
  /** Tamaño del botón */
  size?: ButtonSize;
  /** Muestra spinner y deshabilita interacción */
  loading?: boolean;
  /** Deshabilita el botón */
  disabled?: boolean;
  /** Icono a la izquierda del texto (componente React) */
  iconLeft?: React.ReactNode;
  /** Icono a la derecha del texto (componente React) */
  iconRight?: React.ReactNode;
  /** Ocupa el ancho completo del contenedor */
  fullWidth?: boolean;
  /** Estilos adicionales para el contenedor */
  style?: StyleProp<ViewStyle>;
  /** accessibilityHint para screen readers */
  accessibilityHint?: string;
  /** testID para pruebas automatizadas */
  testID?: string;
}

// ─── Configuración de variantes ───────────────────────────────────────────────

interface VariantConfig {
  background: string;
  backgroundPressed: string;
  backgroundDisabled: string;
  text: string;
  textDisabled: string;
  borderColor: string | undefined;
  borderWidth: number;
  shadow: object;
}

const variantMap: Record<ButtonVariant, VariantConfig> = {
  primary: {
    background: colors.primary,
    backgroundPressed: colors.primaryDark,
    backgroundDisabled: colors.primaryLight,
    text: colors.white,
    textDisabled: "rgba(255,255,255,0.6)",
    borderColor: undefined,
    borderWidth: 0,
    shadow: shadows.button,
  },
  secondary: {
    background: colors.secondary,
    backgroundPressed: colors.secondaryDark,
    backgroundDisabled: colors.secondaryLight,
    text: colors.white,
    textDisabled: "rgba(255,255,255,0.6)",
    borderColor: undefined,
    borderWidth: 0,
    shadow: shadows.card,
  },
  ghost: {
    background: colors.transparent,
    backgroundPressed: colors.primaryTint,
    backgroundDisabled: colors.transparent,
    text: colors.primary,
    textDisabled: colors.textDisabled,
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadow: shadows.none,
  },
  danger: {
    background: colors.error,
    backgroundPressed: "#8B1A1A",
    backgroundDisabled: "#E07070",
    text: colors.white,
    textDisabled: "rgba(255,255,255,0.6)",
    borderColor: undefined,
    borderWidth: 0,
    shadow: shadows.card,
  },
};

// ─── Configuración de tamaños ─────────────────────────────────────────────────

interface SizeConfig {
  height: number;
  paddingHorizontal: number;
  textStyle: object;
  iconSize: number;
  iconGap: number;
  spinnerSize: "small" | "large";
}

const sizeMap: Record<ButtonSize, SizeConfig> = {
  sm: {
    height: sizes.buttonHeight.sm,
    paddingHorizontal: spacing.md,
    textStyle: textStyles.buttonSmall,
    iconSize: 16,
    iconGap: spacing.xs,
    spinnerSize: "small",
  },
  md: {
    height: sizes.buttonHeight.md,
    paddingHorizontal: spacing.lg,
    textStyle: textStyles.button,
    iconSize: 20,
    iconGap: spacing.sm,
    spinnerSize: "small",
  },
  lg: {
    height: sizes.buttonHeight.lg,
    paddingHorizontal: spacing.xl,
    textStyle: { ...textStyles.button, fontSize: 17 },
    iconSize: 22,
    iconGap: spacing.sm,
    spinnerSize: "small",
  },
};

// ─── Constantes de animación ──────────────────────────────────────────────────

const PRESS_SCALE = 0.96;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

// ─── Componente ───────────────────────────────────────────────────────────────

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const BargainButton: React.FC<BargainButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  style,
  accessibilityHint,
  testID,
}) => {
  const variantConfig = variantMap[variant];
  const sizeConfig = sizeMap[size];
  const isDisabled = disabled || loading;

  // ─── Animación de escala (Reanimated 2) ────────────────────────────────────
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!isDisabled) {
      scale.value = withSpring(PRESS_SCALE, SPRING_CONFIG);
    }
  }, [isDisabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(
    (_event: GestureResponderEvent) => {
      if (!isDisabled) {
        runOnJS(onPress)();
      }
    },
    [isDisabled, onPress],
  );

  // ─── Estilos dinámicos ─────────────────────────────────────────────────────
  const containerStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    backgroundColor: isDisabled
      ? variantConfig.backgroundDisabled
      : variantConfig.background,
    borderColor: variantConfig.borderColor,
    borderWidth: variantConfig.borderWidth,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    ...(isDisabled ? shadows.none : variantConfig.shadow),
  };

  const textColor = isDisabled
    ? variantConfig.textDisabled
    : variantConfig.text;
  const spinnerColor = variant === "ghost" ? colors.primary : colors.white;

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth]}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[styles.base, containerStyle, style]}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            size={sizeConfig.spinnerSize}
            color={spinnerColor}
            accessibilityLabel="Cargando"
          />
        ) : (
          <>
            {iconLeft && (
              <View style={{ marginRight: sizeConfig.iconGap }}>
                {iconLeft}
              </View>
            )}
            <Text
              style={[sizeConfig.textStyle, { color: textColor }]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {iconRight && (
              <View style={{ marginLeft: sizeConfig.iconGap }}>
                {iconRight}
              </View>
            )}
          </>
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
};

// ─── Estilos base (invariantes) ───────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
});

export default BargainButton;
