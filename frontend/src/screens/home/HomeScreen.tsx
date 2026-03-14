/**
 * [P03] Home Dashboard — Pantalla principal de BargAIn.
 *
 * Anatomía de la pantalla:
 *
 *  ┌──────────────────────────────────────────────┐
 *  │  HEADER                                       │
 *  │  "Buenos días, Ana" · avatar                 │
 *  │  Sevilla · Triana                            │
 *  ├──────────────────────────────────────────────┤
 *  │  SEARCHBAR                                    │
 *  ├──────────────────────────────────────────────┤
 *  │  HERO: Ahorro esta semana                     │
 *  │  €12,40  ↑51% vs semana anterior             │
 *  │  barra de progreso semanal                    │
 *  ├──────────────────────────────────────────────┤
 *  │  ACCIONES RÁPIDAS (grid 2×2)                  │
 *  │  [Nueva lista] [Buscar]                       │
 *  │  [Escanear]    [Mi ruta]                      │
 *  ├──────────────────────────────────────────────┤
 *  │  LISTA ACTIVA                                 │
 *  │  "Compra semanal" · 8 ítems · €34,20         │
 *  │  [✓] Pan  [✗] Leche  [✗] Tomates  +5 más    │
 *  │  [Ir a la lista →]                            │
 *  ├──────────────────────────────────────────────┤
 *  │  TIENDAS CERCANAS (scroll horizontal)         │
 *  │  [Mercadona 0.3km] [Lidl 0.8km] [Aldi 1.2km] │
 *  └──────────────────────────────────────────────┘
 *
 * Datos: mock hasta que se conecte el backend.
 * Animaciones: entrada con FadeInDown staggered (Reanimated 2).
 */

