/**
 * [F4-13 / F4-14 / F5-05] Pantalla de ruta optimizada y desglose de ahorro.
 *
 * Conecta con:
 *   POST /api/v1/optimize/ → OptimizeResponse (F5-04)
 *
 * Flujo:
 *  1. Pantalla inicial muestra configuración (peso precio/distancia/tiempo, max paradas)
 *  2. Usuario pulsa "Optimizar ruta" → se obtiene ubicación via expo-location
 *  3. Mientras espera → SkeletonBox de carga (3 filas × 56px)
 *  4. Resultado → herocard precio total + lista de paradas ordenadas
 *  5. Error OPTIMIZER_NO_STORES_IN_RADIUS → tarjeta de error con CTA "Ampliar radio"
 *  6. Error de red → tarjeta de error con mensaje genérico
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import * as Location from "expo-location";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { downloadFile, todayStamp } from "@/utils/webExport";
import { authService } from "@/api/authService";
import {
  getLatestOptimizedRoute,
  optimizeRoute,
  saveSemanticChoice,
} from "@/api/optimizerService";
import type {
  OptimizeResponse,
  RouteStop,
  RouteStopSemanticOption,
} from "@/api/optimizerService";
import { listService } from "@/api/listService";
import { scheduleLockscreenChecklist } from "@/services/lockscreenChecklistService";
import { useProfileStore } from "@/store/profileStore";
import type { ShoppingListItem, UserProfile } from "@/types/domain";
import {
  buildAppleMapsCircularRouteUrl,
  buildGoogleMapsAppCircularRouteUrl,
  buildGoogleMapsCircularRouteUrl,
} from "@/utils/maps";

type RouteP = RouteProp<ListsStackParamList, "Route">;

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

interface OptimizedChecklistEntry {
  itemId: string;
  order: number;
}

function normalizeChecklistText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingQueryKey(
  itemKeys: string[],
  routeKeys: string[],
  routeKeySet: Set<string>,
): string | null {
  for (const key of itemKeys) {
    if (routeKeySet.has(key)) {
      return key;
    }
  }

  for (const key of itemKeys) {
    const loose = routeKeys.find(
      (routeKey) => routeKey.includes(key) || key.includes(routeKey),
    );
    if (loose) {
      return loose;
    }
  }

  return null;
}

function buildOptimizedChecklist(
  optimizeResult: OptimizeResponse | null,
  listItems: ShoppingListItem[],
): OptimizedChecklistEntry[] {
  if (!optimizeResult) {
    return [];
  }

  const queryOrder = new Map<string, number>();
  let nextOrder = 0;

  for (const stop of optimizeResult.route) {
    for (const product of stop.products) {
      const key = normalizeChecklistText(product.query_text);
      if (!key) {
        continue;
      }

      if (!queryOrder.has(key)) {
        queryOrder.set(key, nextOrder);
        nextOrder += 1;
      }
    }
  }

  const routeKeys = Array.from(queryOrder.keys());
  const routeKeySet = new Set(routeKeys);
  const checklist: OptimizedChecklistEntry[] = [];

  for (const item of listItems) {
    const keys = [item.normalized_name, item.name, item.product_name]
      .map((value) => normalizeChecklistText(value))
      .filter((value) => value.length > 0);

    if (keys.length === 0) {
      continue;
    }

    const queryKey = findMatchingQueryKey(keys, routeKeys, routeKeySet);
    if (!queryKey) {
      continue;
    }

    checklist.push({
      itemId: item.id,
      order: queryOrder.get(queryKey) ?? Number.MAX_SAFE_INTEGER,
    });
  }

  return checklist.sort(
    (a, b) => a.order - b.order || a.itemId.localeCompare(b.itemId),
  );
}

// ─── Weight Config Modal ───────────────────────────────────────────────────────

interface WeightConfig {
  w_precio: number;
  w_distancia: number;
  w_tiempo: number;
}

function getOptimizerPrefsFromProfile(profile: UserProfile | null): {
  maxDistanceKm: number;
  maxStops: number;
  weights: WeightConfig;
} {
  if (!profile) {
    return {
      maxDistanceKm: 10,
      maxStops: 3,
      weights: {
        w_precio: 50,
        w_distancia: 30,
        w_tiempo: 20,
      },
    };
  }

  return {
    maxDistanceKm: profile.searchRadiusKm ?? profile.max_search_radius_km ?? 10,
    maxStops: profile.maxStops ?? profile.max_stops ?? 3,
    weights: {
      w_precio: profile.weightPrice ?? profile.weight_price ?? 50,
      w_distancia: profile.weightDistance ?? profile.weight_distance ?? 30,
      w_tiempo: profile.weightTime ?? profile.weight_time ?? 20,
    },
  };
}

interface WeightModalProps {
  visible: boolean;
  weights: WeightConfig;
  onApply: (weights: WeightConfig) => void;
  onClose: () => void;
}

const WeightModal: React.FC<WeightModalProps> = ({
  visible,
  weights,
  onApply,
  onClose,
}) => {
  const [local, setLocal] = useState(weights);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={weightStyles.overlay}>
        <View style={weightStyles.card}>
          <View style={weightStyles.accentBar} />
          <Text style={weightStyles.title}>Ajustar optimizador</Text>

          {(["w_precio", "w_distancia", "w_tiempo"] as const).map((key) => {
            const labels: Record<string, string> = {
              w_precio: "Precio",
              w_distancia: "Distancia",
              w_tiempo: "Tiempo",
            };
            return (
              <View key={key} style={weightStyles.row}>
                <Text style={weightStyles.label}>{labels[key]}</Text>
                <Slider
                  style={weightStyles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={local[key]}
                  onValueChange={(v: number) =>
                    setLocal((prev) => ({ ...prev, [key]: v }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
                <Text style={weightStyles.value}>{local[key]}</Text>
              </View>
            );
          })}

          <View style={weightStyles.actions}>
            <TouchableOpacity style={weightStyles.cancelBtn} onPress={onClose}>
              <Text style={weightStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={weightStyles.applyBtn}
              onPress={handleApply}
            >
              <Text style={weightStyles.applyText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Route Stop Row ────────────────────────────────────────────────────────────

const RouteStopRow: React.FC<{
  stop: RouteStop;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  interactionDisabled: boolean;
  onApplySemanticOption: (
    queryText: string,
    option: RouteStopSemanticOption,
  ) => void;
}> = ({
  stop,
  index,
  isSelected,
  onSelect,
  interactionDisabled,
  onApplySemanticOption,
}) => {
  const chainColor = CHAIN_COLORS[stop.chain.toLowerCase()] ?? colors.primary;
  const subtotal = stop.products.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0,
  );
  // Hover (web-only): tinte primario suave al pasar el ratón sobre la parada
  const [hovered, setHovered] = useState(false);

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).springify()}
      style={[stopRowStyles.container, hovered && stopRowStyles.containerHover]}
      // @ts-ignore — onMouseEnter/onMouseLeave son props solo-web (react-native-web)
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore — ver arriba
      onMouseLeave={() => setHovered(false)}
    >
      <TouchableOpacity
        style={stopRowStyles.headerPressable}
        onPress={onSelect}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Ver productos de ${stop.store_name}`}
      >
        <View
          style={[stopRowStyles.dot, { backgroundColor: chainColor }]}
          accessibilityLabel={stop.store_name}
        />
        <View style={stopRowStyles.body}>
          <Text style={stopRowStyles.storeName} numberOfLines={1}>
            {stop.store_name}
          </Text>
          <View style={stopRowStyles.meta}>
            <Text style={stopRowStyles.metaText}>
              {stop.distance_km.toFixed(1)} km
            </Text>
            <Text style={stopRowStyles.metaDot}>·</Text>
            <Text style={stopRowStyles.metaText}>
              ~{Math.round(stop.time_minutes)} min
            </Text>
          </View>
        </View>
        <View style={stopRowStyles.priceCol}>
          {stop.products.length > 0 && (
            <Text style={stopRowStyles.priceText}>{subtotal.toFixed(2)} €</Text>
          )}
          <Ionicons
            name={isSelected ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {isSelected && stop.products.length > 0 ? (
        <View style={stopRowStyles.productsPanel}>
          <Text style={stopRowStyles.productsPanelTitle}>
            Productos en esta tienda
          </Text>
          {stop.products.map((product, productIndex) => {
            const lineTotal = product.price * product.quantity;
            const hasSemanticInfo =
              product.semantic_needs_confirmation ||
              product.semantic_reason.length > 0 ||
              product.semantic_options.length > 0 ||
              product.semantic_hints.length > 0;

            return (
              <View
                key={`${product.matched_product_id}-${productIndex}`}
                style={stopRowStyles.productBlock}
              >
                <View style={stopRowStyles.productLine}>
                  <View style={stopRowStyles.productLineInfo}>
                    <Text
                      style={stopRowStyles.productLineName}
                      numberOfLines={1}
                    >
                      {product.matched_product_name}
                    </Text>
                    <Text style={stopRowStyles.productLineMeta}>
                      {product.quantity} x {product.price.toFixed(2)} €
                    </Text>
                  </View>
                  <Text style={stopRowStyles.productLineTotal}>
                    {lineTotal.toFixed(2)} €
                  </Text>
                </View>

                {hasSemanticInfo ? (
                  <View style={stopRowStyles.semanticCard}>
                    <View style={stopRowStyles.semanticHeader}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color={colors.warning}
                      />
                      <Text style={stopRowStyles.semanticTitle}>
                        {`Posible ambigüedad en "${product.query_text}"`}
                      </Text>
                    </View>

                    {product.semantic_reason.length > 0 ? (
                      <Text style={stopRowStyles.semanticReason}>
                        {product.semantic_reason}
                      </Text>
                    ) : null}

                    {product.semantic_options.length > 0 ? (
                      <View style={stopRowStyles.semanticOptionsWrap}>
                        {product.semantic_options.map((option) => {
                          const optionSubtitle = [option.brand, option.category]
                            .filter((value) => value.length > 0)
                            .join(" · ");

                          return (
                            <TouchableOpacity
                              key={`${product.matched_product_id}-${option.product_id}`}
                              style={stopRowStyles.semanticOptionChip}
                              activeOpacity={0.75}
                              onPress={() =>
                                onApplySemanticOption(
                                  product.query_text,
                                  option,
                                )
                              }
                              disabled={interactionDisabled}
                              accessibilityRole="button"
                              accessibilityLabel={`Usar opción ${option.product_name} y recalcular ruta`}
                            >
                              <Text
                                style={stopRowStyles.semanticOptionName}
                                numberOfLines={1}
                              >
                                {option.product_name}
                              </Text>
                              {optionSubtitle.length > 0 ? (
                                <Text
                                  style={stopRowStyles.semanticOptionMeta}
                                  numberOfLines={1}
                                >
                                  {optionSubtitle}
                                </Text>
                              ) : null}
                              <Text style={stopRowStyles.semanticOptionAction}>
                                {interactionDisabled
                                  ? "Aplicando..."
                                  : "Usar y recalcular"}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}

                    {product.semantic_hints.length > 0 ? (
                      <Text style={stopRowStyles.semanticHint}>
                        Consejo: {product.semantic_hints[0]}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {isSelected && stop.products.length === 0 ? (
        <View style={stopRowStyles.productsPanel}>
          <Text style={stopRowStyles.emptyProductsText}>
            No hay productos asignados a esta parada.
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { listId, listName } = route.params;
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const initialPrefs = getOptimizerPrefsFromProfile(profile);

  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [weights, setWeights] = useState<WeightConfig>(initialPrefs.weights);
  const [maxStops, setMaxStops] = useState(initialPrefs.maxStops);
  const [maxDistanceKm, setMaxDistanceKm] = useState(
    initialPrefs.maxDistanceKm,
  );
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [loadingSavedRoute, setLoadingSavedRoute] = useState(false);
  const [activatingChecklistNotification, setActivatingChecklistNotification] =
    useState(false);
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const applyPersistedRoute = useCallback((saved: OptimizeResponse) => {
    setResult(saved);
    setSelectedStoreId(saved.route[0]?.store_id ?? null);
    setMaxDistanceKm(Math.round(saved.max_distance_km || 10));
    setMaxStops(saved.max_stops || 3);
    setWeights({
      w_precio: Math.round((saved.w_precio || 0.5) * 100),
      w_distancia: Math.round((saved.w_distancia || 0.3) * 100),
      w_tiempo: Math.round((saved.w_tiempo || 0.2) * 100),
    });
    if (saved.user_lat != null && saved.user_lng != null) {
      setOriginCoords({ lat: saved.user_lat, lng: saved.user_lng });
    }
  }, []);

  useEffect(() => {
    const prefs = getOptimizerPrefsFromProfile(profile);
    setWeights(prefs.weights);
    setMaxStops(prefs.maxStops);
    setMaxDistanceKm(prefs.maxDistanceKm);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadScreenData = async () => {
        setLoadingSavedRoute(true);
        const parsedListId = parseInt(listId, 10);

        const [profileResult, routeResult] = await Promise.allSettled([
          authService.getProfile(),
          getLatestOptimizedRoute(parsedListId),
        ]);

        if (!mounted) {
          return;
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        }

        if (routeResult.status === "fulfilled" && routeResult.value) {
          applyPersistedRoute(routeResult.value);
          setError(null);
        }

        setLoadingSavedRoute(false);
      };

      void loadScreenData();
      return () => {
        mounted = false;
      };
    }, [applyPersistedRoute, listId, setProfile]),
  );

  const getCurrentOrFreshOriginCoords = useCallback(async () => {
    if (originCoords) {
      return originCoords;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Ubicación requerida",
        "Activa la ubicación para recalcular la ruta con tu selección.",
      );
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    };
    setOriginCoords(coords);
    return coords;
  }, [originCoords]);

  const runOptimization = useCallback(
    async (coords: { lat: number; lng: number }) => {
      const response = await optimizeRoute({
        shopping_list_id: parseInt(listId, 10),
        lat: coords.lat,
        lng: coords.lng,
        max_distance_km: maxDistanceKm,
        max_stops: maxStops,
        w_precio: weights.w_precio / 100,
        w_distancia: weights.w_distancia / 100,
        w_tiempo: weights.w_tiempo / 100,
      });

      applyPersistedRoute(response);
    },
    [applyPersistedRoute, listId, maxDistanceKm, maxStops, weights],
  );

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);

    try {
      const coords = await getCurrentOrFreshOriginCoords();
      if (!coords) {
        return;
      }

      await runOptimization(coords);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? "";
      if (code === "OPTIMIZER_NO_STORES_IN_RADIUS") {
        setError({
          code: "OPTIMIZER_NO_STORES_IN_RADIUS",
          message:
            "No hay tiendas en tu radio de búsqueda. Prueba ampliando el radio o activa la ubicación.",
        });
      } else {
        setError({
          code: "NETWORK",
          message:
            "No se pudo calcular la ruta. Comprueba tu conexión e inténtalo de nuevo.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplySemanticOption = useCallback(
    async (queryText: string, option: RouteStopSemanticOption) => {
      setLoading(true);
      setError(null);

      try {
        await saveSemanticChoice({
          shopping_list_id: parseInt(listId, 10),
          query_text: queryText,
          product_id: option.product_id,
        });

        const coords = await getCurrentOrFreshOriginCoords();
        if (!coords) {
          return;
        }

        await runOptimization(coords);
        Alert.alert(
          "Preferencia aplicada",
          `Se priorizará ${option.product_name} cuando escribas \"${queryText}\" en esta lista.`,
        );
      } catch (err: any) {
        const message =
          err?.response?.data?.error?.message ??
          "No se pudo aplicar la opción seleccionada. Inténtalo de nuevo.";
        Alert.alert("No se pudo recalcular", message);
      } finally {
        setLoading(false);
      }
    },
    [getCurrentOrFreshOriginCoords, listId, runOptimization],
  );

  const handleActivateChecklistNotification = useCallback(async () => {
    if (!result || result.route.length === 0) {
      Alert.alert(
        "Ruta no disponible",
        "Primero calcula una ruta para generar el checklist dinámico en notificaciones.",
      );
      return;
    }

    setActivatingChecklistNotification(true);
    try {
      const latestList = await listService.getList(listId);
      const optimizedItems = buildOptimizedChecklist(result, latestList.items);

      if (optimizedItems.length === 0) {
        Alert.alert(
          "Sin items optimizados",
          "No hemos encontrado ítems de la lista enlazados a la ruta actual.",
        );
        return;
      }

      const schedule = await scheduleLockscreenChecklist({
        listId,
        listName: latestList.name,
        items: latestList.items,
        orderedItemIds: optimizedItems.map((item) => item.itemId),
      });

      if (!schedule.scheduled && schedule.reason === "permission-denied") {
        Alert.alert(
          "Permiso requerido",
          "Activa las notificaciones para usar el checklist dinámico en el panel.",
        );
        return;
      }

      if (!schedule.scheduled && schedule.reason === "no-pending-items") {
        Alert.alert(
          "Checklist completado",
          "Todos los productos optimizados ya están marcados como comprados.",
        );
        return;
      }

      Alert.alert(
        "Checklist publicado",
        "Ya puedes marcar productos desde el panel de notificaciones.",
      );
    } catch {
      Alert.alert(
        "No se pudo publicar",
        "Inténtalo de nuevo en unos segundos.",
      );
    } finally {
      setActivatingChecklistNotification(false);
    }
  }, [listId, result]);

  const isBusy = loading || loadingSavedRoute;

  const handleOpenRouteInMap = async () => {
    if (!result || result.route.length === 0) {
      Alert.alert("Ruta no disponible", "Primero genera una ruta optimizada.");
      return;
    }

    try {
      let origin = originCoords;
      if (!origin) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Ubicación requerida",
            "Necesitamos tu ubicación para abrir la ruta circular en Google Maps.",
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        origin = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
        setOriginCoords(origin);
      }

      const mapUrl = buildGoogleMapsCircularRouteUrl({
        origin,
        stops: result.route.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        travelMode: "driving",
      });

      if (!mapUrl) {
        Alert.alert(
          "Ruta no disponible",
          "No hay coordenadas válidas para abrir la ruta en Google Maps.",
        );
        return;
      }

      // En Expo Web, `Linking.canOpenURL()` de react-native-web es un stub
      // que SIEMPRE resuelve `true` sin mirar la URL (ver
      // node_modules/react-native-web/dist/exports/Linking/index.js). Eso
      // hacía que el bloque de abajo intentase SIEMPRE primero el esquema
      // nativo `comgooglemaps://` (pensado solo para iOS/Android), que un
      // navegador no sabe abrir y falla en silencio — el botón parecía no
      // hacer nada. En web vamos directos a la URL universal de Google
      // Maps, que sí abre una pestaña nueva en cualquier navegador.
      if (Platform.OS === "web") {
        await Linking.openURL(mapUrl);
        return;
      }

      const googleAppUrl = buildGoogleMapsAppCircularRouteUrl({
        origin,
        stops: result.route.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        travelMode: "driving",
      });

      const appleMapsUrl = buildAppleMapsCircularRouteUrl({
        origin,
        stops: result.route.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        travelMode: "driving",
      });

      if (googleAppUrl && (await Linking.canOpenURL(googleAppUrl))) {
        await Linking.openURL(googleAppUrl);
        return;
      }

      if (Platform.OS === "ios" && appleMapsUrl) {
        await Linking.openURL(appleMapsUrl);
        return;
      }

      await Linking.openURL(mapUrl);
    } catch {
      Alert.alert(
        "No se pudo abrir el mapa",
        "Inténtalo de nuevo en unos segundos.",
      );
    }
  };

  // Exportar ruta a .txt (solo web — D-07): paradas + productos + resumen
  const handleExportRoute = useCallback(() => {
    if (!result) return;
    const lines: string[] = [];
    result.route.forEach((stop, idx) => {
      lines.push(
        `${idx + 1}. ${stop.store_name} (${stop.distance_km.toFixed(1)} km, ~${Math.round(
          stop.time_minutes,
        )} min)`,
      );
      stop.products.forEach((p) => {
        lines.push(`   - ${p.quantity}x ${p.query_text}`);
      });
    });
    lines.push("");
    lines.push(`Precio total: ${result.total_price.toFixed(2)} €`);
    lines.push(`Distancia total: ${result.total_distance_km.toFixed(1)} km`);
    lines.push(
      `Tiempo estimado: ${Math.round(result.estimated_time_minutes)} min`,
    );
    downloadFile(
      lines.join("\n"),
      `bargain-ruta-${todayStamp()}.txt`,
      "text/plain;charset=utf-8;",
    );
  }, [result]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Ruta optimizada</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {listName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Configuración de preferencias */}
        <TouchableOpacity
          style={styles.prefRow}
          onPress={() => setShowWeightModal(true)}
          activeOpacity={0.7}
          accessibilityLabel="Ajustar preferencias de optimización"
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={styles.prefHint}>
            Radio {maxDistanceKm} km · Precio {weights.w_precio} · Distancia{" "}
            {weights.w_distancia} · Tiempo {weights.w_tiempo}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Max stops selector */}
        <View style={styles.stopsRow}>
          <Text style={styles.stopsLabel}>Paradas máximas</Text>
          <View style={styles.stopsSegmented}>
            {[2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.stopsOption,
                  maxStops === n && styles.stopsOptionActive,
                ]}
                onPress={() => setMaxStops(n)}
              >
                <Text
                  style={[
                    styles.stopsOptionText,
                    maxStops === n && styles.stopsOptionTextActive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTA principal */}
        <TouchableOpacity
          style={[styles.ctaBtn, isBusy && styles.ctaBtnDisabled]}
          onPress={handleOptimize}
          disabled={isBusy}
          accessibilityLabel={result ? "Recalcular ruta" : "Optimizar ruta"}
        >
          {isBusy ? (
            <Text style={styles.ctaText}>
              {loadingSavedRoute
                ? "Cargando ruta guardada..."
                : "Calculando la mejor ruta..."}
            </Text>
          ) : (
            <>
              <Ionicons
                name={result ? "refresh" : "navigate"}
                size={20}
                color={colors.white}
              />
              <Text style={styles.ctaText}>
                {result ? "Recalcular ruta" : "Optimizar ruta"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Loading skeletons */}
        {isBusy && (
          <View style={styles.skeletonContainer}>
            <SkeletonBox width="100%" height={56} borderRadius={12} />
            <SkeletonBox width="100%" height={56} borderRadius={12} />
            <SkeletonBox width="100%" height={56} borderRadius={12} />
          </View>
        )}

        {/* Error state */}
        {!isBusy && error && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.errorCard}
          >
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={colors.error}
            />
            <Text style={styles.errorText}>{error.message}</Text>
            {error.code === "OPTIMIZER_NO_STORES_IN_RADIUS" && (
              <TouchableOpacity
                style={styles.errorCta}
                onPress={() => {
                  setMaxDistanceKm((prev) => Math.min(50, prev + 5));
                  Alert.alert(
                    "Ampliar radio",
                    `Se ha ampliado el radio a ${Math.min(50, maxDistanceKm + 5)} km para el siguiente intento.`,
                    [{ text: "Entendido" }],
                  );
                }}
              >
                <Text style={styles.errorCtaText}>Ampliar radio</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Empty state */}
        {!isBusy && !error && !result && (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              No tienes ninguna ruta calculada
            </Text>
            <Text style={styles.emptyBody}>
              Abre una lista de la compra y pulsa «Optimizar ruta» para
              encontrar la mejor combinación de tiendas.
            </Text>
          </View>
        )}

        {/* Result: hero card + stops */}
        {!isBusy && result && (
          <Animated.View entering={FadeInDown.springify()}>
            {(() => {
              // Hero price card
              const heroCard = (
                <View style={styles.heroCard}>
                  <Text style={styles.heroPriceLabel}>
                    Precio total estimado
                  </Text>
                  <Text style={styles.heroPrice}>
                    {result.total_price.toFixed(2)} €
                  </Text>
                  <View style={styles.heroMeta}>
                    <View style={styles.heroMetaItem}>
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.heroMetaText}>
                        {result.total_distance_km.toFixed(1)} km
                      </Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.heroMetaText}>
                        ~{Math.round(result.estimated_time_minutes)} min
                      </Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                      <Ionicons
                        name="storefront-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.heroMetaText}>
                        {result.route.length} paradas
                      </Text>
                    </View>
                  </View>
                </View>
              );

              // Stop list
              const stopsList = (
                <>
                  <Text style={styles.sectionTitle}>Paradas de la ruta</Text>
                  {result.route.map((stop, idx) => (
                    <RouteStopRow
                      key={stop.store_id}
                      stop={stop}
                      index={idx}
                      isSelected={selectedStoreId === stop.store_id}
                      interactionDisabled={isBusy}
                      onSelect={() =>
                        setSelectedStoreId((prev) =>
                          prev === stop.store_id ? null : stop.store_id,
                        )
                      }
                      onApplySemanticOption={handleApplySemanticOption}
                    />
                  ))}
                </>
              );

              // Action buttons (incl. exportar ruta en web)
              const actions = (
                <>
                  <TouchableOpacity
                    style={[
                      styles.lockscreenBtn,
                      (activatingChecklistNotification || isBusy) &&
                        styles.lockscreenBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void handleActivateChecklistNotification();
                    }}
                    disabled={activatingChecklistNotification || isBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Publicar checklist dinámico en notificaciones"
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.lockscreenBtnText}>
                      {activatingChecklistNotification
                        ? "Publicando checklist..."
                        : "Checklist dinámico en notificaciones"}
                    </Text>
                  </TouchableOpacity>

                  {/* "Ver en mapa" secondary button */}
                  <TouchableOpacity
                    style={styles.mapBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      void handleOpenRouteInMap();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir ruta circular en Google Maps"
                  >
                    <Ionicons
                      name="map-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.mapBtnText}>Ver en mapa</Text>
                  </TouchableOpacity>

                  {/* Exportar ruta (.txt) — solo web (D-07) */}
                  {Platform.OS === "web" && (
                    <TouchableOpacity
                      style={styles.mapBtn}
                      activeOpacity={0.7}
                      onPress={handleExportRoute}
                      accessibilityRole="button"
                      accessibilityLabel="Exportar ruta"
                    >
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.mapBtnText}>Exportar ruta</Text>
                    </TouchableOpacity>
                  )}
                </>
              );

              // Desktop: dos columnas (paradas izquierda, resumen+acciones derecha)
              return isDesktop ? (
                <View style={styles.resultRow}>
                  <View style={styles.resultLeft}>{stopsList}</View>
                  <View style={styles.resultRight}>
                    {heroCard}
                    {actions}
                  </View>
                </View>
              ) : (
                <>
                  {heroCard}
                  {stopsList}
                  {actions}
                </>
              );
            })()}
          </Animated.View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Weight config modal */}
      <WeightModal
        visible={showWeightModal}
        weights={weights}
        onApply={setWeights}
        onClose={() => setShowWeightModal(false)}
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
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Dos columnas en desktop: paradas (izquierda) + resumen/acciones (derecha)
  resultRow: {
    flexDirection: "row",
    gap: spacing.xl,
    alignItems: "flex-start",
  },
  resultLeft: {
    flex: 1,
  },
  // 360px: ancho de la columna de resumen en desktop (planner discretion sizing)
  resultRight: {
    width: 360,
    gap: spacing.md,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  prefText: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  prefHint: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  stopsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  stopsLabel: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  stopsSegmented: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  stopsOption: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceVariant,
  },
  stopsOptionActive: {
    backgroundColor: colors.primary,
  },
  stopsOptionText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  stopsOptionTextActive: {
    color: colors.white,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  ctaBtnDisabled: {
    backgroundColor: colors.primaryDark,
    opacity: 0.8,
  },
  ctaText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.white,
  },
  skeletonContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  errorText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
  },
  errorCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  errorCtaText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  heroPriceLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  heroPrice: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    color: colors.primary,
  },
  heroMeta: {
    flexDirection: "row",
    gap: spacing.md,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroMetaText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  mapBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  recalculateBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  recalculateBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  lockscreenBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  lockscreenBtnDisabled: {
    opacity: 0.7,
  },
  lockscreenBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

const stopRowStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    ...shadows.card,
  },
  containerHover: {
    backgroundColor: colors.primaryTint,
  },
  headerPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  metaDot: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  priceCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  priceText: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  productsPanel: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.xs,
  },
  productsPanelTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  productBlock: {
    gap: spacing.xs,
  },
  productLineInfo: {
    flex: 1,
    gap: 2,
  },
  productLineName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  productLineMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  productLineTotal: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  semanticCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  semanticHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  semanticTitle: {
    flex: 1,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  semanticReason: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 16,
  },
  semanticOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  semanticOptionChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  semanticOptionName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  semanticOptionMeta: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  semanticOptionAction: {
    marginTop: 2,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    color: colors.primary,
  },
  semanticHint: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
  emptyProductsText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

const weightStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.elevated,
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    width: 72,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  value: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    width: 32,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    margin: spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  applyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  applyText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
});
