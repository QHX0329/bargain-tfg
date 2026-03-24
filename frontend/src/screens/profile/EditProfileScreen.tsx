import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
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

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const authUser = useAuthStore((s) => s.user);

  const initialFirstName = useMemo(
    () => profile?.first_name ?? authUser?.name?.split(" ")[0] ?? "",
    [profile?.first_name, authUser?.name],
  );
  const initialLastName = useMemo(
    () =>
      profile?.last_name ?? authUser?.name?.split(" ").slice(1).join(" ") ?? "",
    [profile?.last_name, authUser?.name],
  );
  const initialEmail = profile?.email ?? authUser?.email ?? "";

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    profile?.avatar ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const userInitial = (
    firstName.charAt(0) ||
    authUser?.name?.charAt(0) ||
    "U"
  ).toUpperCase();

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu galería para cambiar la foto de perfil.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst) {
      Alert.alert("Validación", "El nombre no puede estar vacío.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      Alert.alert("Validación", "Introduce un email válido.");
      return;
    }

    setIsSaving(true);
    try {
      const isLocalFile =
        avatarUri != null &&
        (avatarUri.startsWith("file://") || avatarUri.startsWith("content://"));

      let updated;
      if (isLocalFile) {
        const formData = new FormData();
        formData.append("first_name", trimmedFirst);
        formData.append("last_name", trimmedLast);
        formData.append("email", trimmedEmail);
        const fileName = avatarUri.split("/").pop() ?? "avatar.jpg";
        const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        // React Native / Expo acepta este shape en FormData

        formData.append("avatar", {
          uri: avatarUri,
          name: fileName,
          type: mimeType,
        } as any);
        updated = await authService.updateProfile(formData);
      } else {
        updated = await authService.updateProfile({
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: trimmedEmail,
        });
      }
      setProfile(updated);
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              name:
                [updated.first_name, updated.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || state.user.name,
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
  }, [firstName, lastName, email, avatarUri, navigation, setProfile]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Modificar información</Text>
        <Text style={styles.subtitle}>
          Actualiza tus datos personales para mantener tu perfil al día.
        </Text>

        {/* ── Avatar ─────────────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar la foto</Text>
        </View>

        {/* ── Nombre ─────────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            testID="input-edit-first-name"
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {/* ── Apellidos ───────────────────────────────────────────────────── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Apellidos</Text>
          <TextInput
            testID="input-edit-last-name"
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Tus apellidos"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {/* ── Email ───────────────────────────────────────────────────────── */}
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
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: spacing.xs,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["3xl"],
    color: colors.primary,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
    ...shadows.button,
  },
  avatarHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
