/**
 * [P03-05] Pantalla de perfil del usuario — estilo iOS Settings.
 *
 * Secciones:
 *  1. Información del usuario (avatar, nombre, email, fecha de alta)
 *  2. Optimización (sliders de pesos, radio de búsqueda, máx. paradas)
 *  3. Notificaciones (toggle maestro + por evento)
 *  4. Cuenta (cambiar contraseña, eliminar cuenta, cerrar sesión)
 *
 * Todas las preferencias se guardan con debounce de 500ms via
 * PATCH /auth/profile/me/preferences/. Los toggles se guardan inmediatamente.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
  textStyles,
} from "@/theme";
import { authService } from "@/api/authService";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { SkeletonBox } from "@/components/ui";
import type { ProfileStackParamList } from "@/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cuando el slider X cambia a value V, redistribuye (100 - V) proporcionalmente
 * entre los otros dos sliders manteniendo sus proporciones relativas.
 */
function adjustWeights(
  changed: "price" | "distance" | "time",
  newValue: number,
  current: { price: number; distance: number; time: number },
): { price: number; distance: number; time: number } {
  const remaining = 100 - newValue;
  const others =
    changed === "price"
      ? { a: "distance" as const, b: "time" as const }
      : changed === "distance"
        ? { a: "price" as const, b: "time" as const }
        : { a: "price" as const, b: "distance" as const };

  const sumOthers = current[others.a] + current[others.b];

  let aNew: number;
  let bNew: number;

  if (sumOthers === 0) {
    // Distribución igual si ambos eran 0
    aNew = Math.round(remaining / 2);
    bNew = remaining - aNew;
  } else {
    aNew = Math.round((current[others.a] / sumOthers) * remaining);
    bNew = remaining - aNew;
  }

  const result = { price: current.price, distance: current.distance, time: current.time };
  result[changed] = newValue;
  result[others.a] = aNew;
  result[others.b] = bNew;
  return result;
}

function formatMemberSince(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={sectionStyles.wrapper}>
    <Text style={sectionStyles.title}>{title}</Text>
    <View style={sectionStyles.card}>{children}</View>
  </View>
);

interface RowProps {
  label: string;
  children: React.ReactNode;
  first?: boolean;
  last?: boolean;
}

const Row: React.FC<RowProps> = ({ label, children, first, last }) => (
  <View
    style={[
      sectionStyles.row,
      first && sectionStyles.rowFirst,
      last && sectionStyles.rowLast,
    ]}
  >
    <Text style={sectionStyles.rowLabel}>{label}</Text>
    {children}
  </View>
);

