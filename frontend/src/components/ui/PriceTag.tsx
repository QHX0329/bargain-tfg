/**
 * [C04] PriceTag — Visualización de precio con soporte de oferta.
 *
 * Siempre usa Fira Code (monoespaciado) para los valores monetarios.
 * Cuando existe `previousPrice`, lo muestra tachado y pequeño encima.
 * El badge de descuento (`discountPercent`) es opcional.
 *
 * Tamaños:
 *   xs  — precios secundarios en listas densas
 *   sm  — precio en ProductCard horizontal
 *   md  — precio en ProductCard vertical (default)
 *   lg  — precio protagonista en pantalla de detalle
 *   xl  — precio hero en resultados de optimización
 *
 * @example
 * <PriceTag currentPrice={1.29} previousPrice={1.59} discountPercent={19} />
 * <PriceTag currentPrice={4.99} size="lg" />
 */

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies, spacing } from "@/theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PriceTagSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface PriceTagProps {
  /** Precio actual en euros */
  currentPrice: number;
  /** Precio anterior (opcional) — se muestra tachado */
  previousPrice?: number;
  /** Porcentaje de descuento — si no se pasa se calcula automáticamente */
  discountPercent?: number;
  /** Ocultar el badge de descuento aunque exista oferta */
  hideBadge?: boolean;
  /** Tamaño de la tipografía */
  size?: PriceTagSize;
  /** Estilo adicional del contenedor */
  style?: StyleProp<ViewStyle>;
}

// ─── Configuración de tamaños ─────────────────────────────────────────────────

interface SizeConfig {
  currentFontSize: number;
  previousFontSize: number;
  badgeFontSize: number;
  badgePaddingH: number;
  badgePaddingV: number;
  badgeBorderRadius: number;
  gap: number;
  currencySize: number;
}

const sizeConfig: Record<PriceTagSize, SizeConfig> = {
  xs: {
    currentFontSize: 13,
    previousFontSize: 11,
    badgeFontSize: 9,
    badgePaddingH: 4,
    badgePaddingV: 1,
    badgeBorderRadius: 3,
    gap: 2,
    currencySize: 10,
  },
  sm: {
    currentFontSize: 16,
    previousFontSize: 12,
    badgeFontSize: 10,
    badgePaddingH: 5,
    badgePaddingV: 2,
    badgeBorderRadius: 4,
    gap: 3,
    currencySize: 11,
  },
  md: {
    currentFontSize: 20,
    previousFontSize: 13,
    badgeFontSize: 11,
    badgePaddingH: 6,
    badgePaddingV: 2,
    badgeBorderRadius: spacing.xs,
    gap: 4,
    currencySize: 13,
  },
  lg: {
    currentFontSize: 28,
    previousFontSize: 15,
    badgeFontSize: 12,
    badgePaddingH: 8,
    badgePaddingV: 3,
    badgeBorderRadius: 6,
    gap: 5,
    currencySize: 16,
  },
  xl: {
    currentFontSize: 38,
    previousFontSize: 18,
    badgeFontSize: 13,
    badgePaddingH: 10,
    badgePaddingV: 4,
    badgeBorderRadius: 8,
    gap: 6,
    currencySize: 20,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (value: number): string =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const calcDiscount = (current: number, previous: number): number =>
  Math.round(((previous - current) / previous) * 100);

// ─── Componente ───────────────────────────────────────────────────────────────

export const PriceTag: React.FC<PriceTagProps> = ({
  currentPrice,
  previousPrice,
  discountPercent,
  hideBadge = false,
  size = "md",
  style,
}) => {
  const cfg = sizeConfig[size];
  const hasOffer = previousPrice !== undefined && previousPrice > currentPrice;

  const discount =
    discountPercent ??
    (hasOffer ? calcDiscount(currentPrice, previousPrice!) : undefined);

  const showBadge =
    !hideBadge && hasOffer && discount !== undefined && discount > 0;

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={`Precio: ${formatPrice(currentPrice)} euros`}
    >
      {/* Precio anterior + badge — fila superior */}
      {(hasOffer || showBadge) && (
        <View style={[styles.topRow, { gap: cfg.gap }]}>
          {hasOffer && (
            <Text
              style={[
                styles.previousPrice,
                {
                  fontFamily: fontFamilies.mono,
                  fontSize: cfg.previousFontSize,
                  lineHeight: cfg.previousFontSize * 1.4,
                },
              ]}
              accessibilityLabel={`Precio anterior: ${formatPrice(previousPrice!)} euros`}
            >
              {formatPrice(previousPrice!)} €
            </Text>
          )}

          {showBadge && (
            <View
              style={[
                styles.badge,
                {
                  paddingHorizontal: cfg.badgePaddingH,
                  paddingVertical: cfg.badgePaddingV,
                  borderRadius: cfg.badgeBorderRadius,
                },
              ]}
              accessibilityLabel={`${discount}% de descuento`}
            >
              <Text style={[styles.badgeText, { fontSize: cfg.badgeFontSize }]}>
                -{discount}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Precio actual — protagonista */}
      <View style={styles.currentRow}>
        {/* Símbolo de euro como superíndice */}
        <Text
          style={[
            styles.currency,
            {
              fontFamily: fontFamilies.mono,
              fontSize: cfg.currencySize,
              lineHeight: cfg.currentFontSize * 1.1,
              color: hasOffer ? colors.primary : colors.text,
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
          €
        </Text>
        <Text
          style={[
            styles.currentPrice,
            {
              fontFamily: fontFamilies.monoMedium,
              fontSize: cfg.currentFontSize,
              lineHeight: cfg.currentFontSize * 1.1,
              color: hasOffer ? colors.primary : colors.text,
            },
          ]}
        >
          {formatPrice(currentPrice)}
        </Text>
      </View>
    </View>
  );
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  previousPrice: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  badge: {
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.accentDark,
    letterSpacing: 0,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  currency: {
    marginRight: 1,
    paddingBottom: 2,
  },
  currentPrice: {
    letterSpacing: -0.5,
  },
});

export default PriceTag;
