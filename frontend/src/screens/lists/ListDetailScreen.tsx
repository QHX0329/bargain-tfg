/**
 * Pantalla de detalle de lista de la compra — conectada al API real.
 *
 * Muestra los productos de una lista con opción de:
 * - Marcar/desmarcar ítems (con actualización optimista)
 * - Eliminar ítems (con confirmación)
 * - Abrir catálogo para añadir productos
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, textStyles, borderRadius } from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { ShoppingListItem } from "@/types/domain";
import { listService } from "@/api/listService";
import type { ListCollaborator } from "@/api/listService";
import { useListStore } from "@/store/listStore";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { blurActiveElementOnWeb } from "@/utils/webA11y";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<ListsStackParamList, "ListDetail">;

// ─── Item row (extracted outside component for performance) ───────────────────

interface ItemRowProps {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (item: ShoppingListItem) => void;
  onIncreaseQuantity: (item: ShoppingListItem) => void;
  onDecreaseQuantity: (item: ShoppingListItem) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  onToggle,
  onDelete,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) => {
  // Backend enriched GET returns product_name; POST returns product as integer FK.
  // Support both shapes.
  const productName =
    item.product_name ??
    (typeof item.product === "object" && item.product !== null
      ? (item.product as { name?: string }).name
      : undefined) ??
    "Producto";
  const productUnit =
    typeof item.product === "object" && item.product !== null
      ? (item.product as { unit?: string }).unit
      : undefined;
  // Backend uses is_checked (snake_case); domain type alias is isChecked.
  const isChecked = item.isChecked ?? item.is_checked ?? false;

  const handleLongPress = useCallback(() => {
    Alert.alert(
      "¿Eliminar producto?",
      `¿Eliminar "${productName}" de la lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(item),
        },
      ],
    );
  }, [item, onDelete, productName]);

  return (
    <TouchableOpacity
      testID={`item-row-${item.id}`}
      style={styles.itemRow}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        testID={`checkbox-item-${item.id}`}
        onPress={() => onToggle(item)}
        style={styles.checkbox}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel={`Marcar ${productName}`}
      >
        <Ionicons
          name={isChecked ? "checkbox" : "square-outline"}
          size={22}
          color={isChecked ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>

      <View style={styles.itemContent}>
        <Text
          style={[styles.itemName, isChecked && styles.itemNameChecked]}
          numberOfLines={1}
        >
          {productName}
        </Text>
        <Text style={styles.itemMeta}>
          {`x${item.quantity}`}
          {productUnit ? ` · ${productUnit}` : ""}
          {item.note ? ` · ${item.note}` : ""}
        </Text>
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          testID={`decrease-item-${item.id}`}
          onPress={() => onDecreaseQuantity(item)}
          style={styles.quantityButton}
          accessibilityRole="button"
          accessibilityLabel={`Reducir cantidad de ${productName}`}
        >
          <Ionicons name="remove" size={14} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <TouchableOpacity
          testID={`increase-item-${item.id}`}
          onPress={() => onIncreaseQuantity(item)}
          style={styles.quantityButton}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar cantidad de ${productName}`}
        >
          <Ionicons name="add" size={14} color={colors.text} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// renderItem extracted outside component
function makeRenderItem(
  onToggle: (item: ShoppingListItem) => void,
  onDelete: (item: ShoppingListItem) => void,
  onIncreaseQuantity: (item: ShoppingListItem) => void,
  onDecreaseQuantity: (item: ShoppingListItem) => void,
): ListRenderItem<ShoppingListItem> {
  function renderItemRow({ item }: { item: ShoppingListItem }) {
    return (
      <ItemRow
        item={item}
        onToggle={onToggle}
        onDelete={onDelete}
        onIncreaseQuantity={onIncreaseQuantity}
        onDecreaseQuantity={onDecreaseQuantity}
      />
    );
  }
  return renderItemRow;
}

// ─── ListDetailScreen ─────────────────────────────────────────────────────────

export const ListDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listId, listName } = route.params;
  const { activeList, setActiveList, updateListItem } = useListStore();

  const [isLoading, setIsLoading] = useState(true);
  const [collabModalVisible, setCollabModalVisible] = useState(false);
  const [collaborators, setCollaborators] = useState<ListCollaborator[]>([]);
  const [collabUsername, setCollabUsername] = useState("");
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<number | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadCollaborators = useCallback(async () => {
    setIsLoadingCollaborators(true);
    try {
      const data = await listService.getCollaborators(listId);
      setCollaborators(data);
    } catch {
      setCollaborators([]);
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [listId]);

  // ─── Set screen title ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      title: listName,
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("ProductsCatalog", { listId, listName })}
            style={{ padding: 4 }}
            accessibilityLabel="Abrir catalogo de productos"
          >
            <Ionicons name="cube-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              blurActiveElementOnWeb();
              setCollabModalVisible(true);
              void loadCollaborators();
            }}
            style={{ padding: 4 }}
            accessibilityLabel="Gestionar colaboradores"
          >
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("OCR", { listId })}
            style={{ padding: 4 }}
            accessibilityLabel="Escanear ticket"
          >
            <Ionicons name="scan-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Route", { listId, listName })}
            style={{ padding: 4 }}
            accessibilityLabel="Optimizar ruta"
          >
            <Ionicons name="navigate-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, listId, listName, loadCollaborators]);

  const handleInviteCollaborator = useCallback(async () => {
    const username = collabUsername.trim();
    if (!username) {
      return;
    }

    setInviteError(null);
    setIsAddingCollaborator(true);
    try {
      await listService.addCollaborator(listId, username);
      setCollabUsername("");
      await loadCollaborators();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setInviteError("El usuario no existe");
      } else {
        setInviteError("No se pudo invitar al colaborador");
      }
    } finally {
      setIsAddingCollaborator(false);
    }
  }, [collabUsername, listId, loadCollaborators]);

  const handleRemoveCollaborator = useCallback(async (collaborator: ListCollaborator) => {
    setRemovingCollaboratorId(collaborator.user.id);
    try {
      await listService.removeCollaborator(listId, collaborator.user.id);
      await loadCollaborators();
    } catch {
      Alert.alert("Error", "No se pudo eliminar el colaborador.");
    } finally {
      setRemovingCollaboratorId(null);
    }
  }, [listId, loadCollaborators]);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listService.getList(listId);
      setActiveList(list);
    } catch {
      Alert.alert("Error", "No se pudo cargar la lista.");
    } finally {
      setIsLoading(false);
    }
  }, [listId, setActiveList]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useFocusEffect(
    useCallback(() => {
      void loadList();
    }, [loadList]),
  );

  // ─── Toggle item checked (optimistic update) ──────────────────────────────
  const handleToggleItem = useCallback(
    async (item: ShoppingListItem) => {
      // Resolve current checked state from either field name
      const currentChecked = item.isChecked ?? item.is_checked ?? false;
      // Optimistic update
      const updatedItem: ShoppingListItem = {
        ...item,
        isChecked: !currentChecked,
        is_checked: !currentChecked,
      };
      updateListItem(listId, updatedItem);

      try {
        const serverItem = await listService.updateItem(listId, item.id, {
          is_checked: !currentChecked,
        });
        // Merge: keep enriched fields (product_name, etc.) from the local item;
        // take is_checked and quantity from the server response.
        updateListItem(listId, {
          ...item,
          ...serverItem,
          product_name: item.product_name ?? serverItem.product_name,
          category_name: item.category_name ?? serverItem.category_name,
          isChecked: serverItem.is_checked ?? !currentChecked,
          is_checked: serverItem.is_checked ?? !currentChecked,
        });
      } catch {
        // Rollback optimistic update
        updateListItem(listId, item);
        Alert.alert("Error", "No se pudo actualizar el producto.");
      }
    },
    [listId, updateListItem],
  );

  // ─── Delete item ──────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await listService.deleteItem(listId, item.id);
        const currentList = useListStore.getState().activeList;
        if (currentList) {
          setActiveList({
            ...currentList,
            items: currentList.items.filter((i) => i.id !== item.id),
          });
        }
      } catch {
        Alert.alert("Error", "No se pudo eliminar el producto.");
      }
    },
    [listId, setActiveList],
  );

  const handleIncreaseQuantity = useCallback(
    async (item: ShoppingListItem) => {
      const nextQuantity = item.quantity + 1;
      const optimisticItem: ShoppingListItem = {
        ...item,
        quantity: nextQuantity,
      };
      updateListItem(listId, optimisticItem);

      try {
        const serverItem = await listService.updateItem(listId, item.id, {
          quantity: nextQuantity,
        });
        updateListItem(listId, {
          ...item,
          ...serverItem,
          product_name: item.product_name ?? serverItem.product_name,
          category_name: item.category_name ?? serverItem.category_name,
        });
      } catch {
        updateListItem(listId, item);
        Alert.alert("Error", "No se pudo actualizar la cantidad.");
      }
    },
    [listId, updateListItem],
  );

  const handleDecreaseQuantity = useCallback(
    async (item: ShoppingListItem) => {
      const nextQuantity = item.quantity - 1;

      if (nextQuantity <= 0) {
        await handleDeleteItem(item);
        return;
      }

      const optimisticItem: ShoppingListItem = {
        ...item,
        quantity: nextQuantity,
      };
      updateListItem(listId, optimisticItem);

      try {
        const serverItem = await listService.updateItem(listId, item.id, {
          quantity: nextQuantity,
        });
        updateListItem(listId, {
          ...item,
          ...serverItem,
          product_name: item.product_name ?? serverItem.product_name,
          category_name: item.category_name ?? serverItem.category_name,
        });
      } catch {
        updateListItem(listId, item);
        Alert.alert("Error", "No se pudo actualizar la cantidad.");
      }
    },
    [handleDeleteItem, listId, updateListItem],
  );

  const renderItem = makeRenderItem(
    handleToggleItem,
    handleDeleteItem,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
  );
  const items = activeList?.items ?? [];

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  const skeletonItems = isLoading ? (
    <View style={styles.skeletonContainer}>
      <SkeletonBox testID="skeleton-item-0" width="100%" height={48} borderRadius={8} style={styles.skeletonRow} />
      <SkeletonBox testID="skeleton-item-1" width="100%" height={48} borderRadius={8} style={styles.skeletonRow} />
      <SkeletonBox testID="skeleton-item-2" width="100%" height={48} borderRadius={8} style={styles.skeletonRow} />
      <SkeletonBox testID="skeleton-item-3" width="100%" height={48} borderRadius={8} style={styles.skeletonRow} />
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* Items section */}
      {isLoading ? (
        skeletonItems
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            items.length === 0
              ? styles.emptyContentContainer
              : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Añade productos desde el boton + del catalogo
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        testID="fab-open-product-catalog"
        style={styles.catalogFab}
        onPress={() => navigation.navigate("ProductsCatalog", { listId, listName })}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Añadir productos desde catalogo"
      >
        <Ionicons name="add" size={26} color={colors.white} />
      </TouchableOpacity>

      <Modal
        visible={collabModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCollabModalVisible(false)}
      >
        <View style={styles.collabOverlay}>
          <View style={styles.collabSheet}>
            <Text style={styles.collabTitle}>Colaboradores</Text>

            <View style={styles.collabInputRow}>
              <TextInput
                value={collabUsername}
                onChangeText={(text) => { setCollabUsername(text); setInviteError(null); }}
                placeholder="Nombre de usuario"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={styles.collabInput}
              />
              <TouchableOpacity
                style={styles.collabAddButton}
                onPress={handleInviteCollaborator}
                disabled={isAddingCollaborator}
              >
                {isAddingCollaborator ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="person-add-outline" size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
            {inviteError ? (
              <Text style={styles.inviteError}>{inviteError}</Text>
            ) : null}

            {isLoadingCollaborators ? (
              <View style={styles.collabLoadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={collaborators}
                keyExtractor={(item) => String(item.id)}
                style={styles.collabList}
                renderItem={({ item }) => (
                  <View style={styles.collabRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.collabUsername}>{item.user.username}</Text>
                      <Text style={styles.collabMeta}>
                        Invitado por {item.invited_by?.username ?? "sistema"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        void handleRemoveCollaborator(item);
                      }}
                      disabled={removingCollaboratorId === item.user.id}
                      style={styles.collabRemoveButton}
                    >
                      {removingCollaboratorId === item.user.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.collabEmptyText}>Aun no hay colaboradores.</Text>
                }
              />
            )}

            <TouchableOpacity
              style={styles.collabCloseButton}
              onPress={() => setCollabModalVisible(false)}
            >
              <Text style={styles.collabCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  skeletonRow: {
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyContentContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    ...textStyles.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  headerBadge: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 48,
  },
  checkbox: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  itemName: {
    ...textStyles.bodyMedium,
    color: colors.text,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  itemMeta: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    minWidth: 18,
    textAlign: "center",
    ...textStyles.bodySmall,
    color: colors.text,
  },
  catalogFab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  collabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  collabSheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: "75%",
  },
  collabTitle: {
    ...textStyles.bodyLarge,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  collabInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  collabInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    ...textStyles.body,
  },
  collabAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  collabLoadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  collabList: {
    marginTop: spacing.sm,
  },
  collabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  collabUsername: {
    ...textStyles.bodyMedium,
    color: colors.text,
  },
  collabMeta: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  collabRemoveButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  collabEmptyText: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  collabCloseButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  collabCloseText: {
    ...textStyles.bodyMedium,
    color: colors.primary,
  },
  inviteError: {
    ...textStyles.bodySmall,
    color: colors.error ?? "#E53E3E",
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
});
