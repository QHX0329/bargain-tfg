/**
 * [F4-15 / F4-16] Pantalla de captura OCR y revisión de productos escaneados.
 *
 * Tab 1 — Captura: botones para cámara/galería + animación de escaneo.
 * Tab 2 — Revisión: lista de ítems reconocidos con edición de nombre, cantidad y precio.
 *
 * Conecta con:
 *   POST /ocr/scan/ (pendiente F5-10) → items reconocidos
 *
 * Mientras el backend no esté disponible, usa datos mock tras simular el escaneo.
 */

import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
// expo-image-picker — TODO: install when OCR backend is ready (F5-10)
// import * as ImagePicker from "expo-image-picker";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import type { ListsStackParamList } from "@/navigation/types";
import type { OCRItem } from "@/types/domain";

type RouteP = RouteProp<ListsStackParamList, "OCR">;

// ─── Mock de resultados OCR ───────────────────────────────────────────────────

const MOCK_ITEMS: OCRItem[] = [
  { id: "1", raw_text: "LECHE CENTRAL LECHERA 1L", quantity: 2, price: 1.09, confidence: 0.94 },
  { id: "2", raw_text: "PAN BIMBO INTEGRAL 500G", quantity: 1, price: 1.65, confidence: 0.88 },
  { id: "3", raw_text: "ACEITE OLIVA KOIPE 750ML", quantity: 1, price: 7.45, confidence: 0.91 },
  { id: "4", raw_text: "YOGUR DANONE NATURAL X4", quantity: 2, price: 1.35, confidence: 0.72 },
  { id: "5", raw_text: "TOMATE FRITO HIDA 390G", quantity: 1, price: 0.99, confidence: 0.85 },
  { id: "6", raw_text: "?????????  0.49", quantity: 1, price: 0.49, confidence: 0.31 },
];

function confidenceColor(c: number): string {
  if (c >= 0.85) return colors.success;
  if (c >= 0.65) return colors.warning;
  return colors.error;
}

function confidenceLabel(c: number): string {
  if (c >= 0.85) return "Alta";
  if (c >= 0.65) return "Media";
  return "Baja";
}

// ─── Animación de escáner ─────────────────────────────────────────────────────

