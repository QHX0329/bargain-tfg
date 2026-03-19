/**
 * Pantalla de registro de usuario.
 *
 * Conectada a POST /auth/register/ a través de authService.register.
 * Tras el registro, realiza auto-login llamando a authService.login
 * para que el usuario entre directamente a la app sin pasar por LoginScreen.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { colors, spacing, textStyles } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/api/authService";
import type { AuthStackParamList } from "@/navigation/types";

type RegisterNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Register"
>;

/** Errores a nivel de campo devueltos por el backend (400) */
interface FieldErrors {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: string | undefined;
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { height } = useWindowDimensions();
  const isCompact = height <= 750;

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /** Contraseñas no coinciden — deshabilita el botón de envío */
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const isSubmitDisabled = isLoading || passwordMismatch;

  const handleRegister = async () => {
    if (passwordMismatch) return;

    setIsLoading(true);
    setGeneralError(null);
    setFieldErrors({});

    try {
      // POST /auth/register/ — crea la cuenta; devuelve el perfil (sin tokens)
      await authService.register({
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirm: confirmPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      // El endpoint de registro no devuelve tokens; realizamos login explícito.
      const tokens = await authService.login(username.trim(), password);
      const profile = await authService.getProfileWithToken(tokens.access);

      const user = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
      };

      await useAuthStore.getState().login(tokens.access, tokens.refresh, user);
    } catch (err: unknown) {
      // Extraer errores de campo del backend (400 con details)
      const axiosError = err as {
        response?: {
          data?: {
            error?: {
              details?: Record<string, string[]>;
            };
          };
        };
      };

      const details = axiosError?.response?.data?.error?.details;

      if (details && typeof details === "object") {
        const mapped: FieldErrors = {};
        for (const [field, messages] of Object.entries(details)) {
          if (Array.isArray(messages) && messages.length > 0) {
            mapped[field] = messages[0];
          }
        }
        setFieldErrors(mapped);
      } else {
        setGeneralError("No se pudo crear la cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.inner}>
          {/* Header — se oculta el logo en pantallas compactas */}
          <View style={[styles.header, isCompact && styles.headerCompact]}>
            {!isCompact && (
              <Image
                source={require("@/assets/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.title, isCompact && styles.titleCompact]}>
              Crea tu cuenta
            </Text>
            <Text style={styles.subtitle}>Únete a BargAIn y empieza a ahorrar</Text>
          </View>

          <View style={styles.form}>
            {/* Fila usuario */}
            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                placeholder="tu_usuario"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {fieldErrors.username ? (
                <Text style={styles.fieldError}>{fieldErrors.username}</Text>
              ) : null}
            </View>

            {/* Nombre y Apellidos en fila */}
            <View style={[styles.row, isCompact && styles.rowCompact]}>
              <View style={[styles.inputGroup, styles.rowItem, isCompact && styles.inputGroupCompact]}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact]}
                  placeholder="Nombre"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {fieldErrors.first_name ? (
                  <Text style={styles.fieldError}>{fieldErrors.first_name}</Text>
                ) : null}
              </View>
              <View style={[styles.inputGroup, styles.rowItem, isCompact && styles.inputGroupCompact]}>
                <Text style={styles.label}>Apellidos</Text>
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact]}
                  placeholder="Apellidos"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {fieldErrors.last_name ? (
                  <Text style={styles.fieldError}>{fieldErrors.last_name}</Text>
                ) : null}
              </View>
            </View>

            {/* Email */}
            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              ) : null}
            </View>

            {/* Contraseñas en fila */}
            <View style={[styles.row, isCompact && styles.rowCompact]}>
              <View style={[styles.inputGroup, styles.rowItem, isCompact && styles.inputGroupCompact]}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact]}
                  placeholder="Mín. 8 caracteres"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
                {fieldErrors.password ? (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                ) : null}
              </View>
              <View style={[styles.inputGroup, styles.rowItem, isCompact && styles.inputGroupCompact]}>
                <Text style={styles.label}>Repetir</Text>
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact, passwordMismatch && styles.inputError]}
                  placeholder="Repetir"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
                {passwordMismatch ? (
                  <Text style={styles.fieldError}>No coinciden</Text>
                ) : null}
              </View>
            </View>

            {generalError ? (
              <Text style={styles.errorText}>{generalError}</Text>
            ) : null}

            <TouchableOpacity
              testID="register-submit-button"
              style={[styles.registerButton, isSubmitDisabled && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitDisabled}
              accessibilityState={{ disabled: isSubmitDisabled }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={isLoading}
            >
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta?{" "}
                <Text style={styles.loginTextBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  headerCompact: {
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 160,
    height: 80,
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyles.heading1,
    color: colors.text,
  },
  titleCompact: {
    ...textStyles.heading2,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {},
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputGroupCompact: {
    marginBottom: spacing.sm,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body,
    color: colors.text,
  },
  inputCompact: {
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    ...textStyles.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    ...textStyles.button,
    color: colors.white,
  },
  loginLink: {
    marginTop: spacing.md,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  loginText: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: "600",
  },
});
