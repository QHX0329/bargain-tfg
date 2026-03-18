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
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, type Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

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
import type { Store, StoreChain } from "@/types/domain";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Coordenadas de Sevilla centro como fallback en __DEV__ */
const SEVILLE_COORDS = { lat: 37.3886, lng: -5.9823 };

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
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  const chainColor = CHAIN_COLORS[store.chain];
  const initial = CHAIN_INITIALS[store.chain];

  return (
    <TouchableOpacity
      style={[cardStyles.card, shadows.card]}
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
  const mapRef = useRef<MapView>(null);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [userLat, setUserLat] = useState<number>(SEVILLE_COORDS.lat);
  const [userLng, setUserLng] = useState<number>(SEVILLE_COORDS.lng);
  const [stores, setStores] = useState<Store[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);

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
          console.warn("[MapScreen] No se pudo obtener ubicación del dispositivo");
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

  // ── Renderizado ──────────────────────────────────────────────────────────

  // Permiso aún no resuelto
  if (permissionGranted === null) {
    return (
      <SafeAreaView style={styles.container}>
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
      <SafeAreaView style={styles.container}>
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
      >
        {stores.map((store) => {
          const { latitude, longitude } = getStoreCoords(
            store,
            userLat,
            userLng,
          );
          return (
            <Marker
              key={store.id}
              coordinate={{ latitude, longitude }}
              title={store.name}
              description={store.address}
            />
          );
        })}
      </MapView>

      {/* ── Overlay de carga sobre el mapa ────────────────────────── */}
      {isFetchingStores && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.mapLoadingText}>Cargando tiendas…</Text>
        </View>
      )}

      {/* ── Panel inferior: lista horizontal de tiendas ───────────── */}
      <View style={styles.bottomPanel}>
        {stores.length > 0 ? (
          <>
            <Text style={styles.panelTitle}>
              {stores.length} tienda{stores.length !== 1 ? "s" : ""} cercanas
            </Text>
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StoreCard store={item} onPress={handleStoreCardPress} />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeListContent}
            />
          </>
        ) : !isFetchingStores ? (
          <View style={styles.emptyStores}>
            <Text style={styles.emptyStoresText}>
              No se encontraron tiendas en el radio de 10 km
            </Text>
          </View>
        ) : null}
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
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...shadows.elevated,
    minHeight: 130,
  },
  panelTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
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
    padding: spacing.sm,
    width: 130,
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
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 17,
    marginBottom: 4,
  },
  distanceText: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 17,
  },
  timeText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
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
