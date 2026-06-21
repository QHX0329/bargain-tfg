import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { SearchBar } from "@/components/ui/SearchBar";
import type { SearchBarHandle } from "@/components/ui/SearchBar";
import { WebTooltip } from "@/components/ui";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { copyToClipboard } from "@/utils/webExport";
import { productService, type ProductCategory } from "@/api/productService";
import { storeService } from "@/api/storeService";
import { priceService } from "@/api/priceService";
import { listService } from "@/api/listService";
import { useProfileStore } from "@/store/profileStore";
import type { Product, ShoppingList, Store } from "@/types/domain";
import { blurActiveElementOnWeb } from "@/utils/webA11y";

const STORE_FILTER_CONCURRENCY = 6;
const PRICE_FETCH_CONCURRENCY = 6;

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return results;
}

function flattenLeafCategories(nodes: ProductCategory[]): ProductCategory[] {
  const out: ProductCategory[] = [];
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => out.push(child));
      return;
    }
    out.push(node);
  });
  return out;
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface ProductRowProps {
  product: Product;
  lowestPrice: number | null | undefined;
  isPriceLoading: boolean;
  onPress: (product: Product) => void;
  onAdd: (product: Product) => void;
  quickMode: boolean;
  quickQuantity: number;
  onIncreaseQuickQuantity: (productId: string) => void;
  onDecreaseQuickQuantity: (productId: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  lowestPrice,
  isPriceLoading,
  onPress,
  onAdd,
  quickMode,
  quickQuantity,
  onIncreaseQuickQuantity,
  onDecreaseQuickQuantity,
}) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => onPress(product)}
    style={[styles.productRow, shadows.card]}
  >
    <View style={styles.productIconWrap}>
      <Ionicons name="cube-outline" size={18} color={colors.primary} />
    </View>
    <View style={styles.productBody}>
      <Text style={styles.productName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.productMeta} numberOfLines={1}>
        {product.category}
        {product.brand ? ` · ${product.brand}` : ""}
        {` · ${product.unit}`}
      </Text>
      <Text style={styles.productPriceMeta}>
        {isPriceLoading
          ? "Consultando mejor precio…"
          : lowestPrice !== null && lowestPrice !== undefined
            ? `Desde ${lowestPrice.toFixed(2)} €`
            : "Sin precios disponibles"}
      </Text>
    </View>
    {quickMode ? (
      <View style={styles.quickAddContainer}>
        <View style={styles.quickQtyControls}>
          <TouchableOpacity
            style={styles.quickQtyButton}
            onPress={() => onDecreaseQuickQuantity(product.id)}
            accessibilityLabel={`Reducir cantidad rapida de ${product.name}`}
          >
            <Ionicons name="remove" size={14} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quickQtyValue}>{quickQuantity}</Text>
          <TouchableOpacity
            style={styles.quickQtyButton}
            onPress={() => onIncreaseQuickQuantity(product.id)}
            accessibilityLabel={`Aumentar cantidad rapida de ${product.name}`}
          >
            <Ionicons name="add" size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addProductButton}
          onPress={() => onAdd(product)}
          accessibilityRole="button"
          accessibilityLabel={`Añadir ${product.name} a la lista actual`}
        >
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.addProductButton}
        onPress={() => onAdd(product)}
        accessibilityRole="button"
        accessibilityLabel={`Añadir ${product.name} a una lista`}
      >
        <Ionicons name="add" size={18} color={colors.white} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

