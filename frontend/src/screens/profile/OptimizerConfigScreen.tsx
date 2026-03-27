/**
 * [F4-12] Pantalla de configuración del optimizador de compras.
 *
 * Permite al usuario ajustar:
 *  - Radio máximo de búsqueda (slider 1–30 km)
 *  - Máximo de paradas por ruta (stepper 1–5)
 *  - Preferencia de optimización (price / distance / time / balanced)
 *  - Pesos de los tres criterios (sliders independientes, normalizados al guardar)
 *
 * Los cambios se guardan con PATCH /auth/profile/me/ al pulsar "Guardar".
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { authService } from "@/api/authService";
import { useProfileStore } from "@/store/profileStore";

// ─── Presets de optimización ─────────────────────────────────────────────────

interface OptPreset {
  id: string;
  label: string;
  icon: string;
  desc: string;
  price: number;
  distance: number;
  time: number;
}

const OPT_PRESETS: OptPreset[] = [
  {
    id: "balanced",
    label: "Equilibrado",
    icon: "scale-outline",
    desc: "Balance entre precio, distancia y tiempo",
    price: 34,
    distance: 33,
    time: 33,
  },
  {
    id: "price",
    label: "Precio",
    icon: "cash-outline",
    desc: "Minimizar el coste total (70 / 15 / 15)",
    price: 70,
    distance: 15,
    time: 15,
  },
  {
    id: "distance",
    label: "Distancia",
    icon: "walk-outline",
    desc: "Minimizar el recorrido total (15 / 70 / 15)",
    price: 15,
    distance: 70,
    time: 15,
  },
  {
    id: "time",
    label: "Tiempo",
    icon: "time-outline",
    desc: "Minimizar el tiempo estimado (15 / 15 / 70)",
    price: 15,
    distance: 15,
    time: 70,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeWeights(
  p: number,
  d: number,
  t: number,
): { price: number; distance: number; time: number } {
  const sum = p + d + t;
  if (sum === 0) return { price: 34, distance: 33, time: 33 };
  const np = Math.round((p / sum) * 100);
  const nd = Math.round((d / sum) * 100);
  return { price: np, distance: nd, time: 100 - np - nd };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  delay?: number;
}
const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  delay = 0,
}) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <View style={sectionStyles.wrapper}>
      <View style={sectionStyles.titleRow}>
        <View style={sectionStyles.iconBox}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  </Animated.View>
);

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (v: number) => string;
  onValueChange: (v: number) => void;
  accentColor?: string;
}
const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onValueChange,
  accentColor,
}) => (
  <View style={sliderStyles.row}>
    <View style={sliderStyles.header}>
      <Text style={sliderStyles.label}>{label}</Text>
      <Text
        style={[sliderStyles.value, accentColor ? { color: accentColor } : {}]}
      >
        {formatValue ? formatValue(value) : String(value)}
      </Text>
    </View>
    <Slider
      style={sliderStyles.slider}
      minimumValue={min}
      maximumValue={max}
      step={step}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={accentColor ?? colors.primary}
      maximumTrackTintColor={colors.surfaceVariant}
      thumbTintColor={accentColor ?? colors.primary}
    />
    <View style={sliderStyles.range}>
      <Text style={sliderStyles.rangeText}>{min}</Text>
      <Text style={sliderStyles.rangeText}>{max}</Text>
    </View>
  </View>
);

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const OptimizerConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const { profile } = useProfileStore();

  const [radius, setRadius] = useState(profile?.max_search_radius_km ?? 10);
  const [maxStops, setMaxStops] = useState(profile?.max_stops ?? 3);
  // Pesos leídos directamente del backend (persistidos en BD)
  const [weightPrice, setWeightPrice] = useState(profile?.weight_price ?? 34);
  const [weightDist, setWeightDist] = useState(profile?.weight_distance ?? 33);
  const [weightTime, setWeightTime] = useState(profile?.weight_time ?? 33);
  const [saving, setSaving] = useState(false);

  // Si el perfil carga en segundo plano, sincronizar con los valores de BD
  useEffect(() => {
    if (!profile) return;
    setRadius(profile.max_search_radius_km ?? 10);
    setMaxStops(profile.max_stops ?? 3);
    setWeightPrice(profile.weight_price ?? 34);
    setWeightDist(profile.weight_distance ?? 33);
    setWeightTime(profile.weight_time ?? 33);
  }, [profile]);

  const applyPreset = useCallback((preset: OptPreset) => {
    setWeightPrice(preset.price);
    setWeightDist(preset.distance);
    setWeightTime(preset.time);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const w = normalizeWeights(weightPrice, weightDist, weightTime);
      await authService.updatePreferences({
        max_search_radius_km: radius,
        max_stops: maxStops,
        push_notifications_enabled: profile?.push_notifications_enabled ?? true,
        notify_price_alerts: profile?.notify_price_alerts ?? true,
        notify_new_promos: profile?.notify_new_promos ?? true,
        notify_shared_list_changes: profile?.notify_shared_list_changes ?? true,
        weight_price: w.price,
        weight_distance: w.distance,
        weight_time: w.time,
      });
      Alert.alert(
        "Guardado",
        "Tu configuración del optimizador ha sido actualizada.",
      );
      navigation.goBack();
    } catch {
      Alert.alert(
        "Error",
        "No se pudo guardar la configuración. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    radius,
    maxStops,
    weightPrice,
    weightDist,
    weightTime,
    profile,
    navigation,
  ]);

  const normalizedWeights = normalizeWeights(
    weightPrice,
    weightDist,
    weightTime,
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
        <Text style={styles.headerTitle}>Optimizador</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Radio de búsqueda */}
        <Section title="Radio de búsqueda" icon="locate-outline" delay={0}>
          <SliderRow
            label="Distancia máxima"
            value={radius}
            min={1}
            max={50}
            step={1}
            formatValue={(v) => `${v} km`}
            onValueChange={setRadius}
          />
          <Text style={styles.hint}>
            Las tiendas a más distancia serán ignoradas durante la optimización.
          </Text>
        </Section>

        {/* Paradas */}
        <Section title="Paradas por ruta" icon="map-outline" delay={80}>
          <View style={stepperStyles.row}>
            <Text style={stepperStyles.label}>Máximo de paradas</Text>
            <View style={stepperStyles.controls}>
              <TouchableOpacity
                style={[
                  stepperStyles.btn,
                  maxStops <= 1 && stepperStyles.btnDisabled,
                ]}
                onPress={() => setMaxStops((v) => Math.max(1, v - 1))}
                disabled={maxStops <= 1}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={maxStops <= 1 ? colors.textDisabled : colors.primary}
                />
              </TouchableOpacity>
              <Text style={stepperStyles.value}>{maxStops}</Text>
              <TouchableOpacity
                style={[
                  stepperStyles.btn,
                  maxStops >= 5 && stepperStyles.btnDisabled,
                ]}
                onPress={() => setMaxStops((v) => Math.min(5, v + 1))}
                disabled={maxStops >= 5}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={maxStops >= 5 ? colors.textDisabled : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hint}>
            Más paradas aumenta el ahorro potencial pero también el tiempo de
            desplazamiento.
          </Text>
        </Section>

        {/* Presets de optimización */}
        <Section
          title="Modo de optimización"
          icon="options-outline"
          delay={160}
        >
          <Text style={styles.hint}>
            Selecciona un modo o ajusta los pesos manualmente abajo.
          </Text>
          <View style={prefStyles.grid}>
            {OPT_PRESETS.map((preset) => {
              const w = normalizeWeights(weightPrice, weightDist, weightTime);
              const isActive =
                w.price === preset.price &&
                w.distance === preset.distance &&
                w.time === preset.time;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[prefStyles.chip, isActive && prefStyles.chipActive]}
                  onPress={() => applyPreset(preset)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={preset.icon as any}
                    size={20}
                    color={isActive ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      prefStyles.chipLabel,
                      isActive && prefStyles.chipLabelActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  {isActive && (
                    <Text style={prefStyles.chipDesc}>{preset.desc}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Pesos personalizados — siempre visible */}
        <Section
          title="Pesos de criterios"
          icon="bar-chart-outline"
          delay={240}
        >
          <Text style={styles.hint}>
            Ajusta cuánto importa cada criterio. Los valores se normalizan
            automáticamente al guardar.
          </Text>

          <SliderRow
            label="Precio"
            value={weightPrice}
            min={0}
            max={100}
            step={5}
            formatValue={(v) =>
              `${normalizeWeights(v, weightDist, weightTime).price}%`
            }
            onValueChange={setWeightPrice}
            accentColor={colors.success}
          />
          <SliderRow
            label="Distancia"
            value={weightDist}
            min={0}
            max={100}
            step={5}
            formatValue={(v) =>
              `${normalizeWeights(weightPrice, v, weightTime).distance}%`
            }
            onValueChange={setWeightDist}
            accentColor={colors.info}
          />
          <SliderRow
            label="Tiempo"
            value={weightTime}
            min={0}
            max={100}
            step={5}
            formatValue={(v) =>
              `${normalizeWeights(weightPrice, weightDist, v).time}%`
            }
            onValueChange={setWeightTime}
            accentColor={colors.accent}
          />

          {/* Resumen visual de pesos normalizados */}
          <View style={weightsStyles.bar}>
            <View
              style={[
                weightsStyles.segment,
                {
                  flex: normalizedWeights.price,
                  backgroundColor: colors.success,
                },
              ]}
            />
            <View
              style={[
                weightsStyles.segment,
                {
                  flex: normalizedWeights.distance,
                  backgroundColor: colors.info,
                },
              ]}
            />
            <View
              style={[
                weightsStyles.segment,
                {
                  flex: normalizedWeights.time,
                  backgroundColor: colors.accentDark,
                },
              ]}
            />
          </View>
          <View style={weightsStyles.legend}>
            {[
              {
                label: "Precio",
                value: normalizedWeights.price,
                color: colors.success,
              },
              {
                label: "Distancia",
                value: normalizedWeights.distance,
                color: colors.info,
              },
              {
                label: "Tiempo",
                value: normalizedWeights.time,
                color: colors.accentDark,
              },
            ].map((w) => (
              <View key={w.label} style={weightsStyles.legendItem}>
                <View
                  style={[weightsStyles.dot, { backgroundColor: w.color }]}
                />
                <Text style={weightsStyles.legendText}>
                  {w.label} {w.value}%
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 80,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});

const sectionStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
});

const sliderStyles = StyleSheet.create({
  row: { gap: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  value: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  slider: { width: "100%", height: 36 },
  range: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  rangeText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.textMuted,
  },
});

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { backgroundColor: colors.surfaceVariant },
  value: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.text,
    minWidth: 28,
    textAlign: "center",
  },
});

const prefStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 4,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  chipLabelActive: { color: colors.white },
  chipDesc: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.white,
    textAlign: "center",
    lineHeight: 14,
  },
});

const weightsStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 8,
    borderRadius: borderRadius.pill,
    overflow: "hidden",
    marginTop: spacing.md,
    gap: 2,
  },
  segment: { borderRadius: borderRadius.pill },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
