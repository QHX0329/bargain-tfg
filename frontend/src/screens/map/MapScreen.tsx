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
  Linking,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Callout, Marker, type Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  GooglePlacesAutocomplete,
  type GooglePlaceData,
  type GooglePlaceDetail,
} from "react-native-google-places-autocomplete";

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
import type { Store, StoreChain } from "@/types/domain";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Coordenadas de Sevilla centro como fallback en __DEV__ */
const SEVILLE_COORDS = { lat: 37.3886, lng: -5.9823 };
const EARTH_RADIUS_KM = 6371;

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
const placesEnabled = PLACES_KEY.length > 0;

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

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [userLat, setUserLat] = useState<number>(SEVILLE_COORDS.lat);
  const [userLng, setUserLng] = useState<number>(SEVILLE_COORDS.lng);
  const [stores, setStores] = useState<Store[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // ── Google Places discovery markers state ────────────────────────────────
  const [placesMarkers, setPlacesMarkers] = useState<PlacesMarker[]>([]);
  const [selectedPlacesMarker, setSelectedPlacesMarker] =
    useState<PlacesMarker | null>(null);

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
    [userLat, userLng],
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

  // ── Google Places autocomplete handler ───────────────────────────────────

  const handlePlacesSelect = useCallback(
    (data: GooglePlaceData, details: GooglePlaceDetail | null) => {
      if (!details) return;

      const lat = details.geometry.location.lat;
      const lng = details.geometry.location.lng;
      const placeId = data.place_id;

      // Check if any DB store is within 50m of selected coordinates
      const matchingStore = stores.find((store) => {
        if (!store.location?.coordinates) return false;
        const [storeLng, storeLat] = store.location.coordinates;
        return haversineDistanceKm(lat, lng, storeLat, storeLng) < 0.05;
      });

      if (matchingStore) {
        // DB match: pan map and select the existing store marker
        setSelectedStore(matchingStore);
        const { latitude, longitude } = getStoreCoords(
          matchingStore,
          userLat,
          userLng,
        );
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          500,
        );
      } else {
        // No DB match: add a grey discovery marker
        const name = details.name ?? data.description;
        const address = details.formatted_address ?? data.description;
        const existing = placesMarkers.findIndex((m) => m.placeId === placeId);
        if (existing === -1) {
          setPlacesMarkers((prev) => [
            ...prev,
            { placeId, name, address, lat, lng },
          ]);
        }
        setSelectedPlacesMarker({ placeId, name, address, lat, lng });
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }
    },
    [stores, placesMarkers, userLat, userLng],
  );

  const handleOpenGoogleMaps = useCallback(() => {
    const url = `https://www.google.com/maps/search/?api=1&query=supermercado&center=${userLat},${userLng}`;
    Linking.openURL(url).catch(() => {});
  }, [userLat, userLng]);

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
          setSelectedPlacesMarker(null);
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
              coordinate={{ latitude, longitude }}
              title={store.name}
              description={calloutDescription}
              pinColor={CHAIN_COLORS[store.chain]}
              onPress={() => setSelectedStore && setSelectedStore(store)}
            >
              <Callout tooltip={false}>
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
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* ── Discovery markers (grey pins from Places search) ──── */}
        {placesMarkers.map((marker) => (
          <Marker
            key={marker.placeId}
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            pinColor="#9CA3AF"
            title={marker.name}
            onPress={() => {
              setSelectedPlacesMarker(marker);
              setSelectedStore(null);
            }}
          />
        ))}
      </MapView>

      {/* ── Google Places autocomplete bar ────────────────────────── */}
      {placesEnabled ? (
        <View style={styles.autocompleteContainer} pointerEvents="box-none">
          <GooglePlacesAutocomplete
            placeholder="Buscar supermercado..."
            fetchDetails={true}
            query={{ key: PLACES_KEY, language: "es", types: "establishment" }}
            onPress={handlePlacesSelect}
            enablePoweredByContainer={false}
            keyboardShouldPersistTaps="handled"
            styles={{
              container: {
                flex: 0,
              },
              textInputContainer: {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.sm,
                ...shadows.elevated,
              },
              textInput: {
                fontFamily: fontFamilies.body,
                fontSize: fontSize.md,
                color: colors.text,
                backgroundColor: "transparent",
                borderRadius: borderRadius.pill,
              },
              listView: {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.md,
                marginTop: spacing.xs,
                ...shadows.elevated,
              },
              row: {
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
              description: {
                fontFamily: fontFamilies.body,
                fontSize: fontSize.md,
                color: colors.text,
              },
              separator: {
                backgroundColor: colors.border,
                height: StyleSheet.hairlineWidth,
              },
            }}
            renderRightButton={() => (
              <TouchableOpacity
                style={styles.googleMapsButton}
                onPress={handleOpenGoogleMaps}
                accessibilityLabel="Buscar en Google Maps"
              >
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.googleMapsEscapeButton}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={14} color={colors.primary} />
            <Text style={styles.googleMapsEscapeText}>
              Buscar en Google Maps
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.autocompleteDisabled} pointerEvents="none">
          <Ionicons name="search" size={16} color={colors.textDisabled} />
          <Text style={styles.autocompleteDisabledText}>
            Busqueda avanzada no disponible
          </Text>
        </View>
      )}

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
      {selectedPlacesMarker && (
        <View style={[styles.placesInfoCard, shadows.elevated]}>
          <View style={styles.placesInfoCardHeader}>
            <Text style={styles.placesInfoCardName} numberOfLines={1}>
              {selectedPlacesMarker.name}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedPlacesMarker(null)}
              accessibilityLabel="Cerrar"
              style={styles.placesInfoCardClose}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.placesInfoCardAddress} numberOfLines={2}>
            {selectedPlacesMarker.address}
          </Text>
          <TouchableOpacity
            style={styles.placesInfoCardLink}
            onPress={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${selectedPlacesMarker.lat},${selectedPlacesMarker.lng}&query_place_id=${selectedPlacesMarker.placeId}`;
              Linking.openURL(url).catch(() => {});
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={14} color={colors.primary} />
            <Text style={styles.placesInfoCardLinkText}>
              Ver en Google Maps
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
  autocompleteDisabled: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    elevation: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    opacity: 0.6,
    ...shadows.elevated,
  },
  autocompleteDisabledText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  googleMapsButton: {
    paddingHorizontal: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  googleMapsEscapeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    alignSelf: "flex-end",
    ...shadows.elevated,
  },
  googleMapsEscapeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
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
  placesInfoCard: {
    position: "absolute",
    bottom: 220,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.elevated,
  },
  placesInfoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  placesInfoCardName: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  placesInfoCardClose: {
    padding: spacing.xs,
  },
  placesInfoCardAddress: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  placesInfoCardLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  placesInfoCardLinkText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
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
