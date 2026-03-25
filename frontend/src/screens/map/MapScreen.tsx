/**
 * Pantalla del mapa de tiendas.
 *
 * Muestra un mapa interactivo con tiendas cercanas usando react-native-maps
 * y la ubicación real del dispositivo (expo-location).
 *
 * Flujo:
 *  1. Solicitar permiso de ubicación en primer plano.
 *  2. Si denegado: mostrar tarjeta de aviso con enlace a Configuración.
 *  3. Si concedido: obtener coordenadas y llamar a storeService.getNearby().
 *  4. Renderizar MapView con Marker por cada tienda.
 *  5. Panel inferior con lista horizontal de tarjetas de tienda.
 *  6. Barra de autocompletado Google Places (solo nativo, solo si API key presente).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Callout, Marker, type Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
  textStyles,
} from "@/theme";
import { storeService } from "@/api/storeService";
import type { MapStackParamList } from "@/navigation/types";
import type { PlacesPrediction, Store, StoreChain } from "@/types/domain";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Coordenadas de Sevilla centro como fallback en __DEV__ */
const SEVILLE_COORDS = { lat: 37.3886, lng: -5.9823 };
const EARTH_RADIUS_KM = 6371;


const CHAIN_COLORS: Record<StoreChain, string> = {
  mercadona: colors.chains.mercadona,
  lidl: colors.chains.lidl,
  aldi: colors.chains.aldi,
  carrefour: colors.chains.carrefour,
  dia: colors.chains.dia,
  alcampo: colors.chains.alcampo,
  local: colors.chains.local,
};

const CHAIN_INITIALS: Record<StoreChain, string> = {
  mercadona: "M",
  lidl: "L",
  aldi: "A",
  carrefour: "C",
  dia: "D",
  alcampo: "Al",
  local: "◎",
};

