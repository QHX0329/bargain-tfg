/**
 * Pantalla de inicio de sesión.
 */

import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import type { AuthStackParamList } from "@/navigation/types";

type LoginNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Login"
>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const login = useAuthStore((state) => state.login);
  const { height } = useWindowDimensions();
  const isCompact = height <= 650;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // TODO: implementar lógica real de login con API (F3-02)
    login("fake-token", { id: "1", email, name: "Usuario" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompact && styles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, isCompact && styles.headerCompact]}>
            <Image
              source={require("@/assets/logo.png")}
              style={[styles.logoImage, isCompact && styles.logoImageCompact]}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Tu compra inteligente</Text>
          </View>

          <View style={[styles.form, isCompact && styles.formCompact]}>
            <View
              style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}
            >
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
              />
            </View>

            <View
              style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}
            >
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isCompact && styles.loginButtonCompact,
              ]}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.registerLink,
                isCompact && styles.registerLinkCompact,
              ]}
              onPress={() => navigation.navigate("Register")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.registerText}>
                ¿No tienes cuenta?{" "}
                <Text style={styles.registerTextBold}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  scrollContentCompact: {
    justifyContent: "flex-start",
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  headerCompact: {
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 300,
    height: 200,
    marginBottom: spacing.xl,
  },
  logoImageCompact: {
    width: 220,
    height: 140,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    paddingHorizontal: spacing.xxl,
  },
  formCompact: {
    paddingHorizontal: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputGroupCompact: {
    marginBottom: spacing.md,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...textStyles.body,
    color: colors.text,
  },
  inputCompact: {
    paddingVertical: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  loginButtonCompact: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  loginButtonText: {
    ...textStyles.button,
    color: colors.white,
  },
  registerLink: {
    marginTop: spacing.xl,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  registerLinkCompact: {
    marginTop: spacing.md,
  },
  registerText: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  registerTextBold: {
    color: colors.primary,
    fontWeight: "600",
  },
});
