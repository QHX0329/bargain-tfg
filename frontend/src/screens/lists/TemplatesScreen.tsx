/**
 * Pantalla de plantillas de lista de la compra.
 *
 * Muestra las plantillas del usuario y permite:
 *  - Crear una lista nueva a partir de una plantilla
 *  - Eliminar plantillas
 *  - Ver los productos de cada plantilla
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";

import {
  colors,
  spacing,
  borderRadius,
  fontFamilies,
  fontSize,
  shadows,
} from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { ListTemplate } from "@/types/domain";
import { listService } from "@/api/listService";
import { AppModal } from "@/components/ui/AppModal";

type Nav = NativeStackNavigationProp<ListsStackParamList, "Templates">;

// ─── TemplateCard ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: ListTemplate;
  onUse: (t: ListTemplate) => void;
  onDelete: (t: ListTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUse,
  onDelete,
}) => {
  const preview = template.items
    .slice(0, 3)
    .map((i) => i.product_name ?? `Producto #${i.product}`)
    .join(", ");
  const extra =
    template.item_count > 3 ? ` +${template.item_count - 3} más` : "";
  const createdDate = new Date(template.created_at).toLocaleDateString(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(320).easing(Easing.out(Easing.quad))}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.cardMeta}>
              {template.item_count} producto
              {template.item_count !== 1 ? "s" : ""} · {createdDate}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(template)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.error ?? "#E53E3E"}
            />
          </TouchableOpacity>
        </View>

        {template.item_count > 0 && (
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
            {extra}
          </Text>
        )}

        <TouchableOpacity
          style={styles.useBtn}
          onPress={() => onUse(template)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.white} />
          <Text style={styles.useBtnText}>Usar plantilla</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const TemplatesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de confirmación de borrado
  const [deleteTarget, setDeleteTarget] = useState<ListTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de uso: pedir nombre opcional para la nueva lista
  const [useTarget, setUseTarget] = useState<ListTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await listService.getTemplates();
      setTemplates(data);
    } catch {
      // silent — la pantalla mostrará vacío
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTemplates();
  }, [fetchTemplates]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await listService.deleteTemplate(deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch {
      Alert.alert(
        "Error",
        "No se pudo eliminar la plantilla. Inténtalo de nuevo.",
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const confirmUse = useCallback(async () => {
    if (!useTarget) return;
    setCreating(true);
    try {
      const newList = await listService.createListFromTemplate(useTarget.id);
      setUseTarget(null);
      navigation.navigate("ListDetail", {
        listId: String(newList.id),
        listName: newList.name,
      });
    } catch {
      Alert.alert("Error", "No se pudo crear la lista. Inténtalo de nuevo.");
    } finally {
      setCreating(false);
    }
  }, [useTarget, navigation]);

  const renderItem: ListRenderItem<ListTemplate> = useCallback(
    ({ item }) => (
      <TemplateCard
        template={item}
        onUse={(t) => setUseTarget(t)}
        onDelete={(t) => setDeleteTarget(t)}
      />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plantillas</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Cargando plantillas…</Text>
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Sin plantillas</Text>
          <Text style={styles.emptyText}>
            Guarda una lista como plantilla para reutilizarla aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Modal: confirmar eliminación */}
      <AppModal
        visible={deleteTarget !== null}
        title="Eliminar plantilla"
        message={`¿Seguro que quieres eliminar la plantilla "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal: confirmar uso (crear lista) */}
      <AppModal
        visible={useTarget !== null}
        title="Crear lista"
        message={`Se creará una nueva lista "${useTarget?.name}" con ${useTarget?.item_count ?? 0} producto${(useTarget?.item_count ?? 0) !== 1 ? "s" : ""}.`}
        confirmLabel={creating ? "Creando…" : "Crear lista"}
        cancelLabel="Cancelar"
        onConfirm={confirmUse}
        onCancel={() => setUseTarget(null)}
      />
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { padding: spacing.xs, width: 40 },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  cardMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  preview: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  useBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  useBtnText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
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
    lineHeight: 20,
  },
});

export default TemplatesScreen;