interface MenuRowProps {
  label: string;
  onPress: () => void;
  testID?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Muestra opacidad reducida pero permite pulsar (muestra "próximamente") */
  comingSoon?: boolean;
  first?: boolean;
  last?: boolean;
  showChevron?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({
  label,
  onPress,
  testID,
  destructive,
  disabled,
  comingSoon,
  first,
  last,
  showChevron = true,
}) => (
  <TouchableOpacity
    testID={testID}
    style={[
      sectionStyles.row,
      sectionStyles.menuRow,
      first && sectionStyles.rowFirst,
      last && sectionStyles.rowLast,
      (disabled || comingSoon) && sectionStyles.menuRowDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Text
      style={[
        sectionStyles.menuRowText,
        destructive && sectionStyles.menuRowDestructive,
        disabled && sectionStyles.menuRowDisabledText,
      ]}
    >
      {label}
    </Text>
    {showChevron && (
      <Ionicons
        name="chevron-forward"
        size={16}
        color={destructive ? colors.error : colors.textMuted}
      />
    )}
  </TouchableOpacity>
);

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const ProfileScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, memberSince, logout } = useAuthStore();
  const { profile, setProfile } = useProfileStore();

  const [isLoading, setIsLoading] = useState(false);

  // Weights state (local — debounced to API)
  const [weightPrice, setWeightPrice] = useState(
    profile?.weightPrice ?? 50,
  );
  const [weightDistance, setWeightDistance] = useState(
    profile?.weightDistance ?? 30,
  );
  const [weightTime, setWeightTime] = useState(profile?.weightTime ?? 20);

  // Radius and stops
  const [searchRadiusKm, setSearchRadiusKm] = useState(
    profile?.searchRadiusKm ?? 5,
  );
  const [maxStops, setMaxStops] = useState(profile?.maxStops ?? 3);

  // Notification toggles (local — saved immediately)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(true);
  const [notifyNewPromos, setNotifyNewPromos] = useState(true);
  const [notifySharedListChanges, setNotifySharedListChanges] = useState(true);

  // Debounce timer ref (NOT useState — must survive re-renders without causing them)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar perfil al montar ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      try {
        const p = await authService.getProfile();
        if (!cancelled) {
          setProfile(p);
          setWeightPrice(p.weightPrice);
          setWeightDistance(p.weightDistance);
          setWeightTime(p.weightTime);
          setSearchRadiusKm(p.searchRadiusKm);
          setMaxStops(p.maxStops);
        }
      } catch {
        // Conservar valores del store si falla la carga
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  // ── Debounce para preferencias de optimización ───────────────────────────

  const schedulePreferencesSave = useCallback(
    (prefs: {
      weight_price: number;
      weight_distance: number;
      weight_time: number;
      max_search_radius_km: number;
      max_stops: number;
    }) => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(async () => {
        try {
          const updated = await authService.updatePreferences(prefs);
          // Actualizar store con nuevos valores
          setProfile({
            ...(profile ?? {
              id: "",
              email: "",
              name: "",
              searchRadiusKm: 5,
              maxStops: 3,
              weightPrice: 50,
              weightDistance: 30,
              weightTime: 20,
            }),
            weightPrice: updated.weight_price,
            weightDistance: updated.weight_distance,
            weightTime: updated.weight_time,
            searchRadiusKm: updated.max_search_radius_km,
            maxStops: updated.max_stops,
          });
        } catch {
          // No interrumpir la UX si el guardado falla
        }
      }, 500);
    },
    [profile, setProfile],
  );

  // ── Handlers de sliders ──────────────────────────────────────────────────

