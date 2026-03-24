import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import type { MapStackParamList } from "@/navigation/types";
import { storeService } from "@/api/storeService";
import { productService } from "@/api/productService";
import { priceService } from "@/api/priceService";
import type { PlacesDetail, PriceCompare, Product, Store } from "@/types/domain";
import { SkeletonBox } from "@/components/ui/SkeletonBox";

type Props = NativeStackScreenProps<MapStackParamList, "StoreProfile">;

interface StoreProductOffer {
  product: Product;
  price: number;
  source: PriceCompare["source"];
  distanceKm: number | null;
}

const PRODUCT_SCAN_LIMIT = 60;

function haversineDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function effectiveRowPrice(row: PriceCompare): number {
  const values = [row.promo_price, row.offer_price, row.price]
    .filter(Boolean)
    .map((value) => parseFloat(String(value)));
  return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

function chainLabel(store: Store): string {
  const map: Record<string, string> = {
    mercadona: "Mercadona",
    lidl: "Lidl",
    aldi: "Aldi",
    carrefour: "Carrefour",
    dia: "Dia",
    alcampo: "Alcampo",
    local: "Comercio local",
  };
  return map[store.chain] ?? "Tienda";
}

export const StoreProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { storeId, storeName, userLat, userLng } = route.params;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProductOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // ── Google Places enrichment ──────────────────────────────────────────────
  const [placesDetail, setPlacesDetail] = useState<PlacesDetail | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  const loadStoreProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const detail = await storeService.getDetail(
        storeId,
        userLat,
        userLng,
        20,
      );
      setStore(detail);

      const productCandidates: Product[] = [];
      const firstPage = await productService.list({ page: 1 });
      productCandidates.push(...firstPage.results);
      if (firstPage.next && productCandidates.length < PRODUCT_SCAN_LIMIT) {
        const secondPage = await productService.list({ page: 2 });
        productCandidates.push(...secondPage.results);
      }

      const scanProducts = productCandidates.slice(0, PRODUCT_SCAN_LIMIT);
      const collected: StoreProductOffer[] = [];

      for (const product of scanProducts) {
        try {
          const comparison = await priceService.getPriceComparison(
            product.id,
            userLat,
            userLng,
            20,
          );
          const row = comparison.find(
            (entry) => String(entry.store_id) === String(storeId),
          );
          if (!row) {
            continue;
          }

          const price = effectiveRowPrice(row);
          if (!Number.isFinite(price)) {
            continue;
          }

          collected.push({
            product,
            price,
            source: row.source,
            distanceKm: row.distance_km,
          });
        } catch {
          // Continue scanning products if one compare call fails.
        }
      }

      collected.sort((a, b) => a.price - b.price);
      setProducts(collected.slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  }, [storeId, userLat, userLng]);

  useEffect(() => {
    void loadStoreProfile();
  }, [loadStoreProfile]);

  // Fetch Places enrichment independently (silent fail, does not block profile)
  useEffect(() => {
    setIsLoadingPlaces(true);
    storeService
      .getPlacesDetail(storeId)
      .then(setPlacesDetail)
      .catch(() => {})
      .finally(() => setIsLoadingPlaces(false));
  }, [storeId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadStoreProfile();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadStoreProfile]);

  const handleToggleFavorite = useCallback(async () => {
    if (!store) {
      return;
    }

    setIsTogglingFavorite(true);
    try {
      const isFavorite = await storeService.toggleFavorite(store.id);
      setStore((prev) => (prev ? { ...prev, isFavorite } : prev));
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [store]);

  // Compute distance from user's location using store coordinates.
  // The backend doesn't annotate distance for retrieve, so we do it here.
  const distanceFromUser = useMemo<number | null>(() => {
    if (!store?.location?.coordinates) return null;
    const [lng, lat] = store.location.coordinates;
    return haversineDistanceKm(userLat, userLng, lat, lng);
  }, [store, userLat, userLng]);

  const openingHoursText = useMemo(() => {
    if (!store?.openingHours || Object.keys(store.openingHours).length === 0) {
      return "Horario no disponible";
    }
    return Object.entries(store.openingHours)
      .map(([day, hours]) => `${day}: ${String(hours)}`)
      .join("\n");
  }, [store?.openingHours]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil de tienda...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="storefront-outline"
          size={36}
          color={colors.textMuted}
        />
        <Text style={styles.emptyText}>No se pudo cargar la tienda.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.product.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.headerCard, shadows.card]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.canGoBack()
                  ? navigation.goBack()
                  : navigation.navigate("Map")
              }
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>
                  {store.name ?? storeName ?? "Tienda"}
                </Text>
                <Text style={styles.chainText}>{chainLabel(store)}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  store.isFavorite ? styles.favoriteButtonActive : null,
                ]}
                onPress={handleToggleFavorite}
                disabled={isTogglingFavorite}
                accessibilityRole="button"
                accessibilityLabel="Alternar favorito"
              >
                {isTogglingFavorite ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons
                    name={store.isFavorite ? "heart" : "heart-outline"}
                    size={16}
                    color={colors.white}
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.addressText}>
              {store.address || "Dirección no disponible"}
            </Text>
            <Text style={styles.distanceText}>
              {distanceFromUser !== null
                ? distanceFromUser < 1
                  ? `${Math.round(distanceFromUser * 1000)} m · ≈${Math.max(1, Math.round(distanceFromUser * 3.5))} min`
                  : `${distanceFromUser.toFixed(1)} km · ≈${Math.max(1, Math.round(distanceFromUser * 3.5))} min`
                : "Distancia no disponible"}
            </Text>

            {/* Horario de BD — se oculta cuando Places proporciona el suyo */}
            {!placesDetail?.opening_hours && (
              <View style={styles.hoursBox}>
                <Text style={styles.hoursTitle}>Horario</Text>
                <Text style={styles.hoursText}>{openingHoursText}</Text>
              </View>
            )}

            {/* ── Google Places enrichment sections ──────────────────── */}
            {isLoadingPlaces ? (
              <View style={styles.placesLoadingRow}>
                <SkeletonBox width="60%" height={14} />
                <SkeletonBox width="40%" height={14} />
              </View>
            ) : (
              <>
                {/* Rating */}
                {placesDetail?.rating != null && (
                  <View style={styles.placesRow}>
                    <Ionicons
                      name="star"
                      size={14}
                      color={colors.warning}
                    />
                    <Text style={styles.placesRatingText}>
                      {placesDetail.rating.toFixed(1)}
                      {placesDetail.user_rating_count != null
                        ? ` (${placesDetail.user_rating_count} valoraciones)`
                        : ""}
                    </Text>
                  </View>
                )}

                {/* Opening hours from Places */}
                {placesDetail?.opening_hours != null && (
                  <View style={styles.placesOpenHoursBox}>
                    {placesDetail.opening_hours.openNow != null && (
                      <View
                        style={[
                          styles.openNowBadge,
                          placesDetail.opening_hours.openNow
                            ? styles.openNowBadgeOpen
                            : styles.openNowBadgeClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.openNowBadgeText,
                            placesDetail.opening_hours.openNow
                              ? styles.openNowBadgeTextOpen
                              : styles.openNowBadgeTextClosed,
                          ]}
                        >
                          {placesDetail.opening_hours.openNow
                            ? "Abierto ahora"
                            : "Cerrado"}
                        </Text>
                      </View>
                    )}
                    {placesDetail.opening_hours.weekdayDescriptions?.map(
                      (line, i) => (
                        <Text key={i} style={styles.placesHoursLine}>
                          {line}
                        </Text>
                      ),
                    )}
                  </View>
                )}

                {/* Website */}
                {placesDetail?.website_url != null && (
                  <TouchableOpacity
                    style={styles.placesRow}
                    onPress={() =>
                      Linking.openURL(placesDetail.website_url!).catch(() => {})
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.placesLinkText}>Sitio web oficial</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={styles.productsTitle}>
              Productos detectados en esta tienda
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyProducts}>
            <Ionicons
              name="cube-outline"
              size={24}
              color={colors.textDisabled}
            />
            <Text style={styles.emptyProductsText}>
              No se encontraron productos con precio para esta tienda.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.productRow, shadows.card]}>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text style={styles.productMeta} numberOfLines={1}>
                {item.product.category}
                {item.product.brand ? ` · ${item.product.brand}` : ""}
              </Text>
            </View>
            <View style={styles.productPriceWrap}>
              <Text style={styles.productPrice}>{item.price.toFixed(2)} €</Text>
              <Text style={styles.productSource}>{item.source}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  storeName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  chainText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButtonActive: {
    backgroundColor: colors.error,
  },
  addressText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  distanceText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  hoursBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  hoursTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: 4,
  },
  hoursText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  productsTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyProducts: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  emptyProductsText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  productRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  productMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  productPriceWrap: {
    alignItems: "flex-end",
  },
  productPrice: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  productSource: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  // ── Google Places enrichment styles ────────────────────────────────────────
  placesLoadingRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  placesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  placesRatingText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  placesOpenHoursBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  openNowBadge: {
    alignSelf: "flex-start",
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  openNowBadgeOpen: {
    backgroundColor: "#D1FAE5",
  },
  openNowBadgeClosed: {
    backgroundColor: "#FEE2E2",
  },
  openNowBadgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
  },
  openNowBadgeTextOpen: {
    color: "#065F46",
  },
  openNowBadgeTextClosed: {
    color: "#991B1B",
  },
  placesHoursLine: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  placesLinkText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

export default StoreProfileScreen;