export const ProductsCatalogScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const breakpoint = useBreakpoint();
  const searchInputRef = useRef<SearchBarHandle>(null);

  // D-06: Cmd/Ctrl+K focuses search bar (web only)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const profile = useProfileStore((s) => s.profile);
  const preferredListId: string | undefined = route.params?.listId;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [userLists, setUserLists] = useState<ShoppingList[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">(
    "all",
  );
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [nameQuery, setNameQuery] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  const [storeScopedProductIds, setStoreScopedProductIds] = useState<
    Set<string>
  >(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStoreFiltering, setIsStoreFiltering] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [priceByProductId, setPriceByProductId] = useState<
    Record<string, number | null>
  >({});
  const [loadingPriceIds, setLoadingPriceIds] = useState<Set<string>>(
    new Set(),
  );
  // Productos cuyo mejor precio ya se ha solicitado (en curso o resuelto).
  // Se usa como guard estable para no depender de estado en fetchLowestPrice,
  // evitando re-ejecuciones del efecto en cada resolución de precio.
  const requestedPriceIdsRef = useRef<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickQuantityByProductId, setQuickQuantityByProductId] = useState<
    Record<string, number>
  >({});

  // ── Filter panel animation ────────────────────────────────────────────────
  const FILTER_ANIM_MAX_HEIGHT = 320;
  const filterAnim = useRef(new Animated.Value(1)).current;
  const filterExpandedRef = useRef(true);
  const filterCurrentValueRef = useRef(1);
  const filterBaseValueRef = useRef(1);
  const filterGestureOffsetRef = useRef(0);
  const toggleFiltersRef = useRef((_expanded: boolean) => {});

  const toggleFiltersAnimated = useCallback(
    (toExpanded: boolean) => {
      filterExpandedRef.current = toExpanded;
      Animated.spring(filterAnim, {
        toValue: toExpanded ? 1 : 0,
        useNativeDriver: false,
        damping: 26,
        stiffness: 300,
        mass: 0.6,
      }).start();
    },
    [filterAnim],
  );

  useEffect(() => {
    toggleFiltersRef.current = toggleFiltersAnimated;
  }, [toggleFiltersAnimated]);

  useEffect(() => {
    const id = filterAnim.addListener(({ value }) => {
      filterCurrentValueRef.current = value;
    });
    return () => filterAnim.removeListener(id);
  }, [filterAnim]);

  const filterPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: (_, gs) => {
        filterAnim.stopAnimation();
        filterBaseValueRef.current = filterCurrentValueRef.current;
        filterGestureOffsetRef.current = gs.dy;
      },
      onPanResponderMove: (_, gs) => {
        const adjustedDy = gs.dy - filterGestureOffsetRef.current;
        const newVal = Math.max(
          0,
          Math.min(
            1,
            filterBaseValueRef.current + adjustedDy / FILTER_ANIM_MAX_HEIGHT,
          ),
        );
        filterAnim.setValue(newVal);
      },
      onPanResponderRelease: (_, gs) => {
        const currentVal = filterCurrentValueRef.current;
        let shouldExpand: boolean;
        if (Math.abs(gs.vy) > 0.4) {
          shouldExpand = gs.vy > 0;
        } else {
          shouldExpand = currentVal > 0.5;
        }
        toggleFiltersRef.current(shouldExpand);
      },
      onPanResponderTerminate: () => {
        toggleFiltersRef.current(filterCurrentValueRef.current > 0.5);
      },
    }),
  ).current;

  const filterContentMaxHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });
  const filterContentOpacity = filterAnim;
  const filterHintMaxHeight = filterAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [24, 0, 0],
  });
  const filterHintOpacity = filterAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0, 0],
  });

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === "all") return null;
    const category = allCategories.find((c) => c.id === selectedCategoryId);
    return category?.name ?? null;
  }, [selectedCategoryId, allCategories]);

  const baseFilteredProducts = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return allProducts.filter((product) => {
      const matchesCategory =
        selectedCategoryName == null ||
        product.category === selectedCategoryName;
      const matchesBrand =
        selectedBrand === "all" || product.brand === selectedBrand;
      const matchesName =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.brand ?? "").toLowerCase().includes(q);

      return matchesCategory && matchesBrand && matchesName;
    });
  }, [allProducts, selectedCategoryName, selectedBrand, nameQuery]);

  const filteredProducts = useMemo(() => {
    if (selectedStoreId === "all") return baseFilteredProducts;
    return baseFilteredProducts.filter((p) => storeScopedProductIds.has(p.id));
  }, [baseFilteredProducts, selectedStoreId, storeScopedProductIds]);

  const safeNearbyStores = useMemo(() => {
    return Array.isArray(nearbyStores) ? nearbyStores : [];
  }, [nearbyStores]);

  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    allProducts.forEach((p) => {
      if (p.brand?.trim()) brands.add(p.brand.trim());
    });
    return [
      "all",
      ...Array.from(brands).sort((a, b) => a.localeCompare(b, "es")),
    ];
  }, [allProducts]);

  const loadNearbyStores = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setNearbyStores([]);
        return;
      }

      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const radius =
        profile?.searchRadiusKm ?? profile?.max_search_radius_km ?? 5;
      const stores = await storeService.getNearby(
        pos.coords.latitude,
        pos.coords.longitude,
        radius,
      );
      setNearbyStores(stores);
    } catch {
      setNearbyStores([]);
    }
  }, [profile]);

  const loadCategories = useCallback(async () => {
    const categoryTree = await productService.getCategories();
    const leaves = flattenLeafCategories(categoryTree);
    setAllCategories(leaves);
  }, []);

  const loadProductsPage = useCallback(async (page: number, reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMoreProducts(true);
    }

    try {
      const response = await productService.list({ page });
      setAllProducts((prev) => {
        if (reset) {
          return response.results;
        }

        const byId = new Map<string, Product>();
        prev.forEach((product) => byId.set(product.id, product));
        response.results.forEach((product) => byId.set(product.id, product));
        return Array.from(byId.values());
      });
      setProductsPage(page);
      setHasMoreProducts(Boolean(response.next));
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        setIsLoadingMoreProducts(false);
      }
    }
  }, []);

  const loadUserLists = useCallback(async () => {
    try {
      const lists = await listService.getLists();
      setUserLists(lists);
    } catch {
      setUserLists([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCategories(),
      loadProductsPage(1, true),
      loadNearbyStores(),
      loadUserLists(),
    ]);
  }, [loadCategories, loadProductsPage, loadNearbyStores, loadUserLists]);

  // D-08: Seed search query from ?q= URL param on mount (web only)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setNameQuery(q);
  }, []);

  // D-08: Reflect search query in ?q= URL param as user types (web only)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (nameQuery) {
      // @ts-ignore — web-only API
      window.history.replaceState(
        null,
        "",
        `?q=${encodeURIComponent(nameQuery)}`,
      );
    } else {
      // @ts-ignore — web-only API
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [nameQuery]);

  // D-07: Copy current URL to clipboard (share button, web only)
  const handleShareUrl = useCallback(async () => {
    if (Platform.OS !== "web") return;
    // @ts-ignore — web-only API
    await copyToClipboard(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setPriceByProductId({});
      setLoadingPriceIds(new Set());
      requestedPriceIdsRef.current = new Set();
      await Promise.all([
        loadProductsPage(1, true),
        loadNearbyStores(),
        loadUserLists(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadProductsPage, loadNearbyStores, loadUserLists]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const handleLoadMoreProducts = useCallback(async () => {
    if (
      isLoading ||
      isRefreshing ||
      isLoadingMoreProducts ||
      !hasMoreProducts
    ) {
      return;
    }
    await loadProductsPage(productsPage + 1, false);
  }, [
    hasMoreProducts,
    isLoading,
    isLoadingMoreProducts,
    isRefreshing,
    loadProductsPage,
    productsPage,
  ]);

  const fetchLowestPrice = useCallback(async (productId: string) => {
    // Guard estable: si ya se pidió (en curso o resuelto) no se repite.
    if (requestedPriceIdsRef.current.has(productId)) {
      return;
    }
    requestedPriceIdsRef.current.add(productId);

    setLoadingPriceIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
    try {
      const rows = await priceService.getPriceComparison(productId);
      const prices = rows
        .map((row) => {
          const candidate = [row.promo_price, row.offer_price, row.price]
            .filter(Boolean)
            .map((value) => parseFloat(String(value)));
          return candidate.length > 0 ? Math.min(...candidate) : null;
        })
        .filter((value): value is number => value !== null);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      setPriceByProductId((prev) => ({ ...prev, [productId]: minPrice }));
    } catch {
      setPriceByProductId((prev) => ({ ...prev, [productId]: null }));
    } finally {
      setLoadingPriceIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, []);

  // Carga el mejor precio de TODOS los productos cargados (no solo los 20
  // primeros), de modo que los items traídos por paginación (onEndReached)
  // también muestren la comparativa. Concurrencia acotada para evitar ráfagas.
  useEffect(() => {
    const pending = filteredProducts.filter(
      (product) => !requestedPriceIdsRef.current.has(product.id),
    );
    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    const tasks = pending.map((product) => async () => {
      if (cancelled) return;
      await fetchLowestPrice(product.id);
    });
    void runWithConcurrency(tasks, PRICE_FETCH_CONCURRENCY);

    return () => {
      cancelled = true;
    };
  }, [filteredProducts, fetchLowestPrice]);

  const handleOpenProduct = useCallback(
    (product: Product) => {
      (navigation as any).navigate("PriceCompare", {
        productId: product.id,
        productName: product.name,
        product,
      });
    },
    [navigation],
  );

  const sortedLists = useMemo(() => {
    if (!preferredListId) {
      return userLists;
    }
    return [...userLists].sort((a, b) => {
      if (a.id === preferredListId) return -1;
      if (b.id === preferredListId) return 1;
      return a.name.localeCompare(b.name, "es");
    });
  }, [preferredListId, userLists]);

  const handleOpenListPicker = useCallback(
    (product: Product) => {
      if (userLists.length === 0) {
        setToastMessage("Primero crea una lista para poder añadir productos.");
        return;
      }
      blurActiveElementOnWeb();
      setPendingProduct(product);
      setSelectedQuantity(1);
      setPickerVisible(true);
    },
    [userLists.length],
  );

  const getQuickQuantity = useCallback(
    (productId: string): number => quickQuantityByProductId[productId] ?? 1,
    [quickQuantityByProductId],
  );

  const handleIncreaseQuickQuantity = useCallback((productId: string) => {
    setQuickQuantityByProductId((prev) => ({
      ...prev,
      [productId]: Math.min(99, (prev[productId] ?? 1) + 1),
    }));
  }, []);

  const handleDecreaseQuickQuantity = useCallback((productId: string) => {
    setQuickQuantityByProductId((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] ?? 1) - 1),
    }));
  }, []);

  const handleQuickAddToPreferredList = useCallback(
    async (product: Product, listId: string) => {
      const quantity = getQuickQuantity(product.id);
      try {
        await listService.addItem(listId, { name: product.name, quantity });
        setToastMessage(
          `${product.name} añadido (x${quantity}) a la lista actual.`,
        );
      } catch {
        setToastMessage("No se pudo añadir el producto a la lista.");
      }
    },
    [getQuickQuantity],
  );

  const handleAddFromCard = useCallback(
    (product: Product) => {
      if (preferredListId) {
        void handleQuickAddToPreferredList(product, preferredListId);
        return;
      }
      handleOpenListPicker(product);
    },
    [handleOpenListPicker, handleQuickAddToPreferredList, preferredListId],
  );

  const handleAddToList = useCallback(
    async (listId: string) => {
      if (!pendingProduct) {
        return;
      }

      setAddingToListId(listId);
      try {
        await listService.addItem(listId, {
          name: pendingProduct.name,
          quantity: selectedQuantity,
        });
        setPickerVisible(false);
        setToastMessage(
          `${pendingProduct.name} añadido (x${selectedQuantity}) a tu lista.`,
        );
      } catch {
        setToastMessage("No se pudo añadir el producto a la lista.");
      } finally {
        setAddingToListId(null);
      }
    },
    [pendingProduct, selectedQuantity],
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => {
      clearTimeout(timer);
    };
  }, [toastMessage]);

  useEffect(() => {
    let cancelled = false;

    const runStoreFilter = async () => {
      if (selectedStoreId === "all") {
        setStoreScopedProductIds(new Set());
        setIsStoreFiltering(false);
        return;
      }

      if (baseFilteredProducts.length === 0) {
        setStoreScopedProductIds(new Set());
        setIsStoreFiltering(false);
        return;
      }

      setIsStoreFiltering(true);
      const targetStoreId = Number(selectedStoreId);

      const tasks = baseFilteredProducts.map((product) => async () => {
        try {
          const compareRows = await priceService.getPriceComparison(product.id);
          const existsInStore = compareRows.some(
            (row) => row.store_id === targetStoreId,
          );
          return existsInStore ? product.id : null;
        } catch {
          return null;
        }
      });

      const results = await runWithConcurrency(tasks, STORE_FILTER_CONCURRENCY);
      if (cancelled) return;

      const ids = new Set<string>();
      results.forEach((id) => {
        if (id) ids.add(id);
      });
      setStoreScopedProductIds(ids);
      setIsStoreFiltering(false);
    };

    void runStoreFilter();

    return () => {
      cancelled = true;
    };
  }, [selectedStoreId, baseFilteredProducts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          {/* D-06: Cmd/Ctrl+K hint tooltip on web; flex:1 so bar fills row */}
          <View style={{ flex: 1 }}>
            <WebTooltip label="⌘K / Ctrl+K">
              <SearchBar
                ref={searchInputRef}
                value={nameQuery}
                onChangeText={setNameQuery}
                placeholder="Buscar por nombre…"
                onFilterPress={() => undefined}
              />
            </WebTooltip>
          </View>
          {/* D-07/D-08: Share button (web only, when query is active) */}
          {Platform.OS === "web" && nameQuery.length > 0 && (
            <TouchableOpacity
              style={[
                styles.shareBtn,
                shareCopied && { backgroundColor: colors.success },
              ]}
              onPress={() => {
                void handleShareUrl();
              }}
              accessibilityRole="button"
              accessibilityLabel="Compartir enlace"
            >
              <WebTooltip label="Copiar enlace">
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={shareCopied ? colors.white : colors.primary}
                />
              </WebTooltip>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersPanel} {...filterPanResponder.panHandlers}>
          <View style={styles.filtersHeaderButton}>
            <Text style={styles.filtersHeaderTitle}>Filtros</Text>
            <View style={styles.filtersHeaderRight}>
              <Text style={styles.filtersHeaderCount}>
                {filteredProducts.length}
              </Text>
            </View>
          </View>

          <Animated.View
            style={{
              maxHeight: filterContentMaxHeight,
              opacity: filterContentOpacity,
              overflow: "hidden",
            }}
          >
            <Text style={styles.filterTitle}>Categoría</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <FilterChip
                label="Todas"
                active={selectedCategoryId === "all"}
                onPress={() => setSelectedCategoryId("all")}
              />
              {allCategories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.name}
                  active={selectedCategoryId === category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterTitle}>Marca</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {brandOptions.map((brand) => (
                <FilterChip
                  key={brand}
                  label={brand === "all" ? "Todas" : brand}
                  active={selectedBrand === brand}
                  onPress={() => setSelectedBrand(brand)}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterTitle}>Tienda (dentro de tu radio)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <FilterChip
                label="Todas"
                active={selectedStoreId === "all"}
                onPress={() => setSelectedStoreId("all")}
              />
              {safeNearbyStores.map((store) => (
                <FilterChip
                  key={store.id}
                  label={store.name}
                  active={selectedStoreId === store.id}
                  onPress={() => setSelectedStoreId(store.id)}
                />
              ))}
            </ScrollView>

            {locationDenied && (
              <Text style={styles.helperText}>
                Activa ubicación para cargar tiendas dentro de tu radio.
              </Text>
            )}
          </Animated.View>

          <Animated.View
            style={{
              maxHeight: filterHintMaxHeight,
              opacity: filterHintOpacity,
              overflow: "hidden",
            }}
          >
            <Text style={styles.filtersCollapsedHint}>
              Pulsa para mostrar categoría, marca y tienda.
            </Text>
          </Animated.View>
        </View>

        {isStoreFiltering && (
          <View style={styles.storeFilterLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.storeFilterLoadingText}>
              Filtrando por tienda…
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonBox
              width="100%"
              height={64}
              borderRadius={12}
              style={styles.skeletonRow}
            />
            <SkeletonBox
              width="100%"
              height={64}
              borderRadius={12}
              style={styles.skeletonRow}
            />
            <SkeletonBox width="100%" height={64} borderRadius={12} />
          </View>
        ) : (
          // D-05: numColumns 2/3/4 by breakpoint; key required when numColumns changes (RN requirement)
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={
              breakpoint === "desktop" ? 4 : breakpoint === "tablet" ? 3 : 2
            }
            key={breakpoint === "desktop" ? 4 : breakpoint === "tablet" ? 3 : 2}
            renderItem={({ item }) => (
              <View style={{ flex: 1, padding: spacing.xs / 2 }}>
                <ProductRow
                  product={item}
                  lowestPrice={priceByProductId[item.id]}
                  isPriceLoading={loadingPriceIds.has(item.id)}
                  onPress={handleOpenProduct}
                  onAdd={handleAddFromCard}
                  quickMode={Boolean(preferredListId)}
                  quickQuantity={getQuickQuantity(item.id)}
                  onIncreaseQuickQuantity={handleIncreaseQuickQuantity}
                  onDecreaseQuickQuantity={handleDecreaseQuickQuantity}
                />
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshAll}
              />
            }
            contentContainerStyle={
              filteredProducts.length === 0
                ? styles.emptyContent
                : [
                    styles.listContent,
                    // planner discretion — reasonable centred-content width
                    breakpoint !== "mobile"
                      ? ({
                          maxWidth: 1200,
                          alignSelf: "center",
                          width: "100%",
                        } as const)
                      : undefined,
                  ]
            }
            onScrollBeginDrag={() => {
              if (filterExpandedRef.current) {
                toggleFiltersRef.current(false);
              }
            }}
            onEndReached={handleLoadMoreProducts}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMoreProducts ? (
                <View style={styles.loadMoreFooter}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={colors.textDisabled}
                />
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptySubtitle}>
                  Prueba otra combinación de filtros.
                </Text>
              </View>
            }
          />
        )}

        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setPickerVisible(false)}
          />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Añadir a lista</Text>
            <Text style={styles.pickerSubtitle} numberOfLines={2}>
              {pendingProduct ? pendingProduct.name : "Selecciona una lista"}
            </Text>

            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Cantidad</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                  accessibilityLabel="Reducir cantidad"
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{selectedQuantity}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() =>
                    setSelectedQuantity((q) => Math.min(99, q + 1))
                  }
                  accessibilityLabel="Aumentar cantidad"
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={sortedLists}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    preferredListId === item.id && styles.pickerRowPreferred,
                  ]}
                  onPress={() => {
                    void handleAddToList(item.id);
                  }}
                  disabled={addingToListId !== null}
                >
                  <View style={styles.pickerRowBody}>
                    <View style={styles.pickerRowTitleRow}>
                      <Text style={styles.pickerRowTitle}>{item.name}</Text>
                      {preferredListId === item.id ? (
                        <View style={styles.preferredBadge}>
                          <Text style={styles.preferredBadgeText}>
                            Lista actual
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.pickerRowMeta}>
                      {item.items?.length ?? 0} producto
                      {(item.items?.length ?? 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {addingToListId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.pickerSeparator} />
              )}
            />

            <TouchableOpacity
              style={styles.pickerCancelButton}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {toastMessage ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        {/* FAB — proponer producto (RF-019) */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => (navigation as any).navigate("ProductProposal")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  searchWrap: {
    paddingTop: 0,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filtersPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  filtersHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filtersHeaderTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  filtersHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  filtersHeaderCount: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filtersCollapsedHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.sm,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  chipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  helperText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  storeFilterLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  storeFilterLoadingText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  skeletonWrap: {
    marginTop: spacing.sm,
  },
  skeletonRow: {
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  loadMoreFooter: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  productRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  productIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  productBody: {
    flex: 1,
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
    marginTop: 3,
  },
  productPriceMeta: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 5,
  },
  addProductButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddContainer: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  quickQtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  quickQtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  quickQtyValue: {
    minWidth: 18,
    textAlign: "center",
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  pickerSheet: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    top: "20%",
    bottom: "20%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.elevated,
  },
  pickerTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  quantityLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    minWidth: 24,
    textAlign: "center",
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  pickerList: {
    flex: 1,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  pickerRowPreferred: {
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  pickerRowBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pickerRowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pickerRowTitle: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  preferredBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
  },
  preferredBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    color: colors.white,
  },
  pickerRowMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: colors.divider,
  },
  pickerCancelButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pickerCancelText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  toast: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    backgroundColor: colors.text,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "92%",
  },
  toastText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default ProductsCatalogScreen;
