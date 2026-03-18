import React, { useCallback, useMemo, useState } from "react";
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
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import type { ProfileStackParamList } from "@/navigation/types";

interface EditProfileScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "EditProfile">;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const authUser = useAuthStore((s) => s.user);

  const initialName = useMemo(() => {
    if (profile?.first_name || profile?.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    }
    if (profile?.name) return profile.name;
    if (authUser?.name) return authUser.name;
    return "";
  }, [authUser?.name, profile?.first_name, profile?.last_name, profile?.name]);

  const initialEmail = profile?.email ?? authUser?.email ?? "";

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      Alert.alert("Validación", "El nombre no puede estar vacío.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      Alert.alert("Validación", "Introduce un email válido.");
      return;
    }

    const parts = trimmedName.split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");

    setIsSaving(true);
    try {
      const updated = await authService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: trimmedEmail,
      });
      setProfile(updated);
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              name: [updated.first_name, updated.last_name].filter(Boolean).join(" ").trim() || state.user.name,
              email: updated.email,
            }
          : state.user,
      }));
      navigation.goBack();
    } catch {
      Alert.alert("Error", "No se pudo actualizar la información del usuario.");
    } finally {
      setIsSaving(false);
    }
  }, [email, fullName, navigation, setProfile]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Modificar información</Text>
        <Text style={styles.subtitle}>
          Actualiza tus datos personales para mantener tu perfil al día.
        </Text>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Nombre completo</Text>
          <TextInput
            testID="input-edit-name"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Nombre y apellidos"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            testID="input-edit-email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <BargainButton
          testID="btn-save-profile"
          label="Guardar cambios"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

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
  submitButton: {
    marginTop: spacing.md,
  },
});
