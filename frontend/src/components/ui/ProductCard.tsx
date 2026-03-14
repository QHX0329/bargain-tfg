/**
 * [C02] ProductCard — Tarjeta de producto del design system de BargAIn.
 *
 * Dos variantes de layout:
 *
 *   vertical   — Imagen arriba, contenido debajo. Para cuadrículas (FlatList
 *                numColumns=2) y carruseles. Ancho fijo recomendado: 168px.
 *
 *   horizontal — Imagen a la izquierda, contenido a la derecha. Para listas
 *                de resultados de búsqueda, sugerencias y comparadores.
 *                Ocupa el ancho disponible.
 *
 * Anatomía:
 *   ┌────────────────────┐    ┌──────┬──────────────────────────┐
 *   │  [imagen]          │    │ img  │ Nombre del producto       │
 *   │  [badge cadena]    │    │      │ Marca · categoría         │
 *   ├────────────────────┤    │      │ [PriceTag]   [store chip] │
 *   │ Nombre             │    │      │ [SavingsBadge]            │
 *   │ Marca · categoría  │    └──────┴──────────────────────────┘
 *   │ [PriceTag]         │
 *   │ [store] [saving]   │
 *   └────────────────────┘
 *
 * Animación: spring de escala 0.97 al press-in/out (Reanimated 2).
 */

import React, { useCallback } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  colors,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  fontFamilies,
} from "@/theme";
import { PriceTag } from "./PriceTag";
import type { ProductPriceSummary, StoreChain } from "@/types/domain";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ProductCardVariant = "vertical" | "horizontal";

export interface ProductCardProps {
  /** Datos del producto con precios precargados */
  data: ProductPriceSummary;
  /** Layout del card */
  variant?: ProductCardVariant;
  /** Callback al tocar el card */
  onPress: (productId: string) => void;
  /** Callback del botón de guardar/favorito */
  onSave?: (productId: string) => void;
  /** Estado guardado */
  isSaved?: boolean;
  /** Estilo adicional del contenedor */
  style?: StyleProp<ViewStyle>;
}

// ─── Colores de cadenas ───────────────────────────────────────────────────────

const CHAIN_COLORS: Record<StoreChain, string> = {
  mercadona: colors.chains.mercadona,
  lidl: colors.chains.lidl,
  aldi: colors.chains.aldi,
  carrefour: colors.chains.carrefour,
  dia: colors.chains.dia,
  alcampo: colors.chains.alcampo,
  local: colors.chains.local,
};

const CHAIN_LABELS: Record<StoreChain, string> = {
  mercadona: "Mercadona",
  lidl: "Lidl",
  aldi: "Aldi",
  carrefour: "Carrefour",
  dia: "Dia",
  alcampo: "Alcampo",
  local: "Local",
};

// ─── Sub-componente: Chip de tienda ───────────────────────────────────────────

interface StoreChipSmallProps {
  chain: StoreChain;
  distanceKm: number;
}

const StoreChipSmall: React.FC<StoreChipSmallProps> = ({
  chain,
  distanceKm,
}) => {
  const chainColor = CHAIN_COLORS[chain];
  return (
    <View style={[styles.storeChip, { borderColor: chainColor + "40" }]}>
      <View style={[styles.storeChipDot, { backgroundColor: chainColor }]} />
      <Text style={styles.storeChipText} numberOfLines={1}>
        {CHAIN_LABELS[chain]}
      </Text>
      <Text style={styles.storeChipDistance}>{distanceKm.toFixed(1)} km</Text>
    </View>
  );
};

// ─── Sub-componente: Badge de ahorro ─────────────────────────────────────────

interface SavingsBadgeProps {
  amount: number;
}

const SavingsBadge: React.FC<SavingsBadgeProps> = ({ amount }) => (
  <View
    style={styles.savingsBadge}
    accessibilityLabel={`Ahorras ${amount.toFixed(2)} euros`}
  >
    <Text style={styles.savingsBadgeText}>
      ↓{" "}
      {amount.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}{" "}
      €
    </Text>
  </View>
);

// ─── Constantes de animación ──────────────────────────────────────────────────

const SPRING = { damping: 14, stiffness: 280, mass: 0.7 };
const PRESS_SCALE = 0.97;

// ─── Variante Vertical ────────────────────────────────────────────────────────