const CHAIN_LABELS: Record<StoreChain, string> = {
  mercadona: "Mercadona",
  lidl: "Lidl",
  aldi: "Aldi",
  carrefour: "Carrefour",
  dia: "Dia",
  alcampo: "Alcampo",
  local: "Comercio local",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlacesMarker {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type MarkerRef = React.ComponentRef<typeof Marker>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae lat/lng de un Store con campo location GeoJSON o con distanceKm como fallback */
function getStoreCoords(
  store: Store,
  userLat: number,
  userLng: number,
): { latitude: number; longitude: number } {
  if (store.location?.coordinates) {
    const [lng, lat] = store.location.coordinates;
    return { latitude: lat, longitude: lng };
  }
  // Si el backend no devuelve location, usar coordenadas de usuario + offset trivial
  return {
    latitude: userLat + (Math.random() - 0.5) * 0.01,
    longitude: userLng + (Math.random() - 0.5) * 0.01,
  };
}

function haversineDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildGoogleMapsPlaceUrl(marker: PlacesMarker): string {
  return `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}&query_place_id=${marker.placeId}`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const LocationDeniedCard: React.FC = () => (
  <View style={deniedStyles.container}>
    <Ionicons
      name="location-outline"
      size={48}
      color={colors.textMuted}
      style={deniedStyles.icon}
    />
    <Text style={deniedStyles.title}>Ubícate en el mapa</Text>
    <Text style={deniedStyles.subtitle}>
      Activa la ubicación para ver tiendas cercanas
    </Text>
    <TouchableOpacity
      style={deniedStyles.button}
      onPress={() => Linking.openSettings()}
      activeOpacity={0.8}
    >
      <Text style={deniedStyles.buttonText}>Abrir configuración</Text>
    </TouchableOpacity>
  </View>
);

interface StoreCardProps {
  store: Store;
  onPress: (store: Store) => void;
  isSelected?: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onPress,
  isSelected,
}) => {
  const chainColor = CHAIN_COLORS[store.chain];
  const initial = CHAIN_INITIALS[store.chain];

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        shadows.card,
        isSelected && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onPress={() => onPress(store)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${store.name}, a ${store.distanceKm} kilómetros`}
    >
      <View style={[cardStyles.logo, { backgroundColor: chainColor + "18" }]}>
        <Text style={[cardStyles.logoText, { color: chainColor }]}>
          {initial}
        </Text>
      </View>
      <Text style={cardStyles.storeName} numberOfLines={2}>
        {store.name}
      </Text>
      <Text style={cardStyles.distanceText}>
        {store.distanceKm < 1
          ? `${Math.round(store.distanceKm * 1000)} m`
          : `${store.distanceKm.toFixed(1)} km`}
      </Text>
      <Text style={cardStyles.timeText}>≈ {store.estimatedMinutes} min</Text>
      <View
        style={[
          cardStyles.statusDot,
          !store.isOpen && cardStyles.statusDotClosed,
        ]}
      />
    </TouchableOpacity>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const MapScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MapStackParamList, "Map">>();
  const mapRef = useRef<MapView>(null);
  const storeMarkerRefs = useRef<Record<string, MarkerRef | null>>({});
  const placesMarkerRefs = useRef<Record<string, MarkerRef | null>>({});
  const insets = useSafeAreaInsets();

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [userLat, setUserLat] = useState<number>(SEVILLE_COORDS.lat);
  const [userLng, setUserLng] = useState<number>(SEVILLE_COORDS.lng);
  const [stores, setStores] = useState<Store[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // ── Google Places autocomplete + discovery markers state ─────────────────
  const [placesMarkers, setPlacesMarkers] = useState<PlacesMarker[]>([]);
  const [, setSelectedPlacesMarker] = useState<PlacesMarker | null>(null);
  const [placesSearchText, setPlacesSearchText] = useState("");
  const [placesPredictions, setPlacesPredictions] = useState<PlacesPrediction[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSelectedPlacesMarker = useCallback(() => {
    setSelectedPlacesMarker((current) => {
      if (current) {
        placesMarkerRefs.current[current.placeId]?.hideCallout?.();
      }
      return null;
    });
  }, []);

  const showPlacesMarkerCallout = useCallback((placeId: string, delayMs = 0) => {
    setTimeout(() => {
      placesMarkerRefs.current[placeId]?.showCallout?.();
    }, delayMs);
  }, []);

  const showStoreMarkerCallout = useCallback((storeId: string, delayMs = 0) => {
    setTimeout(() => {
      storeMarkerRefs.current[storeId]?.showCallout?.();
    }, delayMs);
  }, []);

  // ── Panel animation ──────────────────────────────────────────────────────
  const PANEL_ANIM_MAX_HEIGHT = 200;
  const panelAnim = useRef(new Animated.Value(1)).current;
  const panelExpandedRef = useRef(true);
  const panelCurrentValueRef = useRef(1);
  const panelBaseValueRef = useRef(1);
  const panelGestureOffsetRef = useRef(0);
  const togglePanelRef = useRef((_expanded: boolean) => {});

  const togglePanelAnimated = useCallback(
    (toExpanded: boolean) => {
      panelExpandedRef.current = toExpanded;
      Animated.spring(panelAnim, {
        toValue: toExpanded ? 1 : 0,
        useNativeDriver: false,
        damping: 26,
        stiffness: 300,
        mass: 0.6,
      }).start();
    },
    [panelAnim],
  );

  useEffect(() => {
    togglePanelRef.current = togglePanelAnimated;
  }, [togglePanelAnimated]);

  useEffect(() => {
    const id = panelAnim.addListener(({ value }) => {
      panelCurrentValueRef.current = value;
    });
    return () => panelAnim.removeListener(id);
  }, [panelAnim]);

  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        panelAnim.stopAnimation();
        panelBaseValueRef.current = panelCurrentValueRef.current;
        panelGestureOffsetRef.current = gs.dy;
      },
      onPanResponderMove: (_, gs) => {
        const adjustedDy = gs.dy - panelGestureOffsetRef.current;
        const newVal = Math.max(
          0,
          Math.min(
            1,
            panelBaseValueRef.current - adjustedDy / PANEL_ANIM_MAX_HEIGHT,
          ),
        );
        panelAnim.setValue(newVal);
      },
      onPanResponderRelease: (_, gs) => {
        const currentVal = panelCurrentValueRef.current;
        let shouldExpand: boolean;
        if (Math.abs(gs.vy) > 0.4) {
          shouldExpand = gs.vy < 0;
        } else {
          shouldExpand = currentVal > 0.5;
        }
        togglePanelRef.current(shouldExpand);
      },
      onPanResponderTerminate: () => {
        togglePanelRef.current(panelCurrentValueRef.current > 0.5);
      },
    }),
  ).current;

  const panelContentMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });
  const panelContentOpacity = panelAnim;

  // ── Solicitar permiso y obtener ubicación ────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function requestLocationAndFetch() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (cancelled) return;

      if (status !== "granted") {
        setPermissionGranted(false);
        return;
      }

      setPermissionGranted(true);

      let lat = SEVILLE_COORDS.lat;
      let lng = SEVILLE_COORDS.lng;

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // En __DEV__, usar coords de Sevilla como fallback
        if (!__DEV__) {
          // En producción, propagar el error de forma controlada
          console.warn(
            "[MapScreen] No se pudo obtener ubicación del dispositivo",
          );
        }
      }

      if (cancelled) return;

      setUserLat(lat);
      setUserLng(lng);

      // Cargar tiendas cercanas
      setIsFetchingStores(true);
      try {
        const nearbyStores = await storeService.getNearby(lat, lng, 10);
        if (!cancelled) {
          setStores(nearbyStores);
        }
      } catch (err) {
        console.warn("[MapScreen] Error al cargar tiendas:", err);
      } finally {
        if (!cancelled) {
          setIsFetchingStores(false);
        }
      }
    }

    requestLocationAndFetch();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Navegar al mapa cuando se pulsa una tarjeta ──────────────────────────

  const handleStoreCardPress = useCallback(
    (store: Store) => {
      clearSelectedPlacesMarker();
      setSelectedStore(store);
      const { latitude, longitude } = getStoreCoords(store, userLat, userLng);
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(region, 500);
    },
    [clearSelectedPlacesMarker, userLat, userLng],
  );

  const handleSearchAreaPress = useCallback(async () => {
    if (!mapRef.current) {
      return;
    }

    setIsFetchingStores(true);

    try {
      const [camera, boundaries] = await Promise.all([
        mapRef.current.getCamera(),
        mapRef.current.getMapBoundaries(),
      ]);

      const center = camera.center;
      const northEast = boundaries.northEast;

      const viewportRadiusKm = haversineDistanceKm(
        center.latitude,
        center.longitude,
        northEast.latitude,
        northEast.longitude,
      );

      // Ajuste defensivo para evitar radios demasiado pequeños o demasiado costosos.
      const searchRadiusKm = Math.min(Math.max(viewportRadiusKm, 2), 30);
      const nearby = await storeService.getNearby(
        center.latitude,
        center.longitude,
        searchRadiusKm,
      );

      setStores(nearby);
      setSelectedStore(null);
    } catch (err) {
      console.warn("Error fetching stores in map area:", err);
    } finally {
      setIsFetchingStores(false);
    }
  }, []);

  // ── Google Places autocomplete handlers ──────────────────────────────────

  const handleSearchChange = useCallback(
    (text: string) => {
      setPlacesSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length < 2) {
        setPlacesPredictions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const results = await storeService.placesAutocomplete(text.trim(), userLat, userLng);
        setPlacesPredictions(results);
      }, 350);
    },
    [userLat, userLng],
  );

  const handlePredictionSelect = useCallback(
    async (prediction: PlacesPrediction) => {
      // Dismiss keyboard immediately so the full map is visible when the marker appears.
      // Without this, the grey pin appears behind the keyboard and MapView.onPress
      // (triggered by the keyboard-dismiss tap) clears selectedPlacesMarker.
      Keyboard.dismiss();
      setPlacesSearchText("");
      setPlacesPredictions([]);
      setIsSearchFocused(false);
      setIsResolvingPlace(true);

      const resolved = await storeService.placesResolve(prediction.place_id);
      setIsResolvingPlace(false);
      if (!resolved) return;

      const { lat, lng: lngVal } = resolved;

      // ── Matching strategy (3 tiers) ──────────────────────────────
      // 1. Backend match: places-resolve returns matched_store_id if DB has this google_place_id
      // 2. Local match by google_place_id: frontend stores already loaded
      // 3. Fallback: haversine proximity < 200m
      let matchingStore: Store | undefined;

      if (resolved.matched_store_id) {
        matchingStore = stores.find((s) => s.id === resolved.matched_store_id);
      }

      if (!matchingStore) {
        matchingStore = stores.find(
          (s) => s.googlePlaceId && s.googlePlaceId === prediction.place_id,
        );
      }

      // Tier 3: Haversine fallback — only for known chains.
      // Stores without google_place_id need this to match by proximity.
      // Gated on chain name to avoid false positives (e.g. matching a
      // Mercadona 150m away when the user actually searched for a McDonald's).
      if (!matchingStore) {
        const nameLC = (resolved.name ?? "").toLowerCase();
        const isKnownChain = ["mercadona", "lidl", "carrefour", "aldi", "dia", "alcampo"].some(
          (c) => nameLC.includes(c),
        );
        if (isKnownChain) {
          matchingStore = stores.find((store) => {
            if (!store.location?.coordinates) return false;
            const [sLng, sLat] = store.location.coordinates;
            return haversineDistanceKm(lat, lngVal, sLat, sLng) < 0.2;
          });
        }
      }

      if (matchingStore) {
        clearSelectedPlacesMarker();
        setSelectedStore(matchingStore);
        // Use Google's coordinates (more accurate than DB seed coords)
        mapRef.current?.animateToRegion(
          { latitude: lat, longitude: lngVal, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          500,
        );
        showStoreMarkerCallout(String(matchingStore.id), 550);
      } else {
        const marker: PlacesMarker = {
          placeId: resolved.place_id,
          name: resolved.name,
          address: resolved.address,
          lat,
          lng: lngVal,
        };
        setPlacesMarkers((prev) =>
          prev.some((m) => m.placeId === marker.placeId) ? prev : [...prev, marker],
        );
        setSelectedPlacesMarker(marker);
        mapRef.current?.animateToRegion(
          { latitude: lat, longitude: lngVal, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          500,
        );
        showPlacesMarkerCallout(marker.placeId, 550);
      }
    },
    [clearSelectedPlacesMarker, showPlacesMarkerCallout, showStoreMarkerCallout, stores],
  );

  const handleOpenGoogleMaps = useCallback(() => {
    const q = placesSearchText.trim() || "supermercado";
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&center=${userLat},${userLng}`;
    Linking.openURL(url).catch(() => {});
  }, [userLat, userLng, placesSearchText]);

  // ── Renderizado ──────────────────────────────────────────────────────────

  // Permiso aún no resuelto
  if (permissionGranted === null) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Obteniendo ubicación…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permiso denegado
  if (permissionGranted === false) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LocationDeniedCard />
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* ── Mapa ──────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={() => {
          setSelectedStore(null);
          clearSelectedPlacesMarker();
        }}
        onRegionChange={() => {
          if (panelExpandedRef.current) {
            togglePanelRef.current(false);
          }
        }}
      >
        {stores.map((store) => {
          const { latitude, longitude } = getStoreCoords(
            store,
            userLat,
            userLng,
          );
          const storeDistanceLabel =
            store.distanceKm < 1
              ? `${Math.round(store.distanceKm * 1000)} m`
              : `${store.distanceKm.toFixed(1)} km`;
          const calloutDescription = `${CHAIN_LABELS[store.chain]} · ${storeDistanceLabel} · ${
            store.isOpen ? "Abierto ahora" : "Cerrado"
          }`;
          return (
            <Marker
              key={store.id}
              ref={(ref) => {
                storeMarkerRefs.current[String(store.id)] = ref;
              }}
              coordinate={{ latitude, longitude }}
              title={store.name}
              description={calloutDescription}
              pinColor={CHAIN_COLORS[store.chain]}
              onPress={() => {
                clearSelectedPlacesMarker();
                setSelectedStore(store);
              }}
            >
              <Callout
                tooltip={false}
                onPress={() =>
                  navigation.navigate("StoreProfile", {
                    storeId: store.id,
                    storeName: store.name,
                    userLat,
                    userLng,
                  })
                }
              >
                <View style={styles.markerCalloutContent}>
                  <Text style={styles.markerCalloutTitle}>{store.name}</Text>
                  <Text style={styles.markerCalloutMeta}>
                    {calloutDescription}
                  </Text>
                  {store.address ? (
                    <Text style={styles.markerCalloutAddress} numberOfLines={2}>
                      {store.address}
                    </Text>
                  ) : null}
                  <Text style={styles.markerCalloutAction}>
                    Pulsa para ver perfil
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* ── Discovery markers (grey pins from Places search) ──── */}
        {placesMarkers.map((marker) => (
          <Marker
            key={marker.placeId}
            ref={(ref) => {
              placesMarkerRefs.current[marker.placeId] = ref;
            }}
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            pinColor="#9CA3AF"
            title={marker.name}
            description={marker.address}
            onPress={() => {
              setSelectedPlacesMarker(marker);
              setSelectedStore(null);
            }}
          >
            <Callout
              tooltip={false}
              onPress={() => {
                Linking.openURL(buildGoogleMapsPlaceUrl(marker)).catch(() => {});
              }}
            >
              <View style={styles.markerCalloutContent}>
                <Text style={styles.markerCalloutTitle}>{marker.name}</Text>
                <Text style={styles.markerCalloutMeta}>Tienda no disponible en BargAIn</Text>
                <Text style={styles.markerCalloutAddress} numberOfLines={2}>
                  {marker.address}
                </Text>
                <View style={styles.markerCalloutButton}>
                  <Ionicons
                    name="logo-google"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.markerCalloutAction}>
                    Ver en Google Maps
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* ── Google Places autocomplete bar (backend proxy) ──────── */}
      <View style={[styles.autocompleteContainer, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {/* Search input */}
        <View style={styles.autocompleteInputRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.autocompleteInput}
            placeholder="Buscar supermercado..."
            placeholderTextColor={colors.textMuted}
            value={placesSearchText}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
          />
          {placesSearchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setPlacesSearchText("");
                setPlacesPredictions([]);
                setIsSearchFocused(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleOpenGoogleMaps}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Buscar en Google Maps"
          >
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Predictions dropdown */}
        {isSearchFocused && placesPredictions.length > 0 && (
          <View style={styles.predictionsDropdown}>
            {placesPredictions.map((p) => (
              <TouchableOpacity
                key={p.place_id}
                style={styles.predictionRow}
                onPress={() => handlePredictionSelect(p)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.predictionMain} numberOfLines={1}>
                    {p.structured.main_text}
                  </Text>
                  {p.structured.secondary_text ? (
                    <Text style={styles.predictionSecondary} numberOfLines={1}>
                      {p.structured.secondary_text}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            {/* Escape hatch */}
            <TouchableOpacity
              style={styles.predictionRow}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={[styles.predictionMain, { color: colors.primary }]}>
                Buscar en Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isResolvingPlace && (
          <View style={styles.resolvingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {/* ── Botón: Buscar en esta zona ────────────────────────── */}
      <TouchableOpacity
        style={[styles.searchAreaButton, shadows.elevated]}
        onPress={handleSearchAreaPress}
        activeOpacity={0.9}
      >
        <Ionicons name="refresh" size={18} color={colors.primary} />
        <Text style={styles.searchAreaText}>Buscar en esta zona</Text>
      </TouchableOpacity>

      {/* ── Overlay de carga sobre el mapa ────────────────────────── */}
      {isFetchingStores && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.mapLoadingText}>Cargando tiendas…</Text>
        </View>
      )}

      {/* ── Info card for selected Places discovery marker ────────── */}

      {/* ── Panel inferior: lista horizontal de tiendas ───────────── */}
      <View style={styles.bottomPanel}>
        <View
          style={styles.panelHandleButton}
          {...panelPanResponder.panHandlers}
        >
          <View style={styles.panelHandleGrip} />
          <View style={styles.panelHandleMeta}>
            <Text style={styles.panelTitle}>
              {stores.length} tienda{stores.length !== 1 ? "s" : ""} en esta
              zona
            </Text>
          </View>
        </View>

        <Animated.View
          style={{
            maxHeight: panelContentMaxHeight,
            opacity: panelContentOpacity,
            overflow: "hidden",
          }}
        >
          {stores.length > 0 ? (
            <>
              {selectedStore && (
                <TouchableOpacity
                  style={styles.storeProfileButton}
                  onPress={() =>
                    navigation.navigate("StoreProfile", {
                      storeId: selectedStore.id,
                      storeName: selectedStore.name,
                      userLat,
                      userLng,
                    })
                  }
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.storeProfileButtonText}>
                    Ver perfil de tienda
                  </Text>
                </TouchableOpacity>
              )}
              <FlatList
                data={stores}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <StoreCard
                    store={item}
                    onPress={handleStoreCardPress}
                    isSelected={selectedStore?.id === item.id}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storeListContent}
              />
            </>
          ) : !isFetchingStores ? (
            <View style={styles.emptyStores}>
              <Text style={styles.emptyStoresText}>
                No se encontraron tiendas en el area visible del mapa
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  mapLoadingOverlay: {
    position: "absolute",
    top: spacing.lg,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.elevated,
  },
  mapLoadingText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  // ── Autocomplete bar ──────────────────────────────────────────────────────
  autocompleteContainer: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  autocompleteInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.elevated,
  },
  autocompleteInput: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  predictionsDropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: "hidden",
    ...shadows.elevated,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  predictionMain: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  predictionSecondary: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  resolvingIndicator: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  // ── Botón de zona ─────────────────────────────────────────────────────────
  searchAreaButton: {
    position: "absolute",
    top: 140,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchAreaText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  // ── Places info card (discovery markers) ──────────────────────────────────
  // ── Panel inferior ────────────────────────────────────────────────────────
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    ...shadows.elevated,
  },
  panelHandleButton: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  panelHandleGrip: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  panelHandleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  markerCalloutContent: {
    maxWidth: 240,
    padding: spacing.xs,
  },
  markerCalloutTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  markerCalloutMeta: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  markerCalloutAddress: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  markerCalloutButton: {
    marginTop: spacing.sm,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  markerCalloutAction: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: "center",
  },
  storeProfileButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  storeProfileButtonText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  storeListContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  emptyStores: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyStoresText: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const deniedStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.heading3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    ...textStyles.button,
    color: colors.white,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: 150,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    position: "relative",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  logoText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSize.lg,
  },
  storeName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 17,
    marginBottom: 4,
  },
  distanceText: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.md,
    color: colors.primary,
    lineHeight: 17,
  },
  timeText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 15,
  },
  statusDot: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusDotClosed: {
    backgroundColor: colors.textDisabled,
  },
});