import React, { useCallback, useState } from "react";
import {
  Pressable,
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
import type {
  ShoppingList,
  Store,
  StoreChain,
  WeeklySavings,
} from "@/types/domain";

// ─── Mock data ────────────────────────────────────────────────────────────────
// TODO: reemplazar con llamadas a la API cuando backend esté listo (F3)

const MOCK_USER_NAME = "Ana";
const MOCK_LOCATION = "Triana · Sevilla";

const MOCK_SAVINGS: WeeklySavings = {
  thisWeek: 12.4,
  lastWeek: 8.2,
  improvementPercent: 51,
  totalSavedAllTime: 142.8,
  optimizationsCount: 24,
};

const MOCK_ACTIVE_LIST: ShoppingList = {
  id: "list-1",
  name: "Compra semanal",
  items: [
    {
      id: "i1",
      product: {
        id: "p1",
        name: "Leche semidesnatada",
        normalizedName: "leche semidesnatada",
        category: "lácteos",
        unit: "l",
        unitQuantity: 1,
      },
      quantity: 2,
      isChecked: false,
    },
    {
      id: "i2",
      product: {
        id: "p2",
        name: "Pan integral",
        normalizedName: "pan integral",
        category: "panadería",
        unit: "ud",
        unitQuantity: 1,
      },
      quantity: 1,
      isChecked: true,
    },
    {
      id: "i3",
      product: {
        id: "p3",
        name: "Tomates rama",
        normalizedName: "tomates rama",
        category: "verduras",
        unit: "kg",
        unitQuantity: 1,
      },
      quantity: 1,
      isChecked: false,
    },
    {
      id: "i4",
      product: {
        id: "p4",
        name: "Aceite de oliva virgen extra",
        normalizedName: "aove",
        category: "aceites",
        unit: "l",
        unitQuantity: 1,
      },
      quantity: 1,
      isChecked: false,
    },
    {
      id: "i5",
      product: {
        id: "p5",
        name: "Yogur griego natural",
        normalizedName: "yogur griego",
        category: "lácteos",
        unit: "ud",
        unitQuantity: 4,
      },
      quantity: 4,
      isChecked: true,
    },
    {
      id: "i6",
      product: {
        id: "p6",
        name: "Arroz redondo",
        normalizedName: "arroz redondo",
        category: "cereales",
        unit: "kg",
        unitQuantity: 1,
      },
      quantity: 1,
      isChecked: false,
    },
    {
      id: "i7",
      product: {
        id: "p7",
        name: "Huevos camperos L",
        normalizedName: "huevos camperos",
        category: "huevos",
        unit: "pack",
        unitQuantity: 12,
      },
      quantity: 1,
      isChecked: false,
    },
    {
      id: "i8",
      product: {
        id: "p8",
        name: "Pasta espagueti",
        normalizedName: "pasta espagueti",
        category: "pasta",
        unit: "g",
        unitQuantity: 500,
      },
      quantity: 2,
      isChecked: false,
    },
  ],
  totalEstimated: 34.2,
  totalOptimized: 28.6,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isFavorite: false,
};

const MOCK_NEARBY: Store[] = [
  {
    id: "s1",
    name: "Mercadona Triana",
    chain: "mercadona",
    address: "C/ Pagés del Corro, 90",
    distanceKm: 0.3,
    estimatedMinutes: 5,
    isOpen: true,
  },
  {
    id: "s2",
    name: "Lidl Macarena",
    chain: "lidl",
    address: "Ronda de Capuchinos, 1",
    distanceKm: 0.8,
    estimatedMinutes: 12,
    isOpen: true,
  },
  {
    id: "s3",
    name: "Aldi San Bernardo",
    chain: "aldi",
    address: "Av. Dr. Fedriani, 37",
    distanceKm: 1.2,
    estimatedMinutes: 18,
    isOpen: false,
  },
  {
    id: "s4",
    name: "Carrefour Express",
    chain: "carrefour",
    address: "C/ Sierpes, 12",
    distanceKm: 1.8,
    estimatedMinutes: 22,
    isOpen: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
};

// ── Tarjeta hero de ahorro semanal ────────────────────────────────────────────

interface SavingsHeroProps {
  savings: WeeklySavings;
}

const SavingsHero: React.FC<SavingsHeroProps> = ({ savings }) => {
  const progress = Math.min(savings.thisWeek / (savings.thisWeek + 10), 1);
  const improved = savings.improvementPercent > 0;

  return (
    <View style={heroStyles.container}>
      {/* Patrón de azulejos abstracto, decorativo */}
      <View style={[heroStyles.tilePattern, heroStyles.pointerNone]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[heroStyles.tile, { opacity: 0.06 + i * 0.02 }]}
          />
        ))}
      </View>

      <Text style={heroStyles.label}>AHORRO ESTA SEMANA</Text>

      <View style={heroStyles.amountRow}>
        <Text style={heroStyles.currency}>€</Text>
        <Text style={heroStyles.amount}>{fmt(savings.thisWeek)}</Text>
        <View
          style={[
            heroStyles.deltaBadge,
            !improved && heroStyles.deltaBadgeNeutral,
          ]}
        >
          <Text style={heroStyles.deltaText}>
            {improved ? "↑" : "↓"} {Math.abs(savings.improvementPercent)}%
          </Text>
        </View>
      </View>

      <Text style={heroStyles.compareText}>
        vs €{fmt(savings.lastWeek)} la semana pasada
      </Text>

      <View style={heroStyles.progressTrack}>
        <View
          style={[
            heroStyles.progressFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>

      <Text style={heroStyles.totalText}>
        Total ahorrado: €{fmt(savings.totalSavedAllTime)} ·{" "}
        {savings.optimizationsCount} rutas
      </Text>
    </View>
  );
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

// ── Card de lista activa ──────────────────────────────────────────────────────

const ActiveListCard: React.FC<{ list: ShoppingList; onPress: () => void }> = ({
  list,
  onPress,
}) => {
  const checkedCount = list.items.filter((i) => i.isChecked).length;
  const previewItems = list.items.slice(0, 4);
  const remaining = list.items.length - 4;
  const progressPercent = Math.round((checkedCount / list.items.length) * 100);
  const savings =
    list.totalOptimized !== undefined
      ? list.totalEstimated - list.totalOptimized
      : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[listCardStyles.container, shadows.card]}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Lista ${list.name}, ${list.items.length} ítems`}
    >
      <View style={listCardStyles.header}>
        <View style={listCardStyles.headerLeft}>
          <Text style={listCardStyles.listName}>{list.name}</Text>
          <Text style={listCardStyles.listMeta}>
            {list.items.length} ítems · {checkedCount}/{list.items.length}{" "}
            completados
          </Text>
        </View>
        <View style={listCardStyles.headerRight}>
          <Text style={listCardStyles.totalPrice}>
            €{fmt(list.totalEstimated)}
          </Text>
          {savings > 0.01 && (
            <Text style={listCardStyles.savedBadge}>-€{fmt(savings)}</Text>
          )}
        </View>
      </View>

      <View style={listCardStyles.progressTrack}>
        <View
          style={[
            listCardStyles.progressFill,
            { width: `${progressPercent}%` },
          ]}
        />
      </View>

      <View style={listCardStyles.itemsRow}>
        {previewItems.map((item) => (
          <View
            key={item.id}
            style={[
              listCardStyles.itemChip,
              item.isChecked && listCardStyles.itemChipDone,
            ]}
          >
            <Text
              style={[
                listCardStyles.itemChipText,
                item.isChecked && listCardStyles.itemChipTextDone,
              ]}
              numberOfLines={1}
            >
              {item.isChecked ? "✓ " : ""}
              {item.product.name.split(" ")[0]}
            </Text>
          </View>
        ))}
        {remaining > 0 && (
          <View style={listCardStyles.moreChip}>
            <Text style={listCardStyles.moreChipText}>+{remaining}</Text>
          </View>
        )}
      </View>

      <View style={listCardStyles.footer}>
        <Text style={listCardStyles.ctaText}>Ver lista completa →</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Tarjeta de tienda cercana ─────────────────────────────────────────────────

const NearbyStoreCard: React.FC<{ store: Store; onPress: () => void }> = ({
  store,
  onPress,
}) => {
  const chainColor = CHAIN_COLORS[store.chain];
  const initial = CHAIN_INITIALS[store.chain];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[nearbyStyles.card, shadows.card]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${store.name}, a ${store.distanceKm} kilómetros`}
    >
      <View style={[nearbyStyles.logo, { backgroundColor: chainColor + "18" }]}>
        <Text style={[nearbyStyles.logoText, { color: chainColor }]}>
          {initial}
        </Text>
      </View>
      <Text style={nearbyStyles.storeName} numberOfLines={2}>
        {store.name}
      </Text>
      <Text style={nearbyStyles.distanceText}>
        {store.distanceKm < 1
          ? `${Math.round(store.distanceKm * 1000)} m`
          : `${store.distanceKm.toFixed(1)} km`}
      </Text>
      <Text style={nearbyStyles.timeText}>≈ {store.estimatedMinutes} min</Text>
      <View
        style={[
          nearbyStyles.statusDot,
          !store.isOpen && nearbyStyles.statusDotClosed,
        ]}
      />
    </TouchableOpacity>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();

  const handleListPress = useCallback(() => {
    // TODO: router.push('/(tabs)/lists/' + MOCK_ACTIVE_LIST.id)
    console.log("Navigate to list:", MOCK_ACTIVE_LIST.id);
  }, []);

  const handleStorePress = useCallback((storeId: string) => {
    console.log("Navigate to store:", storeId);
  }, []);

  const QUICK_ACTIONS: QuickAction[] = [
    {
      id: "new-list",
      label: "Nueva lista",
      iconName: "add",
      color: colors.secondary,
      bg: colors.secondaryTint,
      onPress: () => console.log("Nueva lista"),
    },
    {
      id: "search",
      label: "Buscar",
      iconName: "search",
      color: colors.primary,
      bg: colors.primaryTint,
      onPress: () => console.log("Buscar"),
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
      id: "route",
      label: "Mi ruta",
      iconName: "navigate",
      color: colors.info,
      bg: colors.infoBg,
      onPress: () => console.log("Mi ruta"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + sizes.tabBarHeight + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(0).springify().damping(20)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{MOCK_USER_NAME}</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationDot}>◉</Text>
              <Text style={styles.locationText}>{MOCK_LOCATION}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            accessibilityRole="button"
            accessibilityLabel="Perfil de usuario"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{MOCK_USER_NAME.charAt(0)}</Text>
            </View>
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
            onFilterPress={() => console.log("Filtros")}
          />
        </Animated.View>

        {/* ── Hero ahorro ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).springify().damping(20)}>
          <SavingsHero savings={MOCK_SAVINGS} />
        </Animated.View>

        {/* ── Acciones rápidas ───────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(180).springify().damping(20)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={quickStyles.grid}>
            {QUICK_ACTIONS.map((action, i) => (
              <QuickActionTile
                key={action.id}
                action={action}
                delay={200 + i * 40}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Lista activa ────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(280).springify().damping(20)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista activa</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ver todas las listas"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.sectionLink}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          <ActiveListCard list={MOCK_ACTIVE_LIST} onPress={handleListPress} />
        </Animated.View>

        {/* ── Tiendas cercanas ────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(340).springify().damping(20)}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>Cerca de ti</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver mapa de tiendas"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.sectionLink}>Mapa →</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={nearbyStyles.scrollContent}
          style={nearbyStyles.scroll}
        >
          {MOCK_NEARBY.map((store) => (
            <NearbyStoreCard
              key={store.id}
              store={store}
              onPress={() => handleStorePress(store.id)}
            />
          ))}
        </ScrollView>

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
    alignItems: "flex-start",
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationDot: {
    fontSize: 9,
    color: colors.primary,
    lineHeight: 14,
  },
  locationText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 14,
  },
  avatarButton: {
    marginTop: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.primary,
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
});

// ─── Estilos Hero ─────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    position: "relative",
  },
  tilePattern: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 120,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pointerNone: {
    pointerEvents: "none",
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.white,
    margin: 2,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginBottom: 4,
  },
  currency: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.xl,
    color: "rgba(255,255,255,0.8)",
    lineHeight: Math.round(fontSize["4xl"] * 1.1),
    paddingBottom: 4,
  },
  amount: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize["4xl"],
    color: colors.white,
    lineHeight: Math.round(fontSize["4xl"] * 1.0),
    letterSpacing: -1,
  },
  deltaBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    marginBottom: 6,
  },
  deltaBadgeNeutral: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  deltaText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.success,
  },
  compareText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: borderRadius.pill,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
  },
  totalText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: "rgba(255,255,255,0.55)",
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
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    flex: 1,
  },
});

// ─── Estilos Lista activa ─────────────────────────────────────────────────────

const listCardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerLeft: { flex: 1 },
  listName: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    lineHeight: Math.round(fontSize.lg * 1.3),
  },
  listMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  totalPrice: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  savedBadge: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.pill,
  },
  itemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  itemChip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemChipDone: {
    backgroundColor: colors.successBg,
    borderColor: colors.success + "40",
  },
  itemChipText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  itemChipTextDone: {
    color: colors.success,
    textDecorationLine: "line-through",
  },
  moreChip: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + "30",
  },
  moreChipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    alignItems: "flex-end",
  },
  ctaText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

// ─── Estilos Tiendas cercanas ─────────────────────────────────────────────────

const nearbyStyles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: 2,
  },
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

export default HomeScreen;
