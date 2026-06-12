import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

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
import type { StoreProductOffer } from "@/api/storeService";
import { productService } from "@/api/productService";
import type { ProductCategory } from "@/api/productService";
import type { PlacesDetail, Store } from "@/types/domain";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { WebTooltip } from "@/components/ui";
import { copyToClipboard } from "@/utils/webExport";

type Props = NativeStackScreenProps<MapStackParamList, "StoreProfile">;

const PRODUCTS_PAGE_SIZE = 12;

interface CategoryFilterOption {
  id: number;
  label: string;
}

function nextPageFromUrl(nextUrl: string | null): number | null {
  if (!nextUrl) {
    return null;
  }

  try {
    const parsed = new URL(nextUrl);
    const nextParam = parsed.searchParams.get("page");
    if (!nextParam) {
      return null;
    }
    const page = parseInt(nextParam, 10);
    return Number.isNaN(page) || page < 1 ? null : page;
  } catch {
    return null;
  }
}

function flattenCategoryFilters(
  categories: ProductCategory[],
): CategoryFilterOption[] {
  return categories.flatMap((root) => {
    const children = (root.children ?? []).map((child) => ({
      id: child.id,
      label: `${root.name} / ${child.name}`,
    }));
    return [{ id: root.id, label: root.name }, ...children];
  });
}

function haversineDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function chainLabel(store: Store): string {
  const map: Record<string, string> = {
    mercadona: "Mercadona",
    lidl: "Lidl",
    aldi: "Aldi",
    carrefour: "Carrefour",
    dia: "Dia",
    alcampo: "Alcampo",
    hipercor: "Hipercor",
    costco: "Costco",
    eroski: "Eroski",
    spar: "SPAR",
    consum: "Consum",
    coviran: "Coviran",
    local: "Comercio local",
  };
  return map[store.chain] ?? "Tienda";
}

