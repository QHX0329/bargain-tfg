import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, fontFamilies, fontSize, borderRadius, shadows } from '@/theme';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { priceService } from '@/api/priceService';
import { productService } from '@/api/productService';
import type { HomeStackParamList } from '@/navigation/types';
import type { PriceAlert, Product } from '@/types/domain';
import { blurActiveElementOnWeb } from '@/utils/webA11y';

type Props = NativeStackScreenProps<HomeStackParamList, 'PriceAlerts'>;

function getAlertProduct(alert: PriceAlert): Product | null {
  if (typeof alert.product === 'object' && alert.product !== null) {
    return alert.product as Product;
  }
  return null;
}

function getAlertProductName(alert: PriceAlert): string {
  const product = getAlertProduct(alert);
  if (product?.name) {
    return product.name;
  }
  if (alert.product_name?.trim()) {
    return alert.product_name;
  }
  return `Producto #${String(alert.product)}`;
}

const PriceAlertRow: React.FC<{
  alert: PriceAlert;
  onPress: (alert: PriceAlert) => void;
}> = ({ alert, onPress }) => {
  const productName = getAlertProductName(alert);

  return (
    <TouchableOpacity
      testID={`price-alert-${alert.id}`}
      style={[styles.row, shadows.card]}
      onPress={() => onPress(alert)}
      activeOpacity={0.85}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="pricetag-outline" size={18} color={colors.accentDark} />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          Objetivo: €{Number(alert.target_price ?? 0).toFixed(2)}
          {alert.current_price != null
            ? ` · Actual: €${Number(alert.current_price).toFixed(2)}`
            : ''}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export const PriceAlertsScreen: React.FC<Props> = ({ navigation }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  const [editTargetPrice, setEditTargetPrice] = useState('');
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);
  const [isDeletingAlert, setIsDeletingAlert] = useState(false);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await priceService.getPriceAlerts();
      setAlerts(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useFocusEffect(
    useCallback(() => {
      void loadAlerts();
    }, [loadAlerts]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await priceService.getPriceAlerts();
      setAlerts(data);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const activeAlerts = alerts;

  useEffect(() => {
    const query = productQuery.trim();
    if (query.length < 2) {
      setProductSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const suggestions = await productService.autocomplete(query);
        setProductSuggestions(suggestions.slice(0, 6));
      } catch {
        setProductSuggestions([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [productQuery]);

  const handleOpenAlertModal = useCallback(
    (alert: PriceAlert) => {
      blurActiveElementOnWeb();
      setSelectedAlert(alert);
      setEditTargetPrice(Number(alert.target_price ?? 0).toFixed(2));
    },
    [],
  );

  const handleOpenCompare = useCallback(() => {
    if (!selectedAlert) {
      return;
    }

    const product = getAlertProduct(selectedAlert);
    const productId = product?.id ?? String(selectedAlert.product);
    const productName = getAlertProductName(selectedAlert);

    setSelectedAlert(null);
    navigation.navigate('PriceCompare', {
      productId: String(productId),
      productName,
    });
  }, [navigation, selectedAlert]);

  const handleUpdateAlert = useCallback(async () => {
    if (!selectedAlert) {
      return;
    }

    const parsedPrice = parseFloat(editTargetPrice.replace(',', '.'));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return;
    }

    setIsUpdatingAlert(true);
    try {
      const updated = await priceService.updatePriceAlert(String(selectedAlert.id), {
        target_price: parsedPrice.toFixed(2),
      });
      setAlerts((prev) =>
        prev.map((alert) =>
          String(alert.id) === String(updated.id) ? updated : alert,
        ),
      );
      setSelectedAlert(updated);
    } finally {
      setIsUpdatingAlert(false);
    }
  }, [editTargetPrice, selectedAlert]);

  const handleDeleteAlert = useCallback(async () => {
    if (!selectedAlert) {
      return;
    }

    setIsDeletingAlert(true);
    try {
      await priceService.deletePriceAlert(String(selectedAlert.id));
      setAlerts((prev) =>
        prev.filter((alert) => String(alert.id) !== String(selectedAlert.id)),
      );
      setSelectedAlert(null);
    } finally {
      setIsDeletingAlert(false);
    }
  }, [selectedAlert]);

  const resetCreateForm = useCallback(() => {
    setProductQuery('');
    setProductSuggestions([]);
    setSelectedProduct(null);
    setTargetPrice('');
  }, []);

  const handleCreateAlert = useCallback(async () => {
    const parsedPrice = parseFloat(targetPrice.replace(',', '.'));
    if (!selectedProduct || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return;
    }

    setIsCreatingAlert(true);
    try {
      await priceService.createPriceAlert({
        product: Number(selectedProduct.id),
        target_price: parsedPrice.toFixed(2),
      });
      const data = await priceService.getPriceAlerts();
      setAlerts(data);
      setCreateModalVisible(false);
      resetCreateForm();
    } finally {
      setIsCreatingAlert(false);
    }
  }, [selectedProduct, targetPrice, resetCreateForm]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <SkeletonBox width="100%" height={64} borderRadius={12} style={styles.skeleton} />
          <SkeletonBox width="100%" height={64} borderRadius={12} style={styles.skeleton} />
          <SkeletonBox width="100%" height={64} borderRadius={12} style={styles.skeleton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeAlerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={activeAlerts.length === 0 ? styles.emptyContainer : styles.listContent}
        renderItem={({ item }) => <PriceAlertRow alert={item} onPress={handleOpenAlertModal} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={28} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No tienes alertas activas</Text>
            <Text style={styles.emptyText}>Crea alertas desde la comparación de precios</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          blurActiveElementOnWeb();
          setCreateModalVisible(true);
        }}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Crear alerta de precio"
      >
        <Ionicons name="add" size={24} color={colors.white} />
      </TouchableOpacity>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCreateModalVisible(false);
          resetCreateForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva alerta de precio</Text>

            <TextInput
              value={productQuery}
              onChangeText={(text) => {
                setProductQuery(text);
                setSelectedProduct(null);
              }}
              placeholder="Buscar producto"
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
            />

            {productSuggestions.length > 0 && !selectedProduct && (
              <FlatList
                data={productSuggestions}
                keyExtractor={(item) => item.id}
                style={styles.suggestionsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionRow}
                    onPress={() => {
                      setSelectedProduct(item);
                      setProductQuery(item.name);
                      setProductSuggestions([]);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TextInput
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder="Precio objetivo (ej: 1.99)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCreateModalVisible(false);
                  resetCreateForm();
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCreateAlert}
                disabled={isCreatingAlert}
              >
                {isCreatingAlert ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAlert(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Detalle de alerta</Text>

            {selectedAlert ? (
              <>
                <Text style={styles.detailLabel}>Producto</Text>
                <Text style={styles.detailValue}>{getAlertProductName(selectedAlert)}</Text>

                <Text style={styles.detailLabel}>Precio actual</Text>
                <Text style={styles.detailValue}>
                  {selectedAlert.current_price != null
                    ? `€${Number(selectedAlert.current_price).toFixed(2)}`
                    : 'Sin precio disponible'}
                </Text>

                <Text style={styles.detailLabel}>Precio objetivo</Text>
                <TextInput
                  value={editTargetPrice}
                  onChangeText={setEditTargetPrice}
                  placeholder="Precio objetivo (ej: 1.99)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.modalInput}
                />

                <View style={styles.modalActionsBetween}>
                  <TouchableOpacity
                    style={styles.modalDangerButton}
                    onPress={handleDeleteAlert}
                    disabled={isDeletingAlert || isUpdatingAlert}
                  >
                    {isDeletingAlert ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.modalDangerText}>Eliminar</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleUpdateAlert}
                    disabled={isDeletingAlert || isUpdatingAlert}
                  >
                    {isUpdatingAlert ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.modalConfirmText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.modalSecondaryLink} onPress={handleOpenCompare}>
                  <Text style={styles.modalSecondaryLinkText}>Ver comparación de precios</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  skeleton: {
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  modalTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  suggestionsList: {
    maxHeight: 180,
    marginBottom: spacing.sm,
  },
  suggestionRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  suggestionText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalActionsBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalCancelText: {
    fontFamily: fontFamilies.bodyMedium,
    color: colors.textMuted,
  },
  modalConfirmButton: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.white,
  },
  detailLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalDangerButton: {
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.error,
  },
  modalDangerText: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.white,
  },
  modalSecondaryLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  modalSecondaryLinkText: {
    fontFamily: fontFamilies.bodyMedium,
    color: colors.primary,
  },
});

export default PriceAlertsScreen;
