/**
 * [RF-019] Pantalla para proponer un nuevo producto desde la app móvil.
 *
 * El usuario rellena nombre, marca, EAN, categoría y, si quiere, precio y tienda.
 * Al enviar → POST /products/proposals/ con los datos.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { isAxiosError } from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { productService } from "@/api/productService";
import { storeService } from "@/api/storeService";
import type { HomeStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "ProductProposal">;

/** Validates EAN-13 checksum. Returns true if valid or empty. */
function validateEAN13(code: string): boolean {
  if (!code) return true;
  if (!/^\d{13}$/.test(code)) return false;
  const sum = code
    .split("")
    .reduce((acc, d, i) => acc + parseInt(d, 10) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

interface StoreOption {
  id: number;
  name: string;
}

export const ProductProposalScreen: React.FC<Props> = ({ navigation }) => {
  const breakpoint = useBreakpoint();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoadFailed, setStoresLoadFailed] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitHovered, setSubmitHovered] = useState(false);

  useEffect(() => {
    // Use device location when available, fallback to 0,0 (shows all stores within 50 km).
    const loadStores = (lat: number, lng: number) => {
      storeService
        .getNearby(lat, lng, 50)
        .then((result) => {
          const list = Array.isArray(result)
            ? result
            : ((result as { results?: StoreOption[] }).results ?? []);
          setStoresLoadFailed(false);
          setStores(
            list.slice(0, 20).map((s) => ({ id: Number(s.id), name: s.name })),
          );
        })
        .catch(() => {
          setStores([]);
          setStoresLoadFailed(true);
        });
    };

    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadStores(pos.coords.latitude, pos.coords.longitude),
        () => loadStores(0, 0),
        { timeout: 5000 },
      );
    } else {
      loadStores(0, 0);
    }
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "El nombre debe tener al menos 2 caracteres";
    }
    if (barcode && !validateEAN13(barcode)) {
      errs.barcode =
        "EAN-13 inválido: debe tener 13 dígitos con dígito de control correcto";
    }
    // Fix F6: el backend acepta propuestas sin precio; solo exigimos tienda cuando se envía precio.
    const hasPrice = price.trim().length > 0;
    if (hasPrice && (isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      errs.price = "Introduce un precio válido";
    }
    if (hasPrice && stores.length === 0) {
      errs.store =
        "No se pudieron cargar tiendas cercanas. Quita el precio o recarga la sesión.";
    } else if (hasPrice && !selectedStoreId) {
      errs.store = "Selecciona una tienda para asociar el precio";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const hasPrice = price.trim().length > 0;
      await productService.createProposal({
        name: name.trim(),
        brand: brand.trim() || undefined,
        barcode: barcode.trim() || undefined,
        price: hasPrice ? parseFloat(price) : undefined,
        unit_price: unitPrice ? parseFloat(unitPrice) : undefined,
        notes: notes.trim() || undefined,
        store: selectedStoreId ?? undefined,
      });
      Alert.alert(
        "Propuesta enviada",
        "Tu propuesta ha sido enviada y está pendiente de revisión por el equipo de BarGAIN.",
        [{ text: "Aceptar", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        Alert.alert(
          "Sesión caducada",
          "Tu sesión ha expirado. Inicia sesión de nuevo antes de enviar la propuesta.",
        );
      } else {
        Alert.alert(
          "Error",
          "No se pudo enviar la propuesta. Inténtalo de nuevo.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Proponer producto</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* D-05: center form at max-width 560px on tablet/desktop (UI-SPEC binding) */}
          <View
            style={breakpoint !== "mobile" ? styles.formCentered : undefined}
          >
            <Text style={styles.sectionLabel}>Información del producto</Text>

            {/* Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Leche semidesnatada 1L"
                placeholderTextColor={colors.light.textSecondary}
              />
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Brand */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="Ej. Hacendado"
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>

            {/* Barcode */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Código EAN-13</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.barcode ? styles.inputError : null,
                ]}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Ej. 8412345678901"
                placeholderTextColor={colors.light.textSecondary}
                keyboardType="numeric"
                maxLength={13}
              />
              {errors.barcode ? (
                <Text style={styles.errorText}>{errors.barcode}</Text>
              ) : null}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              Precio
            </Text>

            {/* Price */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Precio (€)</Text>
              <TextInput
                style={[styles.input, errors.price ? styles.inputError : null]}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.light.textSecondary}
                keyboardType="decimal-pad"
              />
              {errors.price ? (
                <Text style={styles.errorText}>{errors.price}</Text>
              ) : null}
            </View>

            {/* Unit price */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Precio unitario (€/kg o €/L)</Text>
              <TextInput
                style={styles.input}
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="Ej. 1.20"
                placeholderTextColor={colors.light.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Store picker */}
            {stores.length > 0 && (
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Tienda</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.storeRow}
                >
                  {stores.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.storeChip,
                        selectedStoreId === s.id && styles.storeChipSelected,
                      ]}
                      onPress={() =>
                        setSelectedStoreId(
                          selectedStoreId === s.id ? null : s.id,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.storeChipText,
                          selectedStoreId === s.id &&
                            styles.storeChipTextSelected,
                        ]}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.store ? (
                  <Text style={styles.errorText}>{errors.store}</Text>
                ) : null}
              </View>
            )}

            {stores.length === 0 &&
            (storesLoadFailed || price.trim().length > 0) ? (
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Tienda</Text>
                <Text style={styles.helperText}>
                  No hemos podido cargar tiendas cercanas en este momento.
                </Text>
                {errors.store ? (
                  <Text style={styles.errorText}>{errors.store}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Notes */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Notas adicionales</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej. Encontré este producto en el supermercado X pero no aparece en la app"
                placeholderTextColor={colors.light.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Submit — D-06: hover tint + focus ring on web */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                submitting && styles.submitBtnDisabled,
                submitHovered && { backgroundColor: colors.primaryTint },
                // @ts-ignore — web-only focus ring props (react-native-web)
                Platform.OS === "web"
                  ? {
                      outlineColor: colors.primary,
                      outlineWidth: 2,
                      outlineOffset: 2,
                    }
                  : null,
              ]}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={submitting}
              activeOpacity={0.8}
              // @ts-ignore — web-only hover props (react-native-web)
              onMouseEnter={() => setSubmitHovered(true)}
              // @ts-ignore — web-only hover props (react-native-web)
              onMouseLeave={() => setSubmitHovered(false)}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitBtnText}>Enviar propuesta</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Las propuestas son revisadas por el equipo de BarGAIN antes de
              aparecer en el catálogo.
            </Text>
          </View>
          {/* /formCentered */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// D-06: web focus ring applied via Platform.OS guard on inputs/button
const webFocusRing =
  Platform.OS === "web"
    ? { outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2 }
    : {};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  // D-05: centered form at max-width 560px on tablet/desktop (UI-SPEC binding)
  formCentered: {
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  fieldWrap: { marginBottom: spacing.md },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSize.sm,
    color: colors.light.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSize.md,
    color: colors.text,
    ...shadows.card,
    ...webFocusRing,
  },
  inputError: { borderColor: colors.error },
  textArea: { minHeight: 80 },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
  },
  helperText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSize.sm,
    color: colors.light.textSecondary,
  },
  storeRow: { marginTop: 4 },
  storeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  storeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  storeChipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  storeChipTextSelected: { color: "#fff" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    ...shadows.button,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSize.md,
    color: "#fff",
  },
  disclaimer: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSize.xs,
    color: colors.light.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
