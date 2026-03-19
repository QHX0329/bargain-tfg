/**
 * FavoriteStoresScreen — Lista de tiendas marcadas como favoritas.
 *
 * Carga las tiendas favoritas del usuario vía GET /stores/?favorites=true.
 * Permite quitar el favorito con un tap en el icono de corazón.
 * Pull-to-refresh para recargar.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { storeService } from "@/api/storeService";
import type { Store } from "@/types/domain";

// ─── Store card ───────────────────────────────────────────────────────────────

interface StoreCardProps {
  store: Store;
  onToggleFavorite: (store: Store) => void;
  onOpenProfile: (store: Store) => void;
  isRemoving: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onToggleFavorite,
  onOpenProfile,
  isRemoving,
}) => (
    <View style={[cardStyles.card, shadows.card]}>
      <TouchableOpacity
        style={cardStyles.left}
        onPress={() => onOpenProfile(store)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${store.name}`}
      >
        <View style={cardStyles.iconWrap}>
          <Ionicons name="storefront-outline" size={18} color={colors.primary} />
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {store.name}
          </Text>
          {store.address ? (
            <Text style={cardStyles.address} numberOfLines={1}>
              {store.address}
            </Text>
          ) : null}
          <Text style={cardStyles.chain}>
            {store.chain ? store.chain.charAt(0).toUpperCase() + store.chain.slice(1) : "Local"}
          </Text>
          <Text style={cardStyles.profileLink}>Ver perfil de tienda</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onToggleFavorite(store)}
        disabled={isRemoving}
        style={cardStyles.heartButton}
        accessibilityLabel="Quitar de favoritos"
      >
        <Ionicons
          name="heart"
          size={22}
          color={isRemoving ? colors.textDisabled : colors.error ?? "#E53E3E"}
        />
      </TouchableOpacity>
    </View>
  );

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export const FavoriteStoresScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await storeService.getFavorites();
      setStores(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load();
  }, [load]);

  const handleToggleFavorite = useCallback(async (store: Store) => {
    setRemovingId(store.id);
    try {
      await storeService.toggleFavorite(store.id);
      // Remove from list (toggling off)
      setStores((prev) => prev.filter((s) => s.id !== store.id));
    } catch {
      // silent
    } finally {
      setRemovingId(null);
    }
  }, []);

  const handleOpenProfile = useCallback(
    (store: Store) => {
      const fallbackLat = store.location?.coordinates?.[1] ?? 37.3886;
      const fallbackLng = store.location?.coordinates?.[0] ?? -5.9823;

      navigation.getParent()?.navigate('MapTab', {
        screen: 'StoreProfile',
        params: {
          storeId: store.id,
          storeName: store.name,
          userLat: fallbackLat,
          userLng: fallbackLng,
        },
      });
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBox
              key={i}
              width="100%"
              height={72}
              borderRadius={12}
              style={{ marginBottom: spacing.sm }}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (stores.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={48} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Sin tiendas favoritas</Text>
          <Text style={styles.emptyText}>
            Marca tiendas como favoritas desde el mapa para verlas aquí.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onToggleFavorite={handleToggleFavorite}
            onOpenProfile={handleOpenProfile}
            isRemoving={removingId === item.id}
          />
        )}
      />
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeletonWrap: {
    padding: spacing.md,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.xl,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  address: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  chain: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 1,
  },
  profileLink: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  heartButton: {
    padding: spacing.xs,
  },
});

export default FavoriteStoresScreen;