const ScanAnimation: React.FC = () => {
  const scanY = useSharedValue(0);

  React.useEffect(() => {
    scanY.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scanY]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  return (
    <Animated.View entering={FadeIn} style={scanStyles.container}>
      <View style={scanStyles.frame}>
        {/* Esquinas */}
        <View style={[scanStyles.corner, scanStyles.cornerTL]} />
        <View style={[scanStyles.corner, scanStyles.cornerTR]} />
        <View style={[scanStyles.corner, scanStyles.cornerBL]} />
        <View style={[scanStyles.corner, scanStyles.cornerBR]} />
        {/* Línea animada */}
        <Animated.View style={[scanStyles.scanLine, lineStyle]} />
      </View>
      <Text style={scanStyles.hint}>
        Apunta la cámara hacia el ticket de compra
      </Text>
    </Animated.View>
  );
};

// ─── Tab de captura ───────────────────────────────────────────────────────────

interface CaptureTabProps {
  onScanned: (items: OCRItem[]) => void;
}

const CaptureTab: React.FC<CaptureTabProps> = ({ onScanned }) => {
  const [scanning, setScanning] = useState(false);

  const simulateScan = async (_fromCamera: boolean) => {
    // TODO: integrate expo-image-picker when OCR backend is ready (F5-10)
    setScanning(true);
    // Simulamos el procesamiento OCR con 2s de delay
    setTimeout(() => {
      setScanning(false);
      onScanned(MOCK_ITEMS);
    }, 2000);
  };

  if (scanning) {
    return (
      <View style={captureStyles.container}>
        <ScanAnimation />
        <Text style={captureStyles.processingText}>Procesando imagen…</Text>
        <Text style={captureStyles.processingSubtext}>
          El OCR está reconociendo los productos del ticket
        </Text>
      </View>
    );
  }

  return (
    <View style={captureStyles.container}>
      {/* Ilustración */}
      <Animated.View entering={FadeInDown.springify()} style={captureStyles.illustration}>
        <View style={captureStyles.receiptIcon}>
          <Ionicons name="receipt-outline" size={64} color={colors.primary} />
        </View>
        <View style={captureStyles.cameraOverlay}>
          <Ionicons name="camera" size={24} color={colors.white} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={captureStyles.textBlock}>
        <Text style={captureStyles.title}>Escanea tu ticket</Text>
        <Text style={captureStyles.subtitle}>
          Fotografía un ticket de compra y BargAIn añadirá automáticamente los
          productos a tu lista.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={captureStyles.actions}>
        <TouchableOpacity
          style={captureStyles.btnPrimary}
          onPress={() => simulateScan(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={20} color={colors.white} />
          <Text style={captureStyles.btnPrimaryText}>Abrir cámara</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={captureStyles.btnSecondary}
          onPress={() => simulateScan(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={captureStyles.btnSecondaryText}>Elegir de galería</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).springify()} style={captureStyles.tipBox}>
        <Ionicons name="bulb-outline" size={14} color={colors.accent} />
        <Text style={captureStyles.tipText}>
          Mejor resultado: ticket sobre superficie plana, buena iluminación y sin arrugas.
        </Text>
      </Animated.View>

      <View style={captureStyles.mockBadge}>
        <Ionicons name="flask-outline" size={12} color={colors.info} />
        <Text style={captureStyles.mockText}>
          OCR backend en desarrollo — muestra datos de ejemplo
        </Text>
      </View>
    </View>
  );
};

// ─── Tab de revisión ──────────────────────────────────────────────────────────

interface ReviewTabProps {
  items: OCRItem[];
  onItemChange: (id: string, field: "raw_text" | "quantity" | "price", value: string | number) => void;
  onRemoveItem: (id: string) => void;
  onAddToList: () => void;
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  items, onItemChange, onRemoveItem, onAddToList,
}) => {
  if (items.length === 0) {
    return (
      <View style={reviewStyles.empty}>
        <Ionicons name="document-outline" size={48} color={colors.textMuted} />
        <Text style={reviewStyles.emptyTitle}>Sin resultados</Text>
        <Text style={reviewStyles.emptyBody}>Escanea un ticket para ver los productos aquí.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={reviewStyles.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <View style={[reviewStyles.card, item.confidence < 0.65 && reviewStyles.cardWarn]}>
              {/* Header con confianza */}
              <View style={reviewStyles.cardHeader}>
                <View
                  style={[
                    reviewStyles.confidenceBadge,
                    { backgroundColor: confidenceColor(item.confidence) + "22" },
                  ]}
                >
                  <View
                    style={[
                      reviewStyles.confidenceDot,
                      { backgroundColor: confidenceColor(item.confidence) },
                    ]}
                  />
                  <Text
                    style={[
                      reviewStyles.confidenceText,
                      { color: confidenceColor(item.confidence) },
                    ]}
                  >
                    Confianza {confidenceLabel(item.confidence)} ({Math.round(item.confidence * 100)}%)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onRemoveItem(item.id)}
                  style={reviewStyles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Nombre del producto */}
              <TextInput
                style={reviewStyles.nameInput}
                value={item.raw_text}
                onChangeText={(v) => onItemChange(item.id, "raw_text", v)}
                placeholder="Nombre del producto"
                placeholderTextColor={colors.textMuted}
              />

              {/* Cantidad y precio */}
              <View style={reviewStyles.row}>
                <View style={reviewStyles.fieldBox}>
                  <Text style={reviewStyles.fieldLabel}>Cantidad</Text>
                  <TextInput
                    style={reviewStyles.fieldInput}
                    value={String(item.quantity)}
                    onChangeText={(v) => onItemChange(item.id, "quantity", parseInt(v) || 1)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={reviewStyles.fieldBox}>
                  <Text style={reviewStyles.fieldLabel}>Precio (€)</Text>
                  <TextInput
                    style={reviewStyles.fieldInput}
                    value={item.price ? String(item.price) : ""}
                    onChangeText={(v) => onItemChange(item.id, "price", parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* Botón añadir */}
      <View style={reviewStyles.footer}>
        <Text style={reviewStyles.footerCount}>
          {items.length} producto{items.length !== 1 ? "s" : ""} reconocidos
        </Text>
        <TouchableOpacity style={reviewStyles.addBtn} onPress={onAddToList}>
          <Ionicons name="add-circle-outline" size={18} color={colors.white} />
          <Text style={reviewStyles.addBtnText}>Añadir a la lista</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const OCRScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { listId } = route.params;

  const [activeTab, setActiveTab] = useState<"capture" | "review">("capture");
  const [items, setItems] = useState<OCRItem[]>([]);

  const handleScanned = (scannedItems: OCRItem[]) => {
    setItems(scannedItems);
    setActiveTab("review");
  };

  const handleItemChange = (
    id: string,
    field: "raw_text" | "quantity" | "price",
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddToList = () => {
    const count = items.filter((i) => i.confidence >= 0.5).length;
    Alert.alert(
      "Productos añadidos",
      `Se han añadido ${count} productos a tu lista${listId ? "" : " (nueva lista)"}.`,
      [{ text: "OK", onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear ticket</Text>
        {items.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["capture", "review"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === "capture" ? "camera-outline" : "list-outline"}
              size={16}
              color={activeTab === tab ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabActive]}>
              {tab === "capture" ? "Captura" : "Revisión"}
            </Text>
            {tab === "review" && items.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{items.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={[styles.indicator, { left: activeTab === "capture" ? "0%" : "50%" }]} />
      </View>

      {activeTab === "capture" ? (
        <CaptureTab onScanned={handleScanned} />
      ) : (
        <ReviewTab
          items={items}
          onItemChange={handleItemChange}
          onRemoveItem={handleRemoveItem}
          onAddToList={handleAddToList}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    color: colors.white,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    position: "relative",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  tabActive: { color: colors.primary },
  tabBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    color: colors.white,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
  },
});

const scanStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  frame: {
    width: 240,
    height: 200,
    position: "relative",
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});

const captureStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  illustration: {
    position: "relative",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.lg,
  },
  receiptIcon: {},
  cameraOverlay: {
    position: "absolute",
    bottom: -8,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  textBlock: { alignItems: "center", gap: spacing.xs },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  actions: { width: "100%", gap: spacing.sm, maxWidth: 320 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  btnPrimaryText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.white,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  btnSecondaryText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.accentTint,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    maxWidth: 320,
  },
  tipText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 18,
  },
  processingText: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  processingSubtext: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  mockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.7,
  },
  mockText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.info,
  },
});

const reviewStyles = StyleSheet.create({
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  cardWarn: {
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
  },
  removeBtn: { padding: spacing.xs },
  nameInput: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  fieldBox: { flex: 1 },
  fieldLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  fieldInput: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  emptyBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
