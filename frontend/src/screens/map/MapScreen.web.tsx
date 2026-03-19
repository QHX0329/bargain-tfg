import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
  textStyles,
} from '@/theme';
import { storeService } from '@/api/storeService';
import type { MapStackParamList } from '@/navigation/types';
import type { Store, StoreChain } from '@/types/domain';

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVILLE_COORDS = { lat: 37.3886, lng: -5.9823 };
const EARTH_RADIUS_KM = 6371;
const GOOGLE_MAP_LIBRARIES: ('marker')[] = ['marker'];

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

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

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StoreCardProps {
  store: Store;
  onPress: (store: Store) => void;
  isSelected?: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress, isSelected }) => {
  const chainColor = CHAIN_COLORS[store.chain] || colors.primary;
  const initial = CHAIN_INITIALS[store.chain] || "?";

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        shadows.card,
        isSelected && { borderColor: colors.primary, borderWidth: 2 }
      ]}
      onPress={() => onPress(store)}
      activeOpacity={0.85}
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

// ─── Main Screen ───────────────────────────────────────────────────────

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList, 'Map'>>();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";
  const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || undefined;
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(SEVILLE_COORDS);
  const [userCoords, setUserCoords] = useState(SEVILLE_COORDS);
  const [stores, setStores] = useState<Store[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storesPanelExpanded, setStoresPanelExpanded] = useState(true);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch initial stores and user location
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingStores(true);
      
      let lat = SEVILLE_COORDS.lat;
      let lng = SEVILLE_COORDS.lng;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            setCenter({ lat, lng });
            setUserCoords({ lat, lng });
            fetchNearbyStores(lat, lng);
          },
          () => {
            console.warn("Geolocation denied or failed, using fallback.");
            fetchNearbyStores(lat, lng);
          }
        );
      } else {
        fetchNearbyStores(lat, lng);
      }
    };

    fetchInitialData();
  }, []);

  const fetchNearbyStores = async (lat: number, lng: number) => {
    setIsFetchingStores(true);
    try {
      const nearby = await storeService.getNearby(lat, lng, 10);
      setStores(nearby);
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setIsFetchingStores(false);
    }
  };

  const fetchStoresInVisibleArea = useCallback(async () => {
    if (!map) {
      return;
    }

    const mapCenter = map.getCenter();
    const bounds = map.getBounds();
    const northEast = bounds?.getNorthEast();

    if (!mapCenter || !northEast) {
      return;
    }

    const centerLat = mapCenter.lat();
    const centerLng = mapCenter.lng();

    const viewportRadiusKm = haversineDistanceKm(
      centerLat,
      centerLng,
      northEast.lat(),
      northEast.lng(),
    );

    const searchRadiusKm = Math.min(Math.max(viewportRadiusKm, 2), 30);

    setIsFetchingStores(true);
    try {
      const nearby = await storeService.getNearby(centerLat, centerLng, searchRadiusKm);
      setCenter({ lat: centerLat, lng: centerLng });
      setStores(nearby);
      setSelectedStore(null);
    } catch (err) {
      console.error("Error fetching stores in visible area:", err);
    } finally {
      setIsFetchingStores(false);
    }
  }, [map]);

  const handleStoreCardPress = useCallback((store: Store) => {
    if (store.location?.coordinates) {
      const [lng, lat] = store.location.coordinates;
      const newPos = { lat, lng };
      setCenter(newPos);
      setSelectedStore(store);
      map?.panTo(newPos);
    }
  }, [map]);

  useEffect(() => {
    if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) {
      return;
    }

    const createdMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    stores.forEach((store) => {
      if (!store.location?.coordinates) {
        return;
      }

      const [lng, lat] = store.location.coordinates;
      const color = CHAIN_COLORS[store.chain] || colors.primary;

      const markerNode = document.createElement('div');
      markerNode.style.width = '18px';
      markerNode.style.height = '18px';
      markerNode.style.borderRadius = '999px';
      markerNode.style.backgroundColor = color;
      markerNode.style.border = '2px solid #FFFFFF';
      markerNode.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.24)';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: store.name,
        content: markerNode,
      });

      marker.addListener('click', () => {
        setSelectedStore(store);
        setCenter({ lat, lng });
      });

      createdMarkers.push(marker);
    });

    return () => {
      createdMarkers.forEach((marker) => {
        marker.map = null;
      });
    };
  }, [map, stores]);

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={textStyles.body}>Error al cargar el mapa de Google</Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { marginTop: spacing.md }]}>Cargando Google Maps...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          clickableIcons: false,
          mapId,
        }}
      >
        {selectedStore && selectedStore.location?.coordinates && (
           <InfoWindow
             position={{ 
               lat: selectedStore.location.coordinates[1], 
               lng: selectedStore.location.coordinates[0] 
             }}
             onCloseClick={() => setSelectedStore(null)}
           >
             <div style={infoWindowStyles.wrap}>
               <h4 style={infoWindowStyles.title}>{selectedStore.name}</h4>
               <p style={infoWindowStyles.meta}>
                 {selectedStore.chain?.toUpperCase() ?? 'TIENDA'} · {selectedStore.isOpen ? 'ABIERTO' : 'CERRADO'}
               </p>
               <p style={infoWindowStyles.address}>{selectedStore.address}</p>
             </div>
           </InfoWindow>
        )}
      </GoogleMap>

      <TouchableOpacity
        style={[styles.searchAreaButton, shadows.elevated]}
        onPress={fetchStoresInVisibleArea}
        activeOpacity={0.9}
      >
        <Text style={styles.searchAreaText}>Buscar en esta zona</Text>
      </TouchableOpacity>

      {/* ── Overlay de carga ────────────────────────── */}
      {isFetchingStores && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.mapLoadingText}>Buscando tiendas...</Text>
        </View>
      )}

      {/* ── Panel inferior ───────────── */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={styles.panelHandleButton}
          onPress={() => setStoresPanelExpanded((prev) => !prev)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={storesPanelExpanded ? 'Plegar panel de tiendas' : 'Desplegar panel de tiendas'}
        >
          <View style={styles.panelHandleGrip} />
          <View style={styles.panelHandleMeta}>
            <Text style={styles.panelTitle}>
              {stores.length} tienda{stores.length !== 1 ? 's' : ''} en esta zona
            </Text>
            <Text style={styles.panelHandleChevron}>{storesPanelExpanded ? '▾' : '▴'}</Text>
          </View>
        </TouchableOpacity>

        {!storesPanelExpanded ? null : stores.length > 0 ? (
          <>
            {selectedStore && (
              <TouchableOpacity
                style={[styles.storeProfileButton, shadows.card]}
                onPress={() =>
                  navigation.navigate('StoreProfile', {
                    storeId: selectedStore.id,
                    storeName: selectedStore.name,
                    userLat: userCoords.lat,
                    userLng: userCoords.lng,
                  })
                }
                activeOpacity={0.9}
              >
                <Text style={styles.storeProfileButtonText}>Ver perfil de tienda</Text>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    zIndex: 1000,
  },
  mapLoadingText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  searchAreaButton: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 1000,
  },
  searchAreaText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
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
    minHeight: 66,
    zIndex: 1000,
  },
  panelHandleButton: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  panelHandleGrip: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  panelHandleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelHandleChevron: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  panelTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  storeProfileButton: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  storeProfileButtonText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
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

const infoWindowStyles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 220,
    padding: '6px 8px',
  },
  title: {
    margin: '0 0 3px 0',
    fontSize: '14px',
    lineHeight: '18px',
    fontWeight: 600,
    color: '#1F2937',
  },
  meta: {
    margin: '0 0 3px 0',
    fontSize: '11px',
    lineHeight: '14px',
    letterSpacing: '0.4px',
    color: '#0E7490',
  },
  address: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '16px',
    color: '#4B5563',
  },
};
