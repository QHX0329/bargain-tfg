/**
 * [F4-10] Pantalla de comparación de precios por tienda.
 *
 * Recibe un productId + productName vía route params.
 * Llama a GET /prices/compare/?product=<id>[&lat=<lat>&lng=<lng>&radius=<km>]
 * y muestra las tiendas ordenadas de menor a mayor precio.
 *
 * Permite:
 *  - Ver precio normal, precio oferta y promoción activa.
 *  - Filtrar por distancia (solo tiendas cercanas).
 *  - Crear una alerta de precio desde el bottom sheet.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { priceService } from "@/api/priceService";
import type { PriceCompare, Product } from "@/types/domain";
import { blurActiveElementOnWeb } from "@/utils/webA11y";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  return `${parseFloat(value).toFixed(2)} €`;
}

function bestPrice(item: PriceCompare): number {
  const candidates = [item.promo_price, item.offer_price, item.price]
    .filter(Boolean)
    .map((v) => parseFloat(v!));
  return Math.min(...candidates);
}

function sourceLabel(source: PriceCompare["source"]): string {
  return (
    { scraping: "Scraping", crowdsourcing: "Comunidad", api: "Oficial", business: "PYME" }[
      source
    ] ?? source
  );
}

function sourceColor(source: PriceCompare["source"]): string {
  return (
    {
      scraping: colors.info,
      crowdsourcing: colors.accent,
      api: colors.success,
      business: colors.primary,
    }[source] ?? colors.textMuted
  );
}

// ─── Componente de fila de tienda ─────────────────────────────────────────────

interface StoreRowProps {
  item: PriceCompare;
  index: number;
  isBest: boolean;
}

const StoreRow: React.FC<StoreRowProps> = ({ item, index, isBest }) => {
  const effective = bestPrice(item);
  const hasOffer = item.offer_price !== null || item.promo_price !== null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View style={[rowStyles.container, isBest && rowStyles.bestContainer]}>
        {isBest && (
          <View style={rowStyles.bestBadge}>
            <Ionicons name="trophy" size={10} color={colors.white} />
            <Text style={rowStyles.bestBadgeText}>MEJOR PRECIO</Text>
          </View>
        )}

        <View style={rowStyles.header}>
          <Text style={rowStyles.storeName} numberOfLines={1}>
            {item.store_name}
          </Text>
          {item.distance_km !== null && (
            <Text style={rowStyles.distance}>
              {item.distance_km.toFixed(1)} km
            </Text>
          )}
        </View>

        <View style={rowStyles.priceRow}>
          {/* Precio efectivo */}
          <Text style={[rowStyles.price, isBest && rowStyles.priceAccent]}>
            {effective.toFixed(2)} €
          </Text>

          {/* Precio normal tachado si hay oferta */}
          {hasOffer && (
            <Text style={rowStyles.strikethrough}>{fmt(item.price)}</Text>
          )}

          {/* Badge de promoción */}
          {item.promotion && (
            <View style={rowStyles.promoBadge}>
              <Text style={rowStyles.promoText}>
                {item.promotion.discount_type === "percentage"
                  ? `-${item.promotion.discount_value}%`
                  : `-${item.promotion.discount_value}€`}
              </Text>
            </View>
          )}
        </View>

        <View style={rowStyles.footer}>
          <View
            style={[
              rowStyles.sourceBadge,
              { backgroundColor: sourceColor(item.source) + "22" },
            ]}
          >
            <Text
              style={[rowStyles.sourceText, { color: sourceColor(item.source) }]}
            >
              {sourceLabel(item.source)}
            </Text>
          </View>

          {item.is_stale && (
            <View style={rowStyles.staleBadge}>
              <Ionicons
                name="time-outline"
                size={10}
                color={colors.warning}
              />
              <Text style={rowStyles.staleText}>Precio desactualizado</Text>
            </View>
          )}
        </View>

        {item.promotion?.title && (
          <Text style={rowStyles.promoTitle} numberOfLines={1}>
            {item.promotion.title}
            {item.promotion.end_date && ` · hasta ${item.promotion.end_date}`}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Modal de alerta de precio ────────────────────────────────────────────────

interface AlertModalProps {
  visible: boolean;
  productId: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  productId,
  onClose,
}) => {
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(targetPrice.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      Alert.alert("Precio inválido", "Introduce un precio mayor que 0.");
      return;
    }
    setSaving(true);
    try {
      await priceService.createPriceAlert({
        product: parseInt(productId, 10),
        target_price: val.toFixed(2),
      });
      Alert.alert(
        "Alerta creada",
        "Te avisaremos cuando el precio baje del objetivo.",
      );
      onClose();
    } catch {
      Alert.alert("Error", "No se pudo crear la alerta. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>Crear alerta de precio</Text>
        <Text style={modalStyles.subtitle}>
          Te notificaremos cuando el precio caiga por debajo del objetivo.
        </Text>

        <View style={modalStyles.inputWrapper}>
          <TextInput
            style={modalStyles.input}
            placeholder="Precio objetivo (€)"
            keyboardType="numeric"
            value={targetPrice}
            onChangeText={setTargetPrice}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[modalStyles.btn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={modalStyles.btnText}>Crear alerta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={modalStyles.cancel} onPress={onClose}>
          <Text style={modalStyles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const PriceCompareScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { productId, productName, product } = route.params as {
    productId: string;
    productName: string;
    product?: Product;
  };

  const [prices, setPrices] = useState<PriceCompare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [alertVisible, setAlertVisible] = useState(false);

  const fetchPrices = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await priceService.getPriceComparison(
          productId,
          coords?.lat,
          coords?.lng,
        );
        // Ordenar por precio efectivo ascendente
        const sorted = [...data].sort(
          (a, b) => bestPrice(a) - bestPrice(b),
        );
        setPrices(sorted);
      } catch {
        setError("No se pudieron cargar los precios. Comprueba tu conexión.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [productId, coords],
  );

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Ubicación denegada",
        "Sin ubicación, se muestran precios de todas las tiendas.",
      );
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setUseLocation(true);
  }, []);

  const toggleLocation = useCallback(async () => {
    if (useLocation) {
      setUseLocation(false);
      setCoords(null);
    } else {
      await requestLocation();
    }
  }, [useLocation, requestLocation]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrices(true);
  }, [fetchPrices]);

  const bestIdx = prices.length > 0 ? 0 : -1;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Comparar precios
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {productName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            blurActiveElementOnWeb();
            setAlertVisible(true);
          }}
          style={styles.alertBtn}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterChip, useLocation && styles.filterChipActive]}
          onPress={toggleLocation}
        >
          <Ionicons
            name={useLocation ? "location" : "location-outline"}
            size={14}
            color={useLocation ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.filterChipText,
              useLocation && styles.filterChipTextActive,
            ]}
          >
            {useLocation ? "Tiendas cercanas" : "Activar ubicación"}
          </Text>
        </TouchableOpacity>

        {prices.length > 0 && (
          <Text style={styles.countLabel}>
            {prices.length} tienda{prices.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {product && (
        <View style={styles.productInfoCard}>
          <Text style={styles.productInfoTitle}>Información del producto</Text>
          <Text style={styles.productInfoLine}>Categoría: {product.category}</Text>
          <Text style={styles.productInfoLine}>
            Marca: {product.brand?.trim() ? product.brand : "Sin marca"}
          </Text>
          <Text style={styles.productInfoLine}>
            Unidad: {product.unitQuantity} {product.unit}
          </Text>
          {product.barcode ? (
            <Text style={styles.productInfoLine}>EAN: {product.barcode}</Text>
          ) : null}
        </View>
      )}

      {/* Contenido */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando precios…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPrices()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : prices.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyBody}>
            No se encontraron precios para este producto en las tiendas
            disponibles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item) => String(item.store_id)}
          renderItem={({ item, index }) => (
            <StoreRow item={item} index={index} isBest={index === bestIdx} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <AlertModal
        visible={alertVisible}
        productId={productId}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { padding: spacing.xs },
  headerCenter: { flex: 1, marginHorizontal: spacing.sm },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  alertBtn: { padding: spacing.xs },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  filterChipTextActive: { color: colors.white },
  countLabel: {
    marginLeft: "auto",
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  productInfoCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  productInfoTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productInfoLine: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  separator: { height: spacing.sm },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  emptyBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  bestContainer: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  bestBadgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 9,
    color: colors.white,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  storeName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  distance: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  price: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.text,
  },
  priceAccent: { color: colors.primary },
  strikethrough: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  promoBadge: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  promoText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.success,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sourceBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  sourceText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
  },
  staleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  staleText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.warning,
  },
  promoTitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.pill,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  input: {
    padding: spacing.md,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  btnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.white,
  },
  cancel: { alignItems: "center", padding: spacing.sm },
  cancelText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
