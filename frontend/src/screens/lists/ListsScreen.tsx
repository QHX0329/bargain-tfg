/**
 * Pantalla de listas de la compra — conectada al API real.
 *
 * Muestra todas las listas del usuario, permite crear y eliminar listas,
 * y navega al detalle de cada lista al pulsarla.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, textStyles, borderRadius } from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { ShoppingList } from "@/types/domain";
import { listService } from "@/api/listService";
import { useListStore } from "@/store/listStore";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { AppModal } from "@/components/ui/AppModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListsScreenNavigationProp = NativeStackNavigationProp<
  ListsStackParamList,
  "Lists"
>;

// ─── List card (extracted to avoid inline function per list-performance rule) ─

interface ListCardProps {
  item: ShoppingList;
  onPress: (id: string, name: string) => void;
  /** Solicita al padre que muestre el modal de confirmación */
  onDeleteRequest: (id: string, name: string) => void;
  onRenameRequest: (id: string, name: string) => void;
  onSaveTemplateRequest: (id: string, name: string) => void;
}

const ListCard: React.FC<ListCardProps> = ({
  item,
  onPress,
  onDeleteRequest,
  onRenameRequest,
  onSaveTemplateRequest,
}) => {
  const handleDeletePress = useCallback(() => {
    onDeleteRequest(item.id, item.name);
  }, [item.id, item.name, onDeleteRequest]);

  const handleRenamePress = useCallback(() => {
    onRenameRequest(item.id, item.name);
  }, [item.id, item.name, onRenameRequest]);

  const handleSaveTemplatePress = useCallback(() => {
    onSaveTemplateRequest(item.id, item.name);
  }, [item.id, item.name, onSaveTemplateRequest]);

  const itemCount = item.items?.length ?? 0;
  const itemLabel = itemCount === 1 ? "1 producto" : `${itemCount} productos`;
  const rawDate = item.updated_at ?? item.updatedAt ?? "";
  const updatedDate = rawDate
    ? new Date(rawDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    : "";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id, item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          {itemLabel} · {updatedDate}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          testID={`rename-list-${item.id}`}
          onPress={handleRenamePress}
          style={styles.iconActionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Renombrar ${item.name}`}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          testID={`save-template-list-${item.id}`}
          onPress={handleSaveTemplatePress}
          style={styles.iconActionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Guardar ${item.name} como plantilla`}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          testID={`delete-list-${item.id}`}
          onPress={handleDeletePress}
          style={styles.iconActionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// renderItem extracted outside component to avoid new function per render
function makeRenderItem(
  onPress: (id: string, name: string) => void,
  onDeleteRequest: (id: string, name: string) => void,
  onRenameRequest: (id: string, name: string) => void,
  onSaveTemplateRequest: (id: string, name: string) => void,
): ListRenderItem<ShoppingList> {
  function renderListCard({ item }: { item: ShoppingList }) {
    return (
      <ListCard
        item={item}
        onPress={onPress}
        onDeleteRequest={onDeleteRequest}
        onRenameRequest={onRenameRequest}
        onSaveTemplateRequest={onSaveTemplateRequest}
      />
    );
  }
  return renderListCard;
}

// ─── ListsScreen ──────────────────────────────────────────────────────────────

export const ListsScreen: React.FC = () => {
  const navigation = useNavigation<ListsScreenNavigationProp>();
  const { lists, isLoading, setLists, addList, removeList, updateList } = useListStore();
  const [refreshing, setRefreshing] = useState(false);

  // ─── Modal: crear lista ──────────────────────────────────────────────────
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // ─── Modal: confirmar eliminación ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameLoading, setRenameLoading] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<{ id: string; name: string } | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // ─── Fetch on mount ──────────────────────────────────────────────────────
  const loadLists = useCallback(async () => {
    useListStore.setState({ isLoading: true });
    try {
      const data = await listService.getLists();
      setLists(data);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las listas.");
    } finally {
      useListStore.setState({ isLoading: false });
    }
  }, [setLists]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useFocusEffect(
    useCallback(() => {
      void loadLists();
    }, [loadLists]),
  );

  // ─── Pull-to-refresh ─────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listService.getLists();
      setLists(data);
    } catch {
      Alert.alert("Error", "No se pudieron actualizar las listas.");
    } finally {
      setRefreshing(false);
    }
  }, [setLists]);

  // ─── Create list ─────────────────────────────────────────────────────────
  const handleCreateConfirm = useCallback(async (name?: string) => {
    if (!name?.trim()) return;
    setCreateLoading(true);
    try {
      const newList = await listService.createList(name.trim());
      addList(newList);
      setCreateModalVisible(false);
      navigation.navigate("ListDetail", {
        listId: newList.id,
        listName: newList.name,
      });
    } catch {
      Alert.alert("Error", "No se pudo crear la lista.");
    } finally {
      setCreateLoading(false);
    }
  }, [addList, navigation]);

  // ─── Delete list ─────────────────────────────────────────────────────────
  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await listService.deleteList(deleteTarget.id);
      removeList(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      Alert.alert("Error", "No se pudo eliminar la lista.");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, removeList]);

  const handleRenameRequest = useCallback((id: string, name: string) => {
    setRenameTarget({ id, name });
  }, []);

  const handleRenameConfirm = useCallback(async (name?: string) => {
    if (!renameTarget || !name?.trim()) {
      return;
    }

    setRenameLoading(true);
    try {
      const updated = await listService.updateList(renameTarget.id, { name: name.trim() });
      updateList(updated);
      setRenameTarget(null);
    } catch {
      Alert.alert("Error", "No se pudo renombrar la lista.");
    } finally {
      setRenameLoading(false);
    }
  }, [renameTarget, updateList]);

  const handleSaveTemplateRequest = useCallback((id: string, name: string) => {
    setTemplateTarget({ id, name: `${name} (plantilla)` });
  }, []);

  const handleSaveTemplateConfirm = useCallback(async (name?: string) => {
    if (!templateTarget || !name?.trim()) {
      return;
    }

    setTemplateLoading(true);
    try {
      await listService.saveAsTemplate(templateTarget.id, name.trim());
      setTemplateTarget(null);
      Alert.alert("Plantilla creada", "La plantilla se ha guardado correctamente.");
    } catch {
      Alert.alert("Error", "No se pudo guardar la plantilla.");
    } finally {
      setTemplateLoading(false);
    }
  }, [templateTarget]);

  // ─── Navigate to detail ───────────────────────────────────────────────────
  const handlePressItem = useCallback(
    (id: string, name: string) => {
      navigation.navigate("ListDetail", { listId: id, listName: name });
    },
    [navigation],
  );

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderItem = makeRenderItem(
    handlePressItem,
    handleDeleteRequest,
    handleRenameRequest,
    handleSaveTemplateRequest,
  );

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>

        <View style={styles.header}>
          <Text style={styles.title}>Mis Listas</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <SkeletonBox
            testID="skeleton-list-0"
            width="100%"
            height={80}
            borderRadius={12}
            style={styles.skeletonItem}
          />
          <SkeletonBox
            testID="skeleton-list-1"
            width="100%"
            height={80}
            borderRadius={12}
            style={styles.skeletonItem}
          />
          <SkeletonBox
            testID="skeleton-list-2"
            width="100%"
            height={80}
            borderRadius={12}
            style={styles.skeletonItem}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Listas</Text>
      </View>

      <FlatList
        testID="lists-flatlist"
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          lists.length === 0 ? styles.emptyContentContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No tienes listas aún. ¡Crea tu primera lista!
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        testID="fab-create-list"
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Crear nueva lista"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Modal: crear lista */}
      <AppModal
        visible={createModalVisible}
        type="input"
        title="Nueva lista"
        message="¿Cómo quieres llamar a tu lista?"
        placeholder="Ej. Compra semanal"
        confirmLabel="Crear"
        cancelLabel="Cancelar"
        loading={createLoading}
        onConfirm={handleCreateConfirm}
        onCancel={() => setCreateModalVisible(false)}
        testID="modal-create-list"
      />

      {/* Modal: confirmar eliminación */}
      <AppModal
        visible={deleteTarget !== null}
        type="confirm"
        title="Eliminar lista"
        message={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        confirmVariant="danger"
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        testID="modal-delete-list"
      />

      <AppModal
        visible={renameTarget !== null}
        type="input"
        title="Renombrar lista"
        message="Introduce el nuevo nombre de la lista"
        placeholder="Nuevo nombre"
        defaultValue={renameTarget?.name ?? ""}
        confirmLabel="Guardar"
        cancelLabel="Cancelar"
        loading={renameLoading}
        onConfirm={handleRenameConfirm}
        onCancel={() => setRenameTarget(null)}
        testID="modal-rename-list"
      />

      <AppModal
        visible={templateTarget !== null}
        type="input"
        title="Guardar como plantilla"
        message="Nombre para la plantilla"
        placeholder="Ej. Compra mensual"
        defaultValue={templateTarget?.name ?? ""}
        confirmLabel="Guardar"
        cancelLabel="Cancelar"
        loading={templateLoading}
        onConfirm={handleSaveTemplateConfirm}
        onCancel={() => setTemplateTarget(null)}
        testID="modal-save-template"
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...textStyles.heading2,
    color: colors.text,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  skeletonItem: {
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
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
  },
  emptyText: {
    ...textStyles.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    minHeight: 80,
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardName: {
    ...textStyles.bodyLarge,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  cardMeta: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});
