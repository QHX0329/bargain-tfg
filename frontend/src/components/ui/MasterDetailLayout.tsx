/**
 * [C-13] MasterDetailLayout — Layout maestro-detalle responsivo (D-05).
 *
 * En desktop (breakpoint 'desktop') renderiza un split-pane: panel maestro de
 * ancho fijo + divisor + panel detalle flexible. En mobile/tablet renderiza
 * únicamente el panel maestro a ancho completo (patrón de pila nativo).
 *
 * Consumido por las pantallas de Wave 1 que adoptan el patrón maestro-detalle
 * en web (listas, mapa/tiendas, catálogo).
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import type { Breakpoint } from "@/hooks/useBreakpoint";

export interface MasterDetailLayoutProps {
  masterPane: React.ReactNode;
  detailPane: React.ReactNode | null;
  breakpoint: Breakpoint;
}

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  masterPane,
  detailPane,
  breakpoint,
}) => {
  if (breakpoint !== "desktop") {
    return <View style={styles.fullWidth}>{masterPane}</View>;
  }

  return (
    <View style={styles.row}>
      <View style={styles.master}>{masterPane}</View>
      <View style={styles.divider} />
      <View style={styles.detail}>{detailPane}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  master: {
    // 360px: ancho fijo del panel maestro (valor vinculante de 13-UI-SPEC)
    width: 360,
    backgroundColor: colors.surface,
  },
  divider: {
    // 1px: divisor entre paneles (valor vinculante de 13-UI-SPEC)
    width: 1,
    backgroundColor: colors.border,
  },
  detail: {
    flex: 1,
    marginLeft: spacing.xl,
  },
});

export default MasterDetailLayout;