export const StoreProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { storeId, storeName, userLat, userLng } = route.params;
  const breakpoint = useBreakpoint();

  // Copy-address / share-URL feedback state (web-only)
  const [addressCopied, setAddressCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const handleCopyAddress = useCallback(async (address: string) => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1500);
    }
  }, []);

  const handleShareUrl = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 1500);
    }
  }, []);

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
    "all",
  );
  const [products, setProducts] = useState<StoreProductOffer[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // ── Google Places enrichment ──────────────────────────────────────────────
  const [placesDetail, setPlacesDetail] = useState<PlacesDetail | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  const categoryFilters = useMemo(
    () => flattenCategoryFilters(categories),
    [categories],
  );

  const loadProductsPage = useCallback(
    async (page: number, replace: boolean, categoryId: number | "all") => {
      const payload = await storeService.getProducts(storeId, {
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        categoryId: categoryId === "all" ? undefined : categoryId,
      });

      const sorted = [...payload.results].sort((a, b) => {
        const aEffective = a.offerPrice ?? a.price;
        const bEffective = b.offerPrice ?? b.price;
        return aEffective - bEffective;
      });

      setProductsCount(payload.count);
      setNextPage(nextPageFromUrl(payload.next));

      if (replace) {
        setProducts(sorted);
        return;
      }

      setProducts((prev) => {
        const merged = [...prev, ...sorted];
        const seenIds = new Set<string>();
        return merged.filter((item) => {
          if (seenIds.has(item.product.id)) {
            return false;
          }
          seenIds.add(item.product.id);
          return true;
        });
      });
    },
    [storeId],
  );

  const loadStoreProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detail, fetchedCategories] = await Promise.all([
        storeService.getDetail(storeId, userLat, userLng, 20),
        productService.getCategories(),
      ]);
      setStore(detail);
      setCategories(fetchedCategories);

      await loadProductsPage(1, true, selectedCategoryId);
    } finally {
      setIsLoading(false);
    }
  }, [loadProductsPage, selectedCategoryId, storeId, userLat, userLng]);

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

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || isRefreshing || nextPage === null) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await loadProductsPage(nextPage, false, selectedCategoryId);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadProductsPage,
    nextPage,
    selectedCategoryId,
  ]);

  const handleSelectCategory = useCallback(
    async (categoryId: number | "all") => {
      if (selectedCategoryId === categoryId || isLoading || isRefreshing) {
        return;
      }

      setSelectedCategoryId(categoryId);
      await loadProductsPage(1, true, categoryId);
    },
    [isLoading, isRefreshing, loadProductsPage, selectedCategoryId],
  );

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

  // Compute distance from user's location.
  // Tier 1: haversine from PostGIS coordinates (precise).
  // Tier 2: backend-annotated distanceKm from retrieve (when location field is absent).
  const distanceFromUser = useMemo<number | null>(() => {
    if (store?.location?.coordinates) {
      const [lng, lat] = store.location.coordinates;
      return haversineDistanceKm(userLat, userLng, lat, lng);
    }
    if (store?.distanceKm != null && store.distanceKm > 0) {
      return store.distanceKm;
    }
    return null;
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
      <SafeAreaView style={styles.centered} edges={[]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil de tienda...</Text>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.centered} edges={[]}>
        <Ionicons
          name="storefront-outline"
          size={36}
          color={colors.textMuted}
        />
        <Text style={styles.emptyText}>No se pudo cargar la tienda.</Text>
      </SafeAreaView>
    );
  }

  // ── Shared: store info section (left column on desktop, header on mobile) ─
  const storeInfoSection = (
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

      {/* Address row — copy button on web (D-07) */}
      <View style={styles.addressRow}>
        <Text style={[styles.addressText, { flex: 1 }]}>
          {store.address || "Dirección no disponible"}
        </Text>
        {Platform.OS === "web" && store.address ? (
          <WebTooltip label={addressCopied ? "¡Copiado!" : "Copiar dirección"}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => void handleCopyAddress(store.address!)}
              accessibilityRole="button"
              accessibilityLabel="Copiar dirección"
            >
              <Ionicons
                name={addressCopied ? "checkmark" : "copy-outline"}
                size={16}
                color={addressCopied ? colors.success : colors.textMuted}
              />
            </TouchableOpacity>
          </WebTooltip>
        ) : null}
      </View>

      <Text style={styles.distanceText}>
        {distanceFromUser !== null
          ? distanceFromUser < 1
            ? `${Math.round(distanceFromUser * 1000)} m · ≈${Math.max(1, Math.round(distanceFromUser * 3.5))} min`
            : `${distanceFromUser.toFixed(1)} km · ≈${Math.max(1, Math.round(distanceFromUser * 3.5))} min`
          : "Distancia no disponible"}
      </Text>

      {/* Share URL button — web only (D-08) */}
      {Platform.OS === "web" && (
        <WebTooltip label="Copiar enlace">
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => void handleShareUrl()}
            accessibilityRole="button"
            accessibilityLabel="Copiar enlace de esta tienda"
          >
            <Ionicons
              name={urlCopied ? "checkmark" : "share-social-outline"}
              size={14}
              color={urlCopied ? colors.success : colors.primary}
            />
            <Text
              style={[
                styles.shareButtonText,
                urlCopied && { color: colors.success },
              ]}
            >
              {urlCopied ? "¡Enlace copiado!" : "Compartir enlace"}
            </Text>
          </TouchableOpacity>
        </WebTooltip>
      )}

      {/* Horario de BD — se oculta cuando Places está cargando o ya cargó datos */}
      {placesDetail == null && !isLoadingPlaces && (
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
              <Ionicons name="star" size={14} color={colors.warning} />
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
              <Ionicons name="globe-outline" size={14} color={colors.primary} />
              <Text style={styles.placesLinkText}>Sitio web oficial</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  // ── Shared: category filter chips ────────────────────────────────────────
  const categoryFilterRow = (
    <>
      <Text style={styles.productsTitle}>
        Productos detectados en esta tienda ({productsCount})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFiltersContent}
        style={styles.categoryFilters}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategoryId === "all" ? styles.categoryChipActive : null,
          ]}
          onPress={() => {
            void handleSelectCategory("all");
          }}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por todas las categorías"
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategoryId === "all"
                ? styles.categoryChipTextActive
                : null,
            ]}
          >
            Todas
          </Text>
        </TouchableOpacity>

        {categoryFilters.map((category) => {
          const isActive = selectedCategoryId === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                isActive ? styles.categoryChipActive : null,
              ]}
              onPress={() => {
                void handleSelectCategory(category.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${category.label}`}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isActive ? styles.categoryChipTextActive : null,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  // ── Shared: product list items ───────────────────────────────────────────
  const renderProductItem = ({ item }: { item: StoreProductOffer }) => (
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
        <Text style={styles.productPrice}>
          {(item.offerPrice ?? item.price).toFixed(2)} €
        </Text>
        <Text style={styles.productSource}>{item.source}</Text>
      </View>
    </View>
  );

  const listEmptyComponent = (
    <View style={styles.emptyProducts}>
      <Ionicons name="cube-outline" size={24} color={colors.textDisabled} />
      <Text style={styles.emptyProductsText}>
        No se encontraron productos con precio para esta tienda.
      </Text>
    </View>
  );

  const listFooterComponent = isLoadingMore ? (
    <View style={styles.listFooterLoading}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.listFooterText}>Cargando más productos...</Text>
    </View>
  ) : null;

  // ── Desktop: two-column layout (D-05) ────────────────────────────────────
  if (breakpoint === "desktop") {
    return (
      <SafeAreaView style={styles.containerDesktop} edges={[]}>
        {/* Left column: store info (~50%) */}
        <ScrollView
          style={styles.desktopLeft}
          contentContainerStyle={styles.desktopLeftContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {storeInfoSection}
        </ScrollView>

        {/* Right column: category filters + product list (~50%) */}
        <View style={styles.desktopRight}>
          <View style={styles.desktopRightHeader}>{categoryFilterRow}</View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.product.id}
            onEndReached={() => {
              void handleLoadMore();
            }}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.desktopRightList}
            renderItem={renderProductItem}
            ListEmptyComponent={listEmptyComponent}
            ListFooterComponent={listFooterComponent}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Mobile / Tablet: original single-column FlatList ────────────────────
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.product.id}
        onEndReached={() => {
          void handleLoadMore();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {storeInfoSection}
            {categoryFilterRow}
          </View>
        }
        ListEmptyComponent={listEmptyComponent}
        renderItem={renderProductItem}
        ListFooterComponent={listFooterComponent}
      />
    </SafeAreaView>
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
  categoryFilters: {
    marginTop: spacing.sm,
  },
  categoryFiltersContent: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontFamily: fontFamilies.bodyMedium,
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
  listFooterLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  listFooterText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  // ── Web convenience styles (D-07/D-08) ────────────────────────────────────
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceVariant,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shareButtonText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  // ── Desktop two-column layout styles (D-05) ───────────────────────────────
  containerDesktop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },
  desktopLeft: {
    flex: 1,
  },
  desktopLeftContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  desktopRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.xl, // spacing.xl = 32px column gap (UI-SPEC)
    paddingRight: spacing.md,
    paddingTop: spacing.md,
  },
  desktopRightHeader: {
    paddingBottom: spacing.sm,
  },
  desktopRightList: {
    paddingBottom: spacing.xxl,
  },
});

export default StoreProfileScreen;
