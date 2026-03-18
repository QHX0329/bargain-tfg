/**
 * [P03-05] Pantalla de cambio de contraseña.
 *
 * Tres campos: contraseña actual, nueva contraseña, confirmar.
 * Validaciones:
 *  - Confirmar debe coincidir con nueva
 *  - Mínimo 8 caracteres para nueva contraseña
 * Llama a PATCH /auth/profile/me/ con old_password + new_password.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
import { BargainButton } from "@/components/ui";
import type { ProfileStackParamList } from "@/navigation/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChangePasswordScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "ChangePassword">;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  navigation,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [oldPasswordError, setOldPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    // Limpiar errores previos
    setOldPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");

    // Validaciones
    let hasError = false;

    if (!oldPassword) {
      setOldPasswordError("Introduce tu contraseña actual");
      hasError = true;
    }

    if (newPassword.length < 8) {
      setNewPasswordError("La contraseña debe tener al menos 8 caracteres");
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      Alert.alert("Contraseña actualizada", "Tu contraseña ha sido cambiada correctamente");
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al cambiar la contraseña";
      setOldPasswordError(message);
    } finally {
      setIsLoading(false);
    }
  }, [oldPassword, newPassword, confirmPassword, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Cambiar contraseña</Text>
        <Text style={styles.subtitle}>
          Introduce tu contraseña actual y elige una nueva de al menos 8 caracteres.
        </Text>

        {/* ── Contraseña actual ───────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Contraseña actual</Text>
          <TextInput
            testID="input-old-password"
            style={[styles.input, !!oldPasswordError && styles.inputError]}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Contraseña actual"
            placeholderTextColor={colors.textDisabled}
          />
          {!!oldPasswordError && (
            <Text style={styles.errorText}>{oldPasswordError}</Text>
          )}
        </View>

        {/* ── Nueva contraseña ────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Nueva contraseña</Text>
          <TextInput
            testID="input-new-password"
            style={[styles.input, !!newPasswordError && styles.inputError]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textDisabled}
          />
          {!!newPasswordError && (
            <Text style={styles.errorText}>{newPasswordError}</Text>
          )}
        </View>

        {/* ── Confirmar contraseña ────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
          <TextInput
            testID="input-confirm-password"
            style={[styles.input, !!confirmPasswordError && styles.inputError]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Repite la nueva contraseña"
            placeholderTextColor={colors.textDisabled}
          />
          {!!confirmPasswordError && (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          )}
        </View>

        {/* ── Botón submit ────────────────────────────────────────── */}
        <BargainButton
          testID="btn-submit-password"
          label="Guardar contraseña"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
          style={styles.submitButton}
        />
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...textStyles.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  fieldWrapper: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 48,
    ...shadows.none,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  errorText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
