/**
 * Pantalla de registro de usuario.
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

type RegisterNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Register"
>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const login = useAuthStore((state) => state.login);
  const { height } = useWindowDimensions();
  const isCompact = height <= 650;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    // TODO: implementar lógica real de registro con API (F3-02)
    login("fake-token", { id: "1", email, name });
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
            <Text style={[styles.title, isCompact && styles.titleCompact]}>
              Crea tu cuenta
            </Text>
            <Text
              style={[styles.subtitle, isCompact && styles.subtitleCompact]}
            >
              Únete a BargAIn y empieza a ahorrar
            </Text>
          </View>

          <View style={[styles.form, isCompact && styles.formCompact]}>
            <View
              style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}
            >
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

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
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                isCompact && styles.registerButtonCompact,
              ]}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginLink, isCompact && styles.loginLinkCompact]}
              onPress={() => navigation.navigate("Login")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.loginText}>
                ¿Ya tienes cuenta?{" "}
                <Text style={styles.loginTextBold}>Inicia sesión</Text>
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
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  headerCompact: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  logoImage: {
    width: 200,
    height: 100,
  },
  logoImageCompact: {
    width: 160,
    height: 80,
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
    marginTop: spacing.sm,
  },
  subtitleCompact: {
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
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  registerButtonCompact: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  registerButtonText: {
    ...textStyles.button,
    color: colors.white,
  },
  loginLink: {
    marginTop: spacing.xl,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  loginLinkCompact: {
    marginTop: spacing.md,
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