  const handleWeightPriceChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      const newWeights = adjustWeights(
        "price",
        rounded,
        { price: weightPrice, distance: weightDistance, time: weightTime },
      );
      setWeightPrice(newWeights.price);
      setWeightDistance(newWeights.distance);
      setWeightTime(newWeights.time);
      schedulePreferencesSave({
        weight_price: newWeights.price,
        weight_distance: newWeights.distance,
        weight_time: newWeights.time,
        max_search_radius_km: searchRadiusKm,
        max_stops: maxStops,
      });
    },
    [weightPrice, weightDistance, weightTime, searchRadiusKm, maxStops, schedulePreferencesSave],
  );

  const handleWeightDistanceChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      const newWeights = adjustWeights(
        "distance",
        rounded,
        { price: weightPrice, distance: weightDistance, time: weightTime },
      );
      setWeightPrice(newWeights.price);
      setWeightDistance(newWeights.distance);
      setWeightTime(newWeights.time);
      schedulePreferencesSave({
        weight_price: newWeights.price,
        weight_distance: newWeights.distance,
        weight_time: newWeights.time,
        max_search_radius_km: searchRadiusKm,
        max_stops: maxStops,
      });
    },
    [weightPrice, weightDistance, weightTime, searchRadiusKm, maxStops, schedulePreferencesSave],
  );

  const handleWeightTimeChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      const newWeights = adjustWeights(
        "time",
        rounded,
        { price: weightPrice, distance: weightDistance, time: weightTime },
      );
      setWeightPrice(newWeights.price);
      setWeightDistance(newWeights.distance);
      setWeightTime(newWeights.time);
      schedulePreferencesSave({
        weight_price: newWeights.price,
        weight_distance: newWeights.distance,
        weight_time: newWeights.time,
        max_search_radius_km: searchRadiusKm,
        max_stops: maxStops,
      });
    },
    [weightPrice, weightDistance, weightTime, searchRadiusKm, maxStops, schedulePreferencesSave],
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      setSearchRadiusKm(rounded);
      schedulePreferencesSave({
        weight_price: weightPrice,
        weight_distance: weightDistance,
        weight_time: weightTime,
        max_search_radius_km: rounded,
        max_stops: maxStops,
      });
    },
    [weightPrice, weightDistance, weightTime, maxStops, schedulePreferencesSave],
  );

  const handleMaxStopsChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      setMaxStops(rounded);
      schedulePreferencesSave({
        weight_price: weightPrice,
        weight_distance: weightDistance,
        weight_time: weightTime,
        max_search_radius_km: searchRadiusKm,
        max_stops: rounded,
      });
    },
    [weightPrice, weightDistance, weightTime, searchRadiusKm, schedulePreferencesSave],
  );

  // ── Handlers de toggles de notificación ─────────────────────────────────

  const handleTogglePushMaster = useCallback(
    async (value: boolean) => {
      setPushEnabled(value);
      try {
        await authService.updatePreferences({ push_notifications_enabled: value });
      } catch {
        // Revertir en caso de error
        setPushEnabled(!value);
      }
    },
    [],
  );

  const handleTogglePriceAlerts = useCallback(async (value: boolean) => {
    setNotifyPriceAlerts(value);
    try {
      await authService.updatePreferences({ notify_price_alerts: value });
    } catch {
      setNotifyPriceAlerts(!value);
    }
  }, []);

  const handleToggleNewPromos = useCallback(async (value: boolean) => {
    setNotifyNewPromos(value);
    try {
      await authService.updatePreferences({ notify_new_promos: value });
    } catch {
      setNotifyNewPromos(!value);
    }
  }, []);

  const handleToggleSharedListChanges = useCallback(async (value: boolean) => {
    setNotifySharedListChanges(value);
    try {
      await authService.updatePreferences({ notify_shared_list_changes: value });
    } catch {
      setNotifySharedListChanges(!value);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert("¿Cerrar sesión?", "", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  // ── Eliminar cuenta ──────────────────────────────────────────────────────

  const handleDeleteAccount = useCallback(() => {
    Alert.alert("Esta función estará disponible próximamente");
  }, []);

  // ── Avatar inicial ────────────────────────────────────────────────────────

  const userName = user?.name ?? profile?.name ?? "Usuario";
  const userEmail = user?.email ?? profile?.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const weightSum = weightPrice + weightDistance + weightTime;

  // ── Renderizado ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          <SkeletonBox width="100%" height={120} borderRadius={16} style={styles.skeletonSection} />
          <SkeletonBox width="100%" height={200} borderRadius={16} style={styles.skeletonSection} />
          <SkeletonBox width="100%" height={160} borderRadius={16} style={styles.skeletonSection} />
          <SkeletonBox width="100%" height={140} borderRadius={16} style={styles.skeletonSection} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección 1: Información del usuario ─────────────────────── */}
        <View style={[sectionStyles.card, styles.userCard]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          {memberSince ? (
            <Text style={styles.memberSince}>
              Miembro desde {formatMemberSince(memberSince)}
            </Text>
          ) : null}
        </View>

        {/* ── Sección 2: Optimización ─────────────────────────────────── */}
        <Section title="Optimización">
          {/* Indicador de suma */}
          <View style={styles.weightSumRow}>
            <Text style={styles.weightSumLabel}>Suma total</Text>
            <Text
              style={[
                styles.weightSumValue,
                weightSum !== 100 && styles.weightSumError,
              ]}
            >
              {weightSum}%
            </Text>
          </View>

          <Row label={`Precio: ${weightPrice}%`} first>
            <Slider
              testID="slider-weight-price"
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={weightPrice}
              onValueChange={handleWeightPriceChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
          </Row>

          <Row label={`Distancia: ${weightDistance}%`}>
            <Slider
              testID="slider-weight-distance"
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={weightDistance}
              onValueChange={handleWeightDistanceChange}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.secondary}
            />
          </Row>

          <Row label={`Tiempo: ${weightTime}%`}>
            <Slider
              testID="slider-weight-time"
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={weightTime}
              onValueChange={handleWeightTimeChange}
              minimumTrackTintColor={colors.info}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.info}
            />
          </Row>

          <Row label={`Radio de búsqueda: ${searchRadiusKm} km`}>
            <Slider
              testID="slider-search-radius"
              style={styles.slider}
              minimumValue={1}
              maximumValue={20}
              step={1}
              value={searchRadiusKm}
              onValueChange={handleRadiusChange}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accentDark}
            />
          </Row>

          <Row label={`Máx. paradas: ${maxStops}`} last>
            <Slider
              testID="slider-max-stops"
              style={styles.slider}
              minimumValue={2}
              maximumValue={5}
              step={1}
              value={maxStops}
              onValueChange={handleMaxStopsChange}
              minimumTrackTintColor={colors.warning}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.warning}
            />
          </Row>
        </Section>

        {/* ── Sección 3: Notificaciones ───────────────────────────────── */}
        <Section title="Notificaciones">
          <Row label="Notificaciones push" first>
            <Switch
              testID="toggle-push-master"
              value={pushEnabled}
              onValueChange={handleTogglePushMaster}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={pushEnabled ? colors.primary : colors.textDisabled}
            />
          </Row>

          <Row label="Alertas de precio">
            <Switch
              testID="toggle-notify-price-alerts"
              value={notifyPriceAlerts}
              onValueChange={handleTogglePriceAlerts}
              disabled={!pushEnabled}
              style={!pushEnabled ? styles.toggleDisabled : undefined}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={notifyPriceAlerts ? colors.primary : colors.textDisabled}
            />
          </Row>

          <Row label="Nuevas promociones">
            <Switch
              testID="toggle-notify-new-promos"
              value={notifyNewPromos}
              onValueChange={handleToggleNewPromos}
              disabled={!pushEnabled}
              style={!pushEnabled ? styles.toggleDisabled : undefined}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={notifyNewPromos ? colors.primary : colors.textDisabled}
            />
          </Row>

          <Row label="Cambios en listas compartidas" last>
            <Switch
              testID="toggle-notify-shared-list-changes"
              value={notifySharedListChanges}
              onValueChange={handleToggleSharedListChanges}
              disabled={!pushEnabled}
              style={!pushEnabled ? styles.toggleDisabled : undefined}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={notifySharedListChanges ? colors.primary : colors.textDisabled}
            />
          </Row>
        </Section>

        {/* ── Sección 4: Cuenta ──────────────────────────────────────── */}
        <Section title="Cuenta">
          <MenuRow
            label="Cambiar contraseña"
            onPress={() => navigation.navigate("ChangePassword")}
            testID="btn-change-password"
            first
          />
          <MenuRow
            label="Eliminar cuenta"
            onPress={handleDeleteAccount}
            testID="btn-delete-account"
            showChevron={false}
            comingSoon
          />
          <MenuRow
            label="Cerrar sesión"
            onPress={handleLogout}
            testID="btn-logout"
            destructive
            last
            showChevron={false}
          />
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...textStyles.heading2,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.primary + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarInitial: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["3xl"],
    color: colors.primary,
  },
  userName: {
    ...textStyles.heading3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...textStyles.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  memberSince: {
    ...textStyles.caption,
    color: colors.textDisabled,
  },
  weightSumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  weightSumLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  weightSumValue: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  weightSumError: {
    color: colors.error,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  skeletonSection: {
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});

const sectionStyles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    minHeight: 44,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    ...textStyles.bodySmall,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  menuRow: {
    justifyContent: "space-between",
  },
  menuRowDisabled: {
    opacity: 0.5,
  },
  menuRowText: {
    ...textStyles.body,
    color: colors.text,
    flex: 1,
  },
  menuRowDestructive: {
    color: colors.error,
  },
  menuRowDisabledText: {
    color: colors.textMuted,
  },
});
