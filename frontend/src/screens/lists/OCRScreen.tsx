/**
 * [F4-15 / F4-16 / F5-05] Pantalla de captura OCR y revisión de productos escaneados.
 *
 * Flujo:
 *  1. Pantalla inicial con estado vacío: "Escanea tu lista o ticket"
 *  2. Usuario pulsa "Escanear lista" → expo-image-picker (cámara o galería)
 *  3. Imagen seleccionada → POST /api/v1/ocr/scan/ (multipart/form-data)
 *  4. Cargando → "Procesando imagen..." con SkeletonBox overlay
 *  5. Resultado → lista de items con badges de confianza, steppers de cantidad,
 *     checkboxes y nombre editable.
 *  6. CTA "Añadir a mi lista" → añade items seleccionados a la lista
 */

import React, { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { borderRadius, colors, fontFamilies, fontSize, shadows, spacing } from '@/theme';
import type { ListsStackParamList } from '@/navigation/types';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { scanImage } from '@/api/ocrService';
import type { OCRItem } from '@/api/ocrService';
import { listService } from '@/api/listService';

type RouteP = RouteProp<ListsStackParamList, 'OCR'>;

// ─── Types locaux ──────────────────────────────────────────────────────────────

interface LocalOCRItem extends OCRItem {
  localId: string;
  localQuantity: number;
  localName: string;   // nombre editable por el usuario
  checked: boolean;
}

// ─── OCR Item Row ──────────────────────────────────────────────────────────────

interface OCRItemRowProps {
  item: LocalOCRItem;
  onToggle: (localId: string) => void;
  onQuantityChange: (localId: string, quantity: number) => void;
  onNameChange: (localId: string, name: string) => void;
}

const OCRItemRow: React.FC<OCRItemRowProps> = ({
  item,
  onToggle,
  onQuantityChange,
  onNameChange,
}) => {
  const isHighConf = item.confidence >= 0.8;
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableOpacity
      style={[itemRowStyles.container, item.checked && itemRowStyles.containerChecked]}
      onPress={() => onToggle(item.localId)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      accessibilityLabel={item.localName}
    >
      {/* Checkbox */}
      <View style={[itemRowStyles.checkbox, item.checked && itemRowStyles.checkboxChecked]}>
        {item.checked && <Ionicons name="checkmark" size={14} color={colors.white} />}
      </View>

      {/* Left: raw text + confidence badge */}
      <View style={itemRowStyles.leftCol}>
        <Text style={itemRowStyles.rawText} numberOfLines={1}>{item.raw_text}</Text>
        <View style={[itemRowStyles.confBadge, isHighConf ? itemRowStyles.confBadgeHigh : itemRowStyles.confBadgeLow]}>
          <Text style={[itemRowStyles.confText, isHighConf ? itemRowStyles.confTextHigh : itemRowStyles.confTextLow]}>
            {isHighConf ? 'Coincidencia' : 'Sin coincidencia'} · {Math.round(item.confidence * 100)}%
          </Text>
        </View>
      </View>

      {/* Right: editable name + quantity stepper */}
      <View style={itemRowStyles.rightCol}>
        <TouchableOpacity
          style={itemRowStyles.nameEditRow}
          onPress={(e) => {
            e.stopPropagation?.();
            inputRef.current?.focus();
          }}
          accessibilityLabel="Editar nombre del producto"
        >
          <TextInput
            ref={inputRef}
            style={itemRowStyles.nameInput}
            value={item.localName}
            onChangeText={(text) => onNameChange(item.localId, text)}
            onPressIn={(e) => e.stopPropagation?.()}
            selectTextOnFocus
            returnKeyType="done"
            maxLength={80}
            accessibilityLabel={`Nombre del producto: ${item.localName}`}
          />
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
        </TouchableOpacity>

        <View style={itemRowStyles.stepper}>
          <TouchableOpacity
            style={itemRowStyles.stepBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onQuantityChange(item.localId, Math.max(1, item.localQuantity - 1));
            }}
          >
            <Ionicons name="remove" size={14} color={colors.text} />
          </TouchableOpacity>
          <Text style={itemRowStyles.stepValue}>{item.localQuantity}</Text>
          <TouchableOpacity
            style={itemRowStyles.stepBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onQuantityChange(item.localId, item.localQuantity + 1);
            }}
          >
            <Ionicons name="add" size={14} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const OCRScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { listId } = route.params;

  const [items, setItems] = useState<LocalOCRItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  const processPickerResult = async (uri: string) => {
    setLoading(true);
    setScanDone(false);
    try {
      const response = await scanImage(uri);
      const rawItems = (response as any)?.items ?? [];

      const localItems: LocalOCRItem[] = rawItems.map((item: OCRItem, idx: number) => ({
        ...item,
        localId: `ocr-${idx}`,
        localQuantity: item.quantity ?? 1,
        localName: item.matched_product_name ?? item.raw_text,
        checked: Boolean(item.matched_product_id),
      }));

      setItems(localItems);
      setScanDone(true);
    } catch (err: any) {
      Alert.alert('Error', 'Error al procesar la imagen. Inténtalo de nuevo con otra foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus.status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a la cámara o galería para escanear tu lista.');
        return;
      }
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
    await processPickerResult(pickerResult.assets[0].uri);
  };

  const handleCameraPress = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a la cámara para escanear tu lista.');
      return;
    }
    const pickerResult = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
    await processPickerResult(pickerResult.assets[0].uri);
  };

  const handleToggle = (localId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, checked: !item.checked } : item)),
    );
  };

  const handleQuantityChange = (localId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, localQuantity: quantity } : item)),
    );
  };

  const handleNameChange = (localId: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, localName: name } : item)),
    );
  };

  const handleAddToList = async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) {
      Alert.alert('Sin selección', 'Selecciona al menos un producto para añadir a la lista.');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        checked.map((item) =>
          listService.addItem(String(listId), {
            name: item.localName.trim() || item.raw_text,
            quantity: item.localQuantity,
          }),
        ),
      );
      Alert.alert(
        'Productos añadidos',
        `Se han añadido ${checked.length} producto${checked.length !== 1 ? 's' : ''} a tu lista.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'No se pudieron añadir los productos a la lista.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear lista</Text>
        {items.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <SkeletonBox width="80%" height={56} borderRadius={12} />
          <SkeletonBox width="80%" height={56} borderRadius={12} />
          <SkeletonBox width="80%" height={56} borderRadius={12} />
          <Text style={styles.loadingText}>Procesando imagen...</Text>
        </View>
      )}

      {/* Empty state: initial */}
      {!loading && !scanDone && (
        <View style={styles.emptyState}>
          <Animated.View entering={FadeInDown.springify()} style={styles.illustration}>
            <Ionicons name="receipt-outline" size={64} color={colors.primary} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.textBlock}>
            <Text style={styles.emptyTitle}>Escanea tu lista o ticket</Text>
            <Text style={styles.emptyBody}>
              Haz una foto a tu lista de compra escrita o a un ticket anterior. Reconoceremos los productos automáticamente.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.ctaGroup}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={handleCameraPress}
              accessibilityLabel="Abrir cámara para escanear"
            >
              <Ionicons name="camera" size={20} color={colors.white} />
              <Text style={styles.ctaPrimaryText}>Abrir cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={handleScanPress}
              accessibilityLabel="Escanear lista desde galería"
            >
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.ctaSecondaryText}>Escanear lista</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* No items recognized state */}
      {!loading && scanDone && items.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No encontramos productos</Text>
          <Text style={styles.emptyBody}>
            La imagen no contiene texto legible. Prueba con mejor iluminación o escribe los artículos manualmente.
          </Text>
          <TouchableOpacity style={styles.ctaPrimary} onPress={handleScanPress}>
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text style={styles.ctaPrimaryText}>Escanear lista</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Items list */}
      {!loading && scanDone && items.length > 0 && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.localId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                <OCRItemRow
                  item={item}
                  onToggle={handleToggle}
                  onQuantityChange={handleQuantityChange}
                  onNameChange={handleNameChange}
                />
              </Animated.View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />

          {/* Footer CTA */}
          <View style={styles.footer}>
            <Text style={styles.footerCount}>
              {items.filter((i) => i.checked).length} seleccionados
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, items.filter((i) => i.checked).length === 0 && styles.addBtnDisabled]}
              onPress={handleAddToList}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.white} />
              <Text style={styles.addBtnText}>Añadir a mi lista</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    color: colors.white,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  illustration: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.lg,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.xl,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  ctaGroup: {
    width: '100%',
    gap: spacing.sm,
    maxWidth: 320,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  ctaPrimaryText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.white,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  ctaSecondaryText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadows.elevated,
  },
  footerCount: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  addBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  addBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
});

const itemRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    minHeight: 64,
    ...shadows.card,
  },
  containerChecked: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  leftCol: {
    flex: 1,
    gap: 4,
  },
  rawText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  confBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  confBadgeHigh: {
    backgroundColor: colors.primary,
  },
  confBadgeLow: {
    backgroundColor: colors.surfaceVariant,
  },
  confText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
  },
  confTextHigh: {
    color: colors.white,
  },
  confTextLow: {
    color: colors.textMuted,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 110,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 140,
  },
  nameInput: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 28,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    height: 32,
  },
  stepBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
});
