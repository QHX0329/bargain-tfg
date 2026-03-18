/**
 * SkeletonBox — placeholder animado de carga.
 *
 * Muestra un rectángulo que pulsa en opacidad (1.0 → 0.3 → 1.0) usando
 * Reanimated withRepeat para indicar que el contenido está cargando.
 *
 * Uso:
 *   <SkeletonBox width={200} height={20} />
 *   <SkeletonBox width="100%" height={16} borderRadius={4} />
 */

import React, { useEffect } from "react";
import type { ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/theme/colors";

export interface SkeletonBoxProps {
  /** Ancho del skeleton — número de píxeles o porcentaje como string */
  width: number | string;
  /** Alto del skeleton en píxeles */
  height: number;
  /** Radio del borde (por defecto 8) */
  borderRadius?: number;
  /** Estilos adicionales */
  style?: ViewStyle;
  /** testID para tests */
  testID?: string;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
  testID,
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse (ping-pong: 1 → 0.3 → 1)
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        style,
        animatedStyle,
      ]}
    />
  );
};
