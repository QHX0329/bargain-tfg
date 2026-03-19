/**
 * [F4-13 / F4-14] Pantalla de ruta optimizada y desglose de ahorro.
 *
 * Flujo esperado (con backend F5 implementado):
 *   POST /optimizer/optimize/?list=<id> → OptimizationResult
 *
 * Mientras el backend no esté disponible, usa datos mock realistas
 * que muestran la UI completa con dos tabs:
 *   Tab 1 — Mapa de ruta (lista de paradas con orden y distancia)
 *   Tab 2 — Desglose de ahorro por parada y por producto
 *
 * La estructura de datos sigue el tipo OptimizationResult del dominio.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { OptimizationResult, RouteStop } from "@/types/domain";

type RouteP = RouteProp<ListsStackParamList, "Route">;

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockResult(listName: string): OptimizationResult {
  return {
    id: "mock-001",
    shoppingList: {
      id: "1",
      name: listName,
      owner: "tú",
      items: [],
    },
    mode: "balanced",
    totalPrice: 34.87,
    originalPrice: 41.20,
    savedAmount: 6.33,
    savedPercent: 15.4,
    totalDistanceKm: 3.2,
    totalTimeMinutes: 42,
    createdAt: new Date().toISOString(),
    stops: [
      {
        order: 1,
        store: {
          id: "1",
          name: "Mercadona Triana",
          chain: "mercadona",
          address: "C/ San Jacinto 12, Sevilla",
          distanceKm: 1.1,
          estimatedMinutes: 12,
          isOpen: true,
        },
        items: [
          { id: "i1", product: "p1", product_name: "Leche entera 1L Hacendado", quantity: 2, latest_price: 1.05, is_checked: false },
          { id: "i2", product: "p2", product_name: "Aceite de oliva virgen extra 750ml", quantity: 1, latest_price: 6.95, is_checked: false },
          { id: "i3", product: "p3", product_name: "Pan de molde integral 500g", quantity: 1, latest_price: 1.45, is_checked: false },
          { id: "i4", product: "p4", product_name: "Yogur natural x8", quantity: 1, latest_price: 2.20, is_checked: false },
        ],
        subtotal: 12.70,
        estimatedTimeMinutes: 15,
      },
      {
        order: 2,
        store: {
          id: "2",
          name: "Lidl Nervión",
          chain: "lidl",
          address: "Av. Luis de Morales 4, Sevilla",
          distanceKm: 1.6,
          estimatedMinutes: 18,
          isOpen: true,
        },
        items: [
          { id: "i5", product: "p5", product_name: "Pollo entero 1.8kg", quantity: 1, latest_price: 4.99, is_checked: false },
          { id: "i6", product: "p6", product_name: "Manzanas Royal Gala 1kg", quantity: 1, latest_price: 1.89, is_checked: false },
          { id: "i7", product: "p7", product_name: "Queso manchego semicurado 400g", quantity: 1, latest_price: 4.29, is_checked: false },
        ],
        subtotal: 11.17,
        estimatedTimeMinutes: 20,
      },
      {
        order: 3,
        store: {
          id: "3",
          name: "Carnicería El Rincón",
          chain: "local",
          address: "C/ Feria 89, Sevilla",
          distanceKm: 0.5,
          estimatedMinutes: 8,
          isOpen: true,
        },
        items: [
          { id: "i8", product: "p8", product_name: "Jamón serrano loncheado 200g", quantity: 2, latest_price: 3.50, is_checked: false },
          { id: "i9", product: "p9", product_name: "Lomo embuchado 150g", quantity: 1, latest_price: 4.30, is_checked: false },
        ],
        subtotal: 11.30,
        estimatedTimeMinutes: 10,
      },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHAIN_COLORS: Record<string, string> = {
  mercadona: colors.chains.mercadona,
  lidl: colors.chains.lidl,
  aldi: colors.chains.aldi,
  carrefour: colors.chains.carrefour,
  dia: colors.chains.dia,
  alcampo: colors.chains.alcampo,
  local: colors.chains.local,
};

const CHAIN_INITIALS: Record<string, string> = {
  mercadona: "M", lidl: "L", aldi: "A", carrefour: "C", dia: "D", alcampo: "Al", local: "🏪",
};

// ─── Tab Ruta ─────────────────────────────────────────────────────────────────

interface RouteTabProps {
  result: OptimizationResult;
}

const RouteTab: React.FC<RouteTabProps> = ({ result }) => (
  <ScrollView
    style={{ flex: 1 }}
    contentContainerStyle={routeTabStyles.content}
    showsVerticalScrollIndicator={false}
  >
    {/* Resumen */}
    <Animated.View entering={FadeInDown.delay(50).springify()} style={routeTabStyles.summary}>
      <View style={routeTabStyles.summaryItem}>
        <Ionicons name="navigate-outline" size={20} color={colors.primary} />
        <Text style={routeTabStyles.summaryValue}>{result.totalDistanceKm.toFixed(1)} km</Text>
        <Text style={routeTabStyles.summaryLabel}>total</Text>
      </View>
      <View style={routeTabStyles.summaryDivider} />
      <View style={routeTabStyles.summaryItem}>
        <Ionicons name="time-outline" size={20} color={colors.info} />
        <Text style={routeTabStyles.summaryValue}>{result.totalTimeMinutes} min</Text>
        <Text style={routeTabStyles.summaryLabel}>estimado</Text>
      </View>
      <View style={routeTabStyles.summaryDivider} />
      <View style={routeTabStyles.summaryItem}>
        <Ionicons name="storefront-outline" size={20} color={colors.success} />
        <Text style={routeTabStyles.summaryValue}>{result.stops.length}</Text>
        <Text style={routeTabStyles.summaryLabel}>paradas</Text>
      </View>
    </Animated.View>

    {/* Conectores + paradas */}
    {result.stops.map((stop, idx) => {
      const chainColor = CHAIN_COLORS[stop.store.chain] ?? colors.primary;
      const initial = CHAIN_INITIALS[stop.store.chain] ?? "?";
      return (
        <Animated.View
          key={stop.store.id}
          entering={FadeInDown.delay(100 + idx * 80).springify()}
        >
          {/* Línea de conexión */}
          {idx > 0 && (
            <View style={routeTabStyles.connector}>
              <View style={routeTabStyles.connectorLine} />
              <Text style={routeTabStyles.connectorDist}>
                {stop.store.distanceKm.toFixed(1)} km · {stop.estimatedTimeMinutes} min
              </Text>
            </View>
          )}

          {/* Tarjeta de parada */}
          <View style={routeTabStyles.stopCard}>
            {/* Badge de orden */}
            <View style={[routeTabStyles.orderBadge, { backgroundColor: chainColor }]}>
              <Text style={routeTabStyles.orderText}>{stop.order}</Text>
            </View>

            <View style={routeTabStyles.stopBody}>
              <View style={routeTabStyles.stopHeader}>
                <View style={[routeTabStyles.chainBadge, { backgroundColor: chainColor + "22" }]}>
                  <Text style={[routeTabStyles.chainInitial, { color: chainColor }]}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={routeTabStyles.storeName}>{stop.store.name}</Text>
                  <Text style={routeTabStyles.storeAddress} numberOfLines={1}>
                    {stop.store.address}
                  </Text>
                </View>
                <Text style={routeTabStyles.stopSubtotal}>{stop.subtotal.toFixed(2)} €</Text>
              </View>

              {/* Items */}
              <View style={routeTabStyles.itemsList}>
                {stop.items.map((item, i) => (
                  <View key={item.id} style={[routeTabStyles.itemRow, i > 0 && routeTabStyles.itemBorder]}>
                    <Text style={routeTabStyles.itemName} numberOfLines={1}>
                      {item.product_name ?? "Producto"}
                    </Text>
                    <Text style={routeTabStyles.itemQty}>×{item.quantity}</Text>
                    <Text style={routeTabStyles.itemPrice}>
                      {item.latest_price ? `${(item.latest_price * item.quantity).toFixed(2)} €` : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      );
    })}

    <View style={{ height: spacing.xxl }} />
  </ScrollView>
);

// ─── Tab Ahorro ───────────────────────────────────────────────────────────────

interface SavingsTabProps {
  result: OptimizationResult;
}

const SavingsTab: React.FC<SavingsTabProps> = ({ result }) => {
  const savingsItems = result.stops.flatMap((stop) =>
    stop.items.map((item) => ({
      ...item,
      storeName: stop.store.name,
      storeChain: stop.store.chain,
      originalPrice: item.latest_price ? item.latest_price * 1.15 : null,
    })),
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero de ahorro */}
      <Animated.View entering={FadeInDown.springify()} style={savingsStyles.hero}>
        <Text style={savingsStyles.heroLabel}>Ahorro total estimado</Text>
        <Text style={savingsStyles.heroAmount}>-{result.savedAmount.toFixed(2)} €</Text>
        <View style={savingsStyles.heroBadge}>
          <Ionicons name="trending-down" size={14} color={colors.success} />
          <Text style={savingsStyles.heroPct}>{result.savedPercent.toFixed(1)}% menos</Text>
        </View>

        {/* Barra de comparación */}
        <View style={savingsStyles.barWrapper}>
          <View style={savingsStyles.barBg}>
            <View
              style={[
                savingsStyles.barFill,
                { width: `${100 - result.savedPercent}%` },
              ]}
            />
          </View>
          <View style={savingsStyles.barLabels}>
            <Text style={savingsStyles.barLabel}>Optimizado {result.totalPrice.toFixed(2)} €</Text>
            <Text style={savingsStyles.barLabelMuted}>Normal {result.originalPrice.toFixed(2)} €</Text>
          </View>
        </View>
      </Animated.View>

      {/* Desglose por tienda */}
      {result.stops.map((stop, idx) => {
        const chainColor = CHAIN_COLORS[stop.store.chain] ?? colors.primary;
        const stopOriginal = stop.subtotal * 1.15;
        const stopSavings = stopOriginal - stop.subtotal;
        return (
          <Animated.View
            key={stop.store.id}
            entering={FadeInDown.delay(idx * 80).springify()}
            style={savingsStyles.storeCard}
          >
            <View style={savingsStyles.storeHeader}>
              <View style={[savingsStyles.dot, { backgroundColor: chainColor }]} />
              <Text style={savingsStyles.storeName}>{stop.store.name}</Text>
              <View style={savingsStyles.storeSavings}>
                <Text style={savingsStyles.storeSavingsText}>
                  -{stopSavings.toFixed(2)} €
                </Text>
              </View>
            </View>

            {stop.items.map((item, i) => {
              const orig = item.latest_price ? item.latest_price * 1.15 : null;
              const saved = orig && item.latest_price ? (orig - item.latest_price) * item.quantity : 0;
              return (
                <View key={item.id} style={[savingsStyles.itemRow, i > 0 && savingsStyles.itemBorder]}>
                  <Text style={savingsStyles.itemName} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  {saved > 0 && (
                    <Text style={savingsStyles.itemSaving}>-{saved.toFixed(2)} €</Text>
                  )}
                </View>
              );
            })}

            <View style={savingsStyles.storeFooter}>
              <Text style={savingsStyles.storeFooterLabel}>Subtotal</Text>
              <Text style={savingsStyles.storeFooterValue}>{stop.subtotal.toFixed(2)} €</Text>
            </View>
          </Animated.View>
        );
      })}

      {/* Nota sobre mock */}
      <View style={savingsStyles.mockNote}>
        <Ionicons name="information-circle-outline" size={14} color={colors.info} />
        <Text style={savingsStyles.mockText}>
          Datos de ejemplo. El optimizador estará disponible en una próxima versión.
        </Text>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { listId, listName } = route.params;

  const [activeTab, setActiveTab] = useState<"route" | "savings">("route");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const tabIndicatorLeft = useSharedValue(0);

  useEffect(() => {
    // Simulamos llamada a API con 1.2s de delay
    const timer = setTimeout(() => {
      setResult(buildMockResult(listName));
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [listName]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorLeft.value }],
  }));

  const switchTab = (tab: "route" | "savings", x: number) => {
    setActiveTab(tab);
    tabIndicatorLeft.value = withTiming(x);
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Ruta optimizada</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{listName}</Text>
        </View>
        <View style={styles.modeBadge}>
          <Ionicons name="scale-outline" size={12} color={colors.white} />
          <Text style={styles.modeBadgeText}>Equilibrado</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab("route", 0)}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={activeTab === "route" ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === "route" && styles.tabTextActive]}>
            Ruta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab("savings", 0)}
        >
          <Ionicons
            name="trending-down-outline"
            size={16}
            color={activeTab === "savings" ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === "savings" && styles.tabTextActive]}>
            Ahorro
          </Text>
        </TouchableOpacity>
        <View style={[styles.tabIndicator, { left: activeTab === "route" ? "0%" : "50%" }]} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Calculando ruta óptima…</Text>
          <Text style={styles.loadingBody}>
            Comparando precios en {`>`}20 tiendas cercanas
          </Text>
        </View>
      ) : result ? (
        activeTab === "route" ? (
          <RouteTab result={result} />
        ) : (
          <SavingsTab result={result} />
        )
      ) : null}
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
  back: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    color: colors.white,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    position: "relative",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.primary },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  loadingBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const routeTabStyles = StyleSheet.create({
  content: { padding: spacing.md },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  summaryLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
  },
  connector: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 28,
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  connectorDist: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  stopCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    ...shadows.card,
  },
  orderBadge: {
    width: 32,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: spacing.md,
  },
  orderText: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.white,
  },
  stopBody: { flex: 1, padding: spacing.sm },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chainBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chainInitial: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.sm,
  },
  storeName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  storeAddress: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  stopSubtotal: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.primary,
    marginLeft: "auto",
  },
  itemsList: { gap: 2 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemName: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  itemQty: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  itemPrice: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    color: colors.text,
  },
});

const savingsStyles = StyleSheet.create({
  hero: {
    backgroundColor: colors.secondaryDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  heroLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.75,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  heroPct: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  barWrapper: { width: "100%", gap: spacing.xs },
  barBg: {
    height: 8,
    backgroundColor: colors.white + "44",
    borderRadius: borderRadius.pill,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  barLabelMuted: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.6,
    textDecorationLine: "line-through",
  },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  storeName: {
    flex: 1,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  storeSavings: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  storeSavingsText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.success,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemName: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  itemSaving: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.success,
  },
  storeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  storeFooterLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  storeFooterValue: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.text,
  },
  mockNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.infoBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  mockText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.info,
    lineHeight: 16,
  },
});
