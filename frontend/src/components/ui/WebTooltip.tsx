/**
 * [C-14] WebTooltip — Tooltip de hover solo-web (D-06).
 *
 * En web envuelve a sus hijos y muestra una etiqueta flotante tras 400ms de
 * hover (onMouseEnter). En plataformas nativas es un passthrough transparente:
 * devuelve los hijos sin envoltorio ni etiqueta.
 *
 * Las props onMouseEnter/onMouseLeave no existen en ViewProps de RN (solo
 * react-native-web las soporta) — se silencian con @ts-ignore (13-RESEARCH Pitfall 1).
 */

import React, { useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { borderRadius, colors, spacing, textStyles } from "@/theme";

export interface WebTooltipProps {
  label: string;
  children: React.ReactNode;
}

export const WebTooltip: React.FC<WebTooltipProps> = ({ label, children }) => {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  const handleEnter = () => {
    timer.current = setTimeout(() => setVisible(true), 400);
  };

  const handleLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  return (
    <View
      style={styles.wrapper}
      // @ts-ignore — onMouseEnter/onMouseLeave son props solo-web (react-native-web)
      onMouseEnter={handleEnter}
      // @ts-ignore — ver arriba
      onMouseLeave={handleLeave}
    >
      {children}
      {visible && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    alignSelf: "center",
    backgroundColor: colors.info,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tooltipText: {
    ...textStyles.caption,
    color: colors.white,
  },
});

export default WebTooltip;
