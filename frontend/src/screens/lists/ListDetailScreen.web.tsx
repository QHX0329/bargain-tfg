/**
 * Variante WEB de la pantalla de detalle de lista (D-10 divergencia estructural).
 *
 * El bundler de Metro/RN-Web resuelve este archivo `.web.tsx` en lugar de
 * `ListDetailScreen.tsx` cuando Platform.OS === 'web'. Añade reordenación por
 * arrastrar y soltar (HTML5 DragEvents) sobre el estado LOCAL de la lista.
 *
 * IMPORTANTE — la reordenación es OPTIMISTA y SOLO de sesión: el nuevo orden
 * vive únicamente en el estado de React de esta pantalla y NO se persiste en el
 * backend (no se llama a listService para reordenar, no hay updateItemOrder).
 * La persistencia del orden queda fuera de alcance de la Fase 13 (requeriría
 * exponer la columna `ordering` en ShoppingListItemSerializer). El orden se
 * reinicia al recargar/remontar.
 *
 * Reutiliza listService directamente para el CRUD de ítems (igual que la
 * variante nativa) y expone exportar/compartir/Enter/Esc de la misma forma.
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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, textStyles, borderRadius, shadows } from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { ShoppingListItem } from "@/types/domain";
import { listService } from "@/api/listService";
import { useListStore } from "@/store/listStore";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { WebTooltip } from "@/components/ui";
import { downloadFile, copyToClipboard, todayStamp } from "@/utils/webExport";

type Props = NativeStackScreenProps<ListsStackParamList, "ListDetail">;

export const ListDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listId, listName } = route.params;
  const { activeList, setActiveList, updateListItem } = useListStore();

  const [isLoading, setIsLoading] = useState(true);
  const [addPanelVisible, setAddPanelVisible] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  // Orden local (solo sesión) — refleja el reordenado por drag-drop sin persistir
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [order, setOrder] = useState<string[]>([]);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: listName,
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ProductsCatalog", { listId, listName })
            }
            style={{ padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Abrir catalogo de productos"
          >
            <Ionicons name="cube-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("OCR", { listId })}
            style={{ padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Escanear ticket"
          >
            <Ionicons name="scan-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Route", { listId, listName })}
            style={{ padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Optimizar ruta"
          >
            <Ionicons
              name="navigate-outline"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, listId, listName]);

  // ─── Orden de ítems (local, sesión) ───────────────────────────────────────
  const rawItems = activeList?.items ?? [];
  // Sincroniza el orden local cuando cambian los ítems del servidor
  useEffect(() => {
    setOrder(rawItems.map((i) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawItems.length]);

  const items: ShoppingListItem[] =
    order.length === rawItems.length
      ? order
          .map((id) => rawItems.find((i) => i.id === id))
          .filter((i): i is ShoppingListItem => Boolean(i))
      : rawItems;

  // reorder(from,to): reordena SOLO el estado local (optimista, sin API)
  const reorder = useCallback(
    (from: number | null, to: number) => {
      if (from === null || from === to) return;
      setOrder((prev) => {
        const base =
          prev.length === items.length ? prev : items.map((i) => i.id);
        const next = [...base];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      setDragIndex(null);
    },
    [items],
  );

  // ─── CRUD de ítems (reutiliza listService, igual que la variante nativa) ───
  const handleToggleItem = useCallback(
    async (item: ShoppingListItem) => {
      const currentChecked = item.isChecked ?? item.is_checked ?? false;
      updateListItem(listId, {
        ...item,
        isChecked: !currentChecked,
        is_checked: !currentChecked,
      });
      try {
        const serverItem = await listService.updateItem(listId, item.id, {
          is_checked: !currentChecked,
        });
        updateListItem(listId, {
          ...item,
          ...serverItem,
          name: serverItem.name ?? item.name,
          isChecked: serverItem.is_checked ?? !currentChecked,
          is_checked: serverItem.is_checked ?? !currentChecked,
        });
      } catch {
        updateListItem(listId, item);
        Alert.alert("Error", "No se pudo actualizar el producto.");
      }
    },
    [listId, updateListItem],
  );

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

  const handleChangeQuantity = useCallback(
    async (item: ShoppingListItem, delta: number) => {
      const nextQuantity = item.quantity + delta;
      if (nextQuantity <= 0) {
        await handleDeleteItem(item);
        return;
      }
      updateListItem(listId, { ...item, quantity: nextQuantity });
      try {
        const serverItem = await listService.updateItem(listId, item.id, {
          quantity: nextQuantity,
        });
        updateListItem(listId, {
          ...item,
          ...serverItem,
          name: serverItem.name ?? item.name,
        });
      } catch {
        updateListItem(listId, item);
        Alert.alert("Error", "No se pudo actualizar la cantidad.");
      }
    },
    [handleDeleteItem, listId, updateListItem],
  );

  const handleQuickAdd = useCallback(async () => {
    const name = quickAddName.trim();
    if (!name) return;
    setIsQuickAdding(true);
    try {
      await listService.addItem(listId, { name, quantity: 1 });
      setQuickAddName("");
      setAddPanelVisible(false);
      await loadList();
    } catch {
      Alert.alert("Error", "No se pudo añadir el producto.");
    } finally {
      setIsQuickAdding(false);
    }
  }, [quickAddName, listId, loadList]);

  // ─── Exportar / compartir / Escape (D-07/D-08/D-06) ───────────────────────
  const handleExportList = useCallback(() => {
    const body = items
      .map((i) => `${i.quantity}x ${i.name ?? i.product_name ?? "Producto"}`)
      .join("\n");
    downloadFile(
      body,
      `bargain-lista-${todayStamp()}.txt`,
      "text/plain;charset=utf-8;",
    );
  }, [items]);

  const handleShareUrl = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 1500);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddPanelVisible(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Barra de acciones web: exportar lista + compartir enlace */}
      <View style={styles.webToolbar}>
        <WebTooltip label="Descargar lista en .txt">
          <TouchableOpacity
            style={styles.webToolbarBtn}
            onPress={handleExportList}
            accessibilityRole="button"
            accessibilityLabel="Exportar lista"
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.webToolbarText}>Exportar lista</Text>
          </TouchableOpacity>
        </WebTooltip>
        <WebTooltip label="Copiar enlace">
          <TouchableOpacity
            style={styles.webToolbarBtn}
            onPress={handleShareUrl}
            accessibilityRole="button"
            accessibilityLabel="Compartir enlace"
          >
            <Ionicons
              name={shareSuccess ? "checkmark" : "share-social-outline"}
              size={20}
              color={shareSuccess ? colors.success : colors.primary}
            />
            <Text
              style={[
                styles.webToolbarText,
                shareSuccess && { color: colors.success },
              ]}
            >
              {shareSuccess ? "¡Copiado!" : "Compartir"}
            </Text>
          </TouchableOpacity>
        </WebTooltip>
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonBox
            width="100%"
            height={48}
            borderRadius={8}
            style={styles.skeletonRow}
          />
          <SkeletonBox
            width="100%"
            height={48}
            borderRadius={8}
            style={styles.skeletonRow}
          />
          <SkeletonBox
            width="100%"
            height={48}
            borderRadius={8}
            style={styles.skeletonRow}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Añade productos desde el botón + del catálogo
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {items.map((item, index) => {
            const productName = item.name ?? item.product_name ?? "Producto";
            const isChecked = item.isChecked ?? item.is_checked ?? false;
            const isDragging = dragIndex === index;
            return (
              // react-native-web NO reenvía draggable/onDrag* a un <View>, así que
              // usamos un <div> DOM real (solo-web) que sí soporta HTML5 Drag&Drop;
              // el <View> interno conserva todo el estilo RN. El índice origen viaja
              // por dataTransfer para evitar closures obsoletos.
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(index));
                  e.dataTransfer.effectAllowed = "move";
                  setDragIndex(index);
                }}
                // preventDefault en onDragOver es OBLIGATORIO o onDrop nunca dispara (Pitfall 6)
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  reorder(Number.isNaN(from) ? dragIndex : from, index);
                }}
                onDragEnd={() => setDragIndex(null)}
                style={{ cursor: "grab" }}
              >
                <View
                  style={[styles.itemRow, isDragging && styles.itemRowDragging]}
                >
                  <WebTooltip label="Arrastra para reordenar">
                    <View style={styles.dragHandle}>
                      <Ionicons
                        name="reorder-three"
                        size={20}
                        color={colors.textMuted}
                      />
                    </View>
                  </WebTooltip>

                  <TouchableOpacity
                    onPress={() => handleToggleItem(item)}
                    style={styles.checkbox}
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
                      style={[
                        styles.itemName,
                        isChecked && styles.itemNameChecked,
                      ]}
                      numberOfLines={1}
                    >
                      {productName}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {`x${item.quantity}`}
                      {item.note ? ` · ${item.note}` : ""}
                    </Text>
                  </View>

                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => handleChangeQuantity(item, -1)}
                      style={styles.quantityButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Reducir cantidad de ${productName}`}
                    >
                      <Ionicons name="remove" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => handleChangeQuantity(item, 1)}
                      style={styles.quantityButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar cantidad de ${productName}`}
                    >
                      <Ionicons name="add" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      style={styles.quantityButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${productName}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </div>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        testID="fab-open-product-catalog"
        style={styles.catalogFab}
        onPress={() => setAddPanelVisible(true)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Añadir producto"
      >
        <Ionicons name="add" size={26} color={colors.white} />
      </TouchableOpacity>

      <Modal
        visible={addPanelVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddPanelVisible(false)}
      >
        <View style={styles.panelOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setAddPanelVisible(false)}
          />
          <View style={styles.panelSheet}>
            <Text style={styles.panelTitle}>Añadir producto</Text>
            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                placeholder="Nombre del producto..."
                placeholderTextColor={colors.textMuted}
                value={quickAddName}
                onChangeText={setQuickAddName}
                returnKeyType="done"
                onSubmitEditing={handleQuickAdd}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.quickAddBtn,
                  !quickAddName.trim() && styles.quickAddBtnDisabled,
                ]}
                onPress={handleQuickAdd}
                disabled={isQuickAdding || !quickAddName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Añadir producto"
              >
                {isQuickAdding ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.enterHint}>Pulsa Enter para añadir</Text>

            <TouchableOpacity
              style={styles.catalogOption}
              onPress={() => {
                setAddPanelVisible(false);
                navigation.navigate("ProductsCatalog", { listId, listName });
              }}
            >
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={styles.catalogOptionText}>
                Buscar en el catálogo
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  skeletonRow: { marginBottom: spacing.sm },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    // Centrado y estrecho en web (coherente con la lista responsive)
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
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
  webToolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  webToolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  webToolbarText: { ...textStyles.bodyMedium, color: colors.primary },
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
  // Elevación visual de la fila arrastrada (UI-SPEC)
  itemRowDragging: {
    ...shadows.elevated,
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  dragHandle: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    // @ts-ignore — cursor es prop CSS solo-web
    cursor: "grab",
  },
  checkbox: { width: 32, alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm },
  itemName: { ...textStyles.bodyMedium, color: colors.text },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  itemMeta: { ...textStyles.bodySmall, color: colors.textMuted, marginTop: 2 },
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
  },
  panelOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  panelSheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: "100%",
    maxWidth: 480,
  },
  panelTitle: {
    ...textStyles.bodyLarge,
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickAddRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  quickAddInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    ...textStyles.body,
    minHeight: 44,
  },
  quickAddBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddBtnDisabled: { backgroundColor: colors.textDisabled },
  enterHint: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  catalogOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 48,
  },
  catalogOptionText: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: colors.primary,
  },
});

export default ListDetailScreen;
