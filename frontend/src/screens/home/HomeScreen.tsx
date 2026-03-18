/**
 * [P03-04] Home Dashboard — Pantalla principal de BargAIn.
 *
 * Datos en vivo: authStore (saludo), listStore (listas recientes),
 * storeService (tiendas cercanas), notificationStore (notificaciones recientes),
 * priceService (alertas de precio).
 *
 * Pull-to-refresh recarga los 4 widgets simultáneamente.
 * Icono de campana en header con badge de no leídas.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import {
  colors,
  spacing,
  borderRadius,
  shadows,
  fontFamilies,
  fontSize,
  sizes,
} from "@/theme";
import { SearchBar } from "@/components/ui/SearchBar";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useAuthStore } from "@/store/authStore";
import { useListStore } from "@/store/listStore";
import { useNotificationStore } from "@/store/notificationStore";
import { listService } from "@/api/listService";
import { storeService } from "@/api/storeService";
import { notificationService } from "@/api/notificationService";
import { priceService } from "@/api/priceService";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type {
  Store,
  Product,
  PriceAlert,
  ShoppingList,
  Notification,
} from "@/types/domain";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "@/navigation/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined): string => {
  if (n == null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
};

// ── Acciones rápidas ──────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  iconName: string;
  color: string;
  bg: string;
  onPress: () => void;
}

const QuickActionTile: React.FC<{ action: QuickAction; delay: number }> = ({
  action,
  delay,
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[quickStyles.tileWrap, animStyle]}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 12, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
        onPress={action.onPress}
        style={[quickStyles.tile, { backgroundColor: action.bg }]}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <View
          style={[
            quickStyles.iconCircle,
            { backgroundColor: action.color + "20" },
          ]}
        >
          <Ionicons
            name={action.iconName as any}
            size={18}
            color={action.color}
          />
        </View>
        <Text style={[quickStyles.label, { color: action.color }]}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// ── Widget: Listas recientes ──────────────────────────────────────────────────

const RecentListCard: React.FC<{ list: ShoppingList; onPress: () => void }> = ({
  list,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[recentListStyles.card, shadows.card]}
    activeOpacity={0.88}
    accessibilityRole="button"
    accessibilityLabel={`Lista ${list.name}`}
  >
    <View style={recentListStyles.row}>
      <View style={recentListStyles.iconWrap}>
        <Ionicons name="list-outline" size={18} color={colors.primary} />
      </View>
      <View style={recentListStyles.info}>
        <Text style={recentListStyles.name} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={recentListStyles.meta}>
          {(list.items?.length ?? 0)} producto{(list.items?.length ?? 0) !== 1 ? "s" : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </View>
  </TouchableOpacity>
);

// ── Widget: Tiendas cercanas ──────────────────────────────────────────────────

interface NearbyWidgetProps {
  count: number;
  isLoading: boolean;
  locationStatus: string;
  onMapPress: () => void;
}

const NearbyWidget: React.FC<NearbyWidgetProps> = ({
  count,
  isLoading,
  locationStatus,
  onMapPress,
}) => {
  if (isLoading) {
    return (
      <SkeletonBox testID="skeleton-nearby" width="100%" height={64} borderRadius={12} />
    );
  }

  if (locationStatus === "denied") {
    return (
      <TouchableOpacity
        testID="location-denied-card"
        style={[nearbyWidgetStyles.deniedCard, shadows.card]}
        onPress={() => Linking.openSettings()}
        activeOpacity={0.85}
      >
        <Ionicons name="location-outline" size={20} color={colors.textMuted} />
        <Text style={nearbyWidgetStyles.deniedText}>
          Activa la ubicación para ver tiendas cercanas
        </Text>
        <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[nearbyWidgetStyles.card, shadows.card]}
      onPress={onMapPress}
      activeOpacity={0.88}
    >
      <Ionicons name="storefront-outline" size={22} color={colors.primary} />
      <View style={nearbyWidgetStyles.info}>
        <Text style={nearbyWidgetStyles.count}>
          {count} tienda{count !== 1 ? "s" : ""} en tu radio
        </Text>
        <Text style={nearbyWidgetStyles.sub}>Ver en mapa →</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Widget: Notificaciones recientes ─────────────────────────────────────────

const RecentNotifCard: React.FC<{
  notif: Notification;
  onPress: () => void;
}> = ({ notif, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[notifCardStyles.card, !notif.is_read && notifCardStyles.unread]}
    activeOpacity={0.85}
  >
    <View style={notifCardStyles.dot}>
      {!notif.is_read && <View style={notifCardStyles.unreadDot} />}
    </View>
    <View style={notifCardStyles.body}>
      <Text style={notifCardStyles.title} numberOfLines={1}>
        {notif.title}
      </Text>
      <Text style={notifCardStyles.bodyText} numberOfLines={2}>
        {notif.body}
      </Text>
    </View>
  </TouchableOpacity>
);

// ── Widget: Alertas de precio ─────────────────────────────────────────────────

const PriceAlertCard: React.FC<{
  alert: PriceAlert;
  onPress: () => void;
}> = ({ alert, onPress }) => {
  const productName =
    alert.product_name ??
    (typeof alert.product === "object" && alert.product !== null
      ? (alert.product as Product).name
      : `Producto #${String(alert.product)}`);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[priceAlertStyles.card, shadows.card]}
      activeOpacity={0.85}
    >
      <View style={priceAlertStyles.row}>
        <Ionicons name="pricetag-outline" size={18} color={colors.accentDark} />
        <View style={priceAlertStyles.info}>
          <Text style={priceAlertStyles.name} numberOfLines={1}>
            {productName}
          </Text>
          <Text style={priceAlertStyles.prices}>
            Objetivo: €{fmt(alert.target_price)}
            {alert.current_price != null ? ` · Actual: €${fmt(alert.current_price)}` : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

interface HomeScreenProps {
  navigation?: NativeStackNavigationProp<HomeStackParamList>;
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { user } = useAuthStore();
  const { lists, setLists } = useListStore();
  const {
    notifications,
    unreadCount,
    setNotifications: setStoreNotifications,
  } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [locationStatus, setLocationStatus] = useState<
    "loading" | "granted" | "denied" | "undetermined"
  >("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState({
    lists: false,
    stores: true,
    notifications: false,
    alerts: false,
  });

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const loadAll = useCallback(async () => {
    // Lists
    setWidgetLoading((prev) => ({ ...prev, lists: true }));
    try {
      const fetchedLists = await listService.getLists();
      setLists(fetchedLists);
    } catch {
      // silent
    } finally {
      setWidgetLoading((prev) => ({ ...prev, lists: false }));
    }

    // Notifications
    try {
      const result = await notificationService.getNotifications(1);
      setStoreNotifications(result.results);
    } catch {
      // silent
    }

    // Price alerts
    try {
      const alerts = await priceService.getPriceAlerts();
      setPriceAlerts(alerts);
    } catch {
      // silent
    }

    // Location + nearby stores
    setWidgetLoading((prev) => ({ ...prev, stores: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationStatus("granted");
        let lat: number;
        let lng: number;
        if (__DEV__) {
          // Dev fallback: Seville center
          lat = 37.3886;
          lng = -5.9823;
        } else {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
        const stores = await storeService.getNearby(lat, lng, 5);
        setNearbyStores(stores);
      } else {
        setLocationStatus("denied");
      }
    } catch {
      setLocationStatus("undetermined");
    } finally {
      setWidgetLoading((prev) => ({ ...prev, stores: false }));
    }
  }, [setLists, setStoreNotifications]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Force re-fetch lists even if already loaded
    try {
      const [fetchedLists, notifResult, alerts] = await Promise.all([
        listService.getLists(),
        notificationService.getNotifications(1),
        priceService.getPriceAlerts(),
      ]);
      setLists(fetchedLists);
      setStoreNotifications(notifResult.results);
      setPriceAlerts(alerts);
    } catch {
      // silent
    }

    // Also refresh stores
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const stores = await storeService.getNearby(
          pos.coords.latitude,
          pos.coords.longitude,
          5,
        );
        setNearbyStores(stores);
        setLocationStatus("granted");
      } else {
        setLocationStatus("denied");
      }
    } catch {
      // silent
    }

    setIsRefreshing(false);
  }, [setLists, setStoreNotifications]);

  // Recent lists: 2 most recently updated
  const recentLists = [...lists]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 2);

  // Recent unread notifications: 3 most recent
  const recentNotifs = notifications.filter((n) => !n.is_read).slice(0, 3);
  const safePriceAlerts = Array.isArray(priceAlerts) ? priceAlerts : [];

  // Bell badge display
  const badgeCount = unreadCount > 99 ? "99+" : String(unreadCount);

  const QUICK_ACTIONS: QuickAction[] = [
    {
      id: "templates",
      label: "Plantillas",
      iconName: "document-text-outline",
      color: colors.secondary,
      bg: colors.secondaryTint,
      onPress: () => navigation.navigate("ListsTab" as never, { screen: "Templates" } as never),
    },
    {
      id: "catalog",
      label: "Productos",
      iconName: "cube",
      color: colors.primary,
      bg: colors.primaryTint,
      onPress: () => navigation.navigate("ProductsCatalog"),
    },
    {
      id: "scan",
      label: "Escanear",
      iconName: "scan",
      color: colors.accentDark,
      bg: colors.accentTint,
      onPress: () => console.log("Escanear"),
    },
    {
      id: "favorites",
      label: "Favoritos",
      iconName: "heart",
      color: colors.info,
      bg: colors.infoBg,
      onPress: () => navigation.navigate("FavoriteStores"),
    },
  ];

  const firstName = user?.name?.split(" ")[0] ?? "amigo";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        testID="home-scroll"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + sizes.tabBarHeight + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).springify().damping(20)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, 👋</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>

          {/* Bell icon with unread badge */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate("Notifications" as never)}
            accessibilityRole="button"
            accessibilityLabel={`Notificaciones, ${unreadCount} sin leer`}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── SearchBar ──────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(60).springify().damping(20)}
          style={styles.searchWrap}
        >
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Leche, pan, aceite de oliva…"
          />
        </Animated.View>

        {/* ── Acciones rápidas ───────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(120).springify().damping(20)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={quickStyles.grid}>
            {QUICK_ACTIONS.map((action, i) => (
              <QuickActionTile
                key={action.id}
                action={action}
                delay={140 + i * 40}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Widget 1: Notificaciones recientes ─────────────────────── */}
        {(recentNotifs.length > 0 || widgetLoading.notifications) && (
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(20)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notificaciones recientes</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Notifications" as never)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.sectionLink}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            {recentNotifs.map((n) => (
              <RecentNotifCard
                key={n.id}
                notif={n}
                onPress={() => navigation.navigate("Notifications" as never)}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Widget 2: Listas recientes ─────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(260).springify().damping(20)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Listas recientes</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ListsTab" as never)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.sectionLink}>Ver todas →</Text>
            </TouchableOpacity>
          </View>

          {widgetLoading.lists ? (
            <>
              <SkeletonBox testID="skeleton-list-1" width="100%" height={56} borderRadius={12} style={{ marginBottom: spacing.xs }} />
              <SkeletonBox testID="skeleton-list-2" width="100%" height={56} borderRadius={12} />
            </>
          ) : recentLists.length === 0 ? (
            <Text style={styles.emptyText}>Sin listas recientes. ¡Crea tu primera lista!</Text>
          ) : (
            recentLists.map((list) => (
              <RecentListCard
                key={list.id}
                list={list}
                onPress={() => navigation.navigate("ListsTab" as never)}
              />
            ))
          )}
        </Animated.View>

        {/* ── Widget 3: Tiendas cercanas ─────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(320).springify().damping(20)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Cerca de ti</Text>
          <NearbyWidget
            count={nearbyStores.length}
            isLoading={widgetLoading.stores}
            locationStatus={locationStatus}
            onMapPress={() => navigation.navigate("MapTab" as never)}
          />
        </Animated.View>

        {/* ── Widget 4: Alertas de precio ────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(380).springify().damping(20)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertas de precio</Text>
            {safePriceAlerts.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("PriceAlerts" as never)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.sectionLink}>Ver todas →</Text>
              </TouchableOpacity>
            )}
          </View>
          {safePriceAlerts.length === 0 ? (
            <View style={styles.emptyAlertsWrap}>
              <Text style={styles.emptyText}>Sin alertas activas</Text>
              <TouchableOpacity
                style={styles.createAlertButton}
                onPress={() => navigation.navigate("PriceAlerts" as never)}
                accessibilityRole="button"
                accessibilityLabel="Crear alerta de precio"
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.createAlertButtonText}>Crear alerta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            safePriceAlerts.slice(0, 3).map((alert) => (
              <PriceAlertCard
                key={alert.id}
                alert={alert}
                onPress={() => navigation.navigate("PriceAlerts" as never)}
              />
            ))
          )}
        </Animated.View>

        {/* ── Optimizer teaser ───────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(440).springify().damping(20)}
          style={styles.section}
        >
          <TouchableOpacity
            style={teaserStyles.card}
            activeOpacity={1}
            onPress={() =>
              Alert.alert("Próximamente", "Esta función estará disponible próximamente")
            }
          >
            <Ionicons name="lock-closed-outline" size={24} color={colors.textMuted} />
            <View style={teaserStyles.info}>
              <Text style={teaserStyles.title}>Optimizar ruta</Text>
              <Text style={teaserStyles.badge}>Próximamente</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Estilos base ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  userName: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["3xl"],
    color: colors.text,
    lineHeight: Math.round(fontSize["3xl"] * 1.15),
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.error ?? "#E53E3E",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 9,
    color: colors.white,
    lineHeight: 14,
  },
  searchWrap: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.xl,
    color: colors.text,
    lineHeight: Math.round(fontSize.xl * 1.2),
    marginBottom: spacing.sm,
  },
  sectionLink: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  emptyAlertsWrap: {
    alignItems: "center",
    gap: spacing.xs,
  },
  createAlertButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  createAlertButtonText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

// ─── Estilos Quick actions ────────────────────────────────────────────────────

const quickStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tileWrap: {
    width: "47.5%",
  },
  tile: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    flex: 1,
  },
});

// ─── Estilos Listas recientes ──────────────────────────────────────────────────

const recentListStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

// ─── Estilos Tiendas cercanas ─────────────────────────────────────────────────

const nearbyWidgetStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
  },
  count: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  sub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 2,
  },
  deniedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  deniedText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
});

// ─── Estilos Notificaciones recientes ─────────────────────────────────────────

const notifCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dot: {
    width: 16,
    alignItems: "center",
    paddingTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  bodyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

// ─── Estilos Alertas de precio ────────────────────────────────────────────────

const priceAlertStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  prices: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

// ─── Estilos Optimizer teaser ─────────────────────────────────────────────────

const teaserStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    opacity: 0.5,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  badge: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default HomeScreen;