const VerticalCard: React.FC<ProductCardProps> = ({
  data,
  onPress,
  onSave,
  isSaved,
  style,
}) => {
  const {
    product,
    bestPrice,
    previousPrice,
    discountPercent,
    bestStore,
    savingsVsMax,
  } = data;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE, SPRING);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  const imageSource: ImageSourcePropType = product.imageUrl
    ? { uri: product.imageUrl }
    : require("@/assets/placeholder-product.png");

  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={() => onPress(product.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.verticalContainer, shadows.card]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${bestPrice.toFixed(2)} euros en ${CHAIN_LABELS[bestStore.chain]}`}
      >
        {/* Imagen */}
        <View style={styles.verticalImageWrap}>
          <Image
            source={imageSource}
            style={styles.verticalImage}
            resizeMode="cover"
            accessible={false}
            importantForAccessibility="no"
          />

          {/* Badge de oferta sobre la imagen */}
          {discountPercent && discountPercent > 0 && (
            <View style={styles.offerBadgeOnImage}>
              <Text style={styles.offerBadgeText}>-{discountPercent}%</Text>
            </View>
          )}

          {/* Botón guardar */}
          {onSave && (
            <TouchableOpacity
              onPress={() => onSave(product.id)}
              style={styles.saveButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                isSaved ? "Eliminar de guardados" : "Guardar producto"
              }
            >
              <Text style={styles.saveIcon}>{isSaved ? "♥" : "♡"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contenido */}
        <View style={styles.verticalContent}>
          {/* Nombre */}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Marca */}
          {product.brand && (
            <Text style={styles.brandText} numberOfLines={1}>
              {product.brand}
            </Text>
          )}

          {/* Precio */}
          <PriceTag
            currentPrice={bestPrice}
            previousPrice={previousPrice}
            hideBadge
            size="sm"
            style={styles.priceTagVertical}
          />

          {/* Pie: tienda + ahorro */}
          <View style={styles.cardFooter}>
            <StoreChipSmall
              chain={bestStore.chain}
              distanceKm={bestStore.distanceKm}
            />
            {savingsVsMax && savingsVsMax > 0.01 && (
              <SavingsBadge amount={savingsVsMax} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Variante Horizontal ──────────────────────────────────────────────────────

const HorizontalCard: React.FC<ProductCardProps> = ({
  data,
  onPress,
  onSave,
  isSaved,
  style,
}) => {
  const {
    product,
    bestPrice,
    previousPrice,
    discountPercent,
    bestStore,
    savingsVsMax,
    storeCount,
  } = data;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE, SPRING);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  const imageSource: ImageSourcePropType = product.imageUrl
    ? { uri: product.imageUrl }
    : require("@/assets/placeholder-product.png");

  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={() => onPress(product.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.horizontalContainer, shadows.card]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, desde ${bestPrice.toFixed(2)} euros`}
      >
        {/* Imagen cuadrada */}
        <View style={styles.horizontalImageWrap}>
          <Image
            source={imageSource}
            style={styles.horizontalImage}
            resizeMode="cover"
            accessible={false}
            importantForAccessibility="no"
          />
          {discountPercent && discountPercent > 0 && (
            <View style={styles.offerBadgeOnImage}>
              <Text style={styles.offerBadgeText}>-{discountPercent}%</Text>
            </View>
          )}
        </View>

        {/* Contenido central */}
        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {product.brand && (
            <Text style={styles.brandText} numberOfLines={1}>
              {product.brand} · {storeCount} tiendas
            </Text>
          )}

          <View style={styles.horizontalBottom}>
            <PriceTag
              currentPrice={bestPrice}
              previousPrice={previousPrice}
              discountPercent={discountPercent}
              size="sm"
            />
            <StoreChipSmall
              chain={bestStore.chain}
              distanceKm={bestStore.distanceKm}
            />
          </View>

          {savingsVsMax && savingsVsMax > 0.01 && (
            <SavingsBadge amount={savingsVsMax} />
          )}
        </View>

        {/* Acción guardar */}
        {onSave && (
          <TouchableOpacity
            onPress={() => onSave(product.id)}
            style={styles.saveSide}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              isSaved ? "Eliminar de guardados" : "Guardar producto"
            }
          >
            <Text style={[styles.saveIcon, isSaved && { color: colors.error }]}>
              {isSaved ? "♥" : "♡"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Componente exportado (despacho por variante) ─────────────────────────────

export const ProductCard: React.FC<ProductCardProps> = (props) => {
  const { variant = "vertical", ...rest } = props;
  if (variant === "horizontal")
    return <HorizontalCard variant="horizontal" {...rest} />;
  return <VerticalCard variant="vertical" {...rest} />;
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Vertical ──────────────────────────────────────────────────────────────
  verticalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  verticalImageWrap: {
    height: 140,
    backgroundColor: colors.surfaceVariant,
    position: "relative",
  },
  verticalImage: {
    width: "100%",
    height: "100%",
  },
  verticalContent: {
    padding: spacing.sm,
    paddingTop: spacing.sm,
    gap: 4,
  },
  priceTagVertical: {
    marginTop: 2,
  },

  // ── Horizontal ────────────────────────────────────────────────────────────
  horizontalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 88,
  },
  horizontalImageWrap: {
    width: 88,
    alignSelf: "stretch",
    backgroundColor: colors.surfaceVariant,
    position: "relative",
  },
  horizontalImage: {
    width: "100%",
    height: "100%",
  },
  horizontalContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  horizontalBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  // ── Comunes ────────────────────────────────────────────────────────────────
  productName: {
    ...textStyles.bodyMedium,
    color: colors.text,
    lineHeight: 20,
  },
  brandText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 4,
  },

  // ── Store chip pequeño ─────────────────────────────────────────────────────
  storeChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    backgroundColor: colors.background,
  },
  storeChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeChipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
  },
  storeChipDistance: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    color: colors.textMuted,
  },

  // ── Savings badge ──────────────────────────────────────────────────────────
  savingsBadge: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.success + "40",
  },
  savingsBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    color: colors.success,
  },

  // ── Offer badge (sobre imagen) ────────────────────────────────────────────
  offerBadgeOnImage: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  offerBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    color: colors.accentDark,
  },

  // ── Save button ────────────────────────────────────────────────────────────
  saveButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(253,246,236,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveSide: {
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  saveIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
});

export default ProductCard;
