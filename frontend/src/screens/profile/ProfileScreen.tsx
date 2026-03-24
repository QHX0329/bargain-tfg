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

import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(profile == null);

  // Weights state (local — debounced to API)
  const [weightPrice, setWeightPrice] = useState(profile?.weightPrice ?? 50);
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

  const loadProfile = useCallback(async (showSkeleton: boolean) => {
    if (showSkeleton) {
      setIsLoading(true);
    }
    try {
      const p = await authService.getProfile();
      setProfile(p);
      setWeightPrice(p.weightPrice);
      setWeightDistance(p.weightDistance);
      setWeightTime(p.weightTime);
      setSearchRadiusKm(p.searchRadiusKm);
      setMaxStops(p.maxStops);
    } catch {
      // Conservar valores del store si falla la carga
    } finally {
      if (showSkeleton) {
        setIsLoading(false);
      }
    }
  }, [setProfile]);

  // ── Cargar perfil al montar ──────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      // Mantener la UI previa evita desmontar el avatar remoto y elimina el flash.
      void loadProfile(useProfileStore.getState().profile == null);
    }, [loadProfile]),
  );

  // ── Handlers de toggles de notificación ─────────────────────────────────

  const handleTogglePushMaster = useCallback(async (value: boolean) => {
    setPushEnabled(value);
    try {
      await authService.updatePreferences({
        push_notifications_enabled: value,
      });
    } catch {
      // Revertir en caso de error
      setPushEnabled(!value);
    }
  }, []);

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
      await authService.updatePreferences({
        notify_shared_list_changes: value,
      });
    } catch {
      setNotifySharedListChanges(!value);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    // Alert button callbacks are unreliable on web; use browser confirm there.
    if (Platform.OS === "web") {
      const shouldLogout =
        typeof window !== "undefined"
          ? window.confirm("¿Cerrar sesión?")
          : true;
      if (shouldLogout) {
        void logout();
      }
      return;
    }

    Alert.alert("¿Cerrar sesión?", "", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          void logout();
        },
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

  // ── Renderizado ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.header, { paddingTop: spacing.md + insets.top }]}>
          <Text style={styles.title}>Perfil</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          <SkeletonBox
            width="100%"
            height={120}
            borderRadius={16}
            style={styles.skeletonSection}
          />
          <SkeletonBox
            width="100%"
            height={200}
            borderRadius={16}
            style={styles.skeletonSection}
          />
          <SkeletonBox
            width="100%"
            height={160}
            borderRadius={16}
            style={styles.skeletonSection}
          />
          <SkeletonBox
            width="100%"
            height={140}
            borderRadius={16}
            style={styles.skeletonSection}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: spacing.md + insets.top }]}>
        <Text style={styles.title}>Perfil</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sección 1: Información del usuario ─────────────────────── */}
        <View style={[sectionStyles.card, styles.userCard]}>
          {profile?.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>
          )}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          {memberSince ? (
            <Text style={styles.memberSince}>
              Miembro desde {formatMemberSince(memberSince)}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate("EditProfile")}
            accessibilityRole="button"
            accessibilityLabel="Modificar información del usuario"
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <Text style={styles.editProfileButtonText}>
              Modificar información
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Sección 2: Optimización (solo lectura) ──────────────────── */}
        <Section title="Optimización">
          <Row label="Precio" first>
            <Text style={styles.readonlyValue}>{weightPrice}%</Text>
          </Row>
          <Row label="Distancia">
            <Text style={styles.readonlyValue}>{weightDistance}%</Text>
          </Row>
          <Row label="Tiempo">
            <Text style={styles.readonlyValue}>{weightTime}%</Text>
          </Row>
          <Row label="Radio de búsqueda">
            <Text style={styles.readonlyValue}>{searchRadiusKm} km</Text>
          </Row>
          <Row label="Máx. paradas">
            <Text style={styles.readonlyValue}>{maxStops}</Text>
          </Row>
          <Row label="Ajustar preferencias" last>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              onPress={() => navigation.navigate("OptimizerConfig")}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 13,
                  color: colors.primary,
                }}
              >
                Configurar
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primary}
              />
            </TouchableOpacity>
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
              thumbColor={
                notifyPriceAlerts ? colors.primary : colors.textDisabled
              }
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
              thumbColor={
                notifyNewPromos ? colors.primary : colors.textDisabled
              }
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
              thumbColor={
                notifySharedListChanges ? colors.primary : colors.textDisabled
              }
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
    paddingTop: spacing.md,
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary + "30",
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
  editProfileButton: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  editProfileButtonText: {
    ...textStyles.bodySmall,
    color: colors.primary,
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
  weightSumNorm: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  readonlyValue: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
