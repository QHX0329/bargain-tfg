/**
 * AppModal — Modal personalizado del design system de BargAIn.
 *
 * Reemplaza Alert.alert, Alert.prompt y window.prompt con un modal
 * diseñado acorde al sistema visual "Mercado Mediterráneo Digital".
 *
 * Tipos:
 *   input   — Con TextInput. Para crear o renombrar elementos.
 *   confirm — Sin input. Para acciones destructivas o confirmaciones.
 *   info    — Sin input. Para mensajes informativos (solo OK).
 *
 * @example
 * // Modal de creación con input
 * <AppModal
 *   visible={showModal}
 *   type="input"
 *   title="Nueva lista"
 *   placeholder="Nombre de la lista"
 *   confirmLabel="Crear"
 *   onConfirm={(value) => handleCreate(value!)}
 *   onCancel={() => setShowModal(false)}
 * />
 *
 * @example
 * // Modal de confirmación destructiva
 * <AppModal
 *   visible={showDelete}
 *   type="confirm"
 *   title="Eliminar lista"
 *   message="Esta acción no se puede deshacer."
 *   confirmLabel="Eliminar"
 *   confirmVariant="danger"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDelete(false)}
 * />
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  borderRadius,
  colors,
  shadows,
  spacing,
  textStyles,
} from "@/theme";
import { blurActiveElementOnWeb } from "@/utils/webA11y";
import { BargainButton, type ButtonVariant } from "./BargainButton";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AppModalType = "input" | "confirm" | "info";

export interface AppModalProps {
  /** Controla si el modal es visible */
  visible: boolean;
  /** Tipo de modal: input, confirm o info */
  type?: AppModalType;
  /** Título del modal */
  title: string;
  /** Texto descriptivo bajo el título (opcional) */
  message?: string;
  /** Placeholder del TextInput (solo type="input") */
  placeholder?: string;
  /** Valor inicial del TextInput (solo type="input") */
  defaultValue?: string;
  /** Etiqueta del botón de confirmación */
  confirmLabel?: string;
  /** Variante visual del botón de confirmación */
  confirmVariant?: ButtonVariant;
  /** Etiqueta del botón de cancelación (no aplica a type="info") */
  cancelLabel?: string;
  /** Estado de carga en el botón de confirmación */
  loading?: boolean;
  /**
   * Callback al confirmar.
   * - type="input":   recibe el texto introducido
   * - type="confirm": recibe undefined
   * - type="info":    recibe undefined
   */
  onConfirm: (value?: string) => void;
  /** Callback al cancelar o pulsar fuera del modal */
  onCancel?: () => void;
  /** testID para pruebas automatizadas */
  testID?: string;
}

// ─── Constantes de animación ──────────────────────────────────────────────────

const CAN_USE_NATIVE_DRIVER = Platform.OS !== "web";
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 320,
  useNativeDriver: CAN_USE_NATIVE_DRIVER,
} as const;

// ─── Componente ───────────────────────────────────────────────────────────────

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  type = "info",
  title,
  message,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "Aceptar",
  confirmVariant = "primary",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
  testID,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // ─── Resetear input al abrir ────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // In web, blur current focused element before opening modal to avoid
      // aria-hidden warnings caused by focused descendants outside the modal.
      blurActiveElementOnWeb();

      setInputValue(defaultValue);
      // Animar entrada
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, ...SPRING_CONFIG }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: CAN_USE_NATIVE_DRIVER,
        }),
      ]).start(() => {
        if (type === "input") {
          // Pequeño delay para que el modal esté montado antes del focus
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      });
    } else {
      // Resetear animación al cerrar para la próxima apertura
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    Keyboard.dismiss();
    if (type === "input") {
      onConfirm(inputValue.trim());
    } else {
      onConfirm(undefined);
    }
  }, [type, inputValue, onConfirm]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    onCancel?.();
  }, [onCancel]);

  const handleSubmitEditing = useCallback(() => {
    if (type === "input") handleConfirm();
  }, [type, handleConfirm]);

  const isConfirmDisabled = type === "input" && inputValue.trim().length === 0;
  const hasCancel = type !== "info";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Overlay */}
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={type === "info" ? handleConfirm : handleCancel} />

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            ]}
          >
            {/* Acento de color superior */}
            <View style={styles.accentBar} />

            {/* Título */}
            <Text style={styles.title}>{title}</Text>

            {/* Mensaje */}
            {message ? (
              <Text style={styles.message}>{message}</Text>
            ) : null}

            {/* Input (solo type="input") */}
            {type === "input" ? (
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textDisabled}
                  onSubmitEditing={handleSubmitEditing}
                  returnKeyType="done"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  selectionColor={colors.primary}
                  testID={testID ? `${testID}-input` : undefined}
                />
              </View>
            ) : null}

            {/* Botones */}
            <View style={[styles.actions, !hasCancel && styles.actionsSingle]}>
              {hasCancel && (
                <BargainButton
                  label={cancelLabel}
                  onPress={handleCancel}
                  variant="ghost"
                  size="md"
                  style={styles.actionButton}
                  testID={testID ? `${testID}-cancel` : undefined}
                />
              )}
              <BargainButton
                label={confirmLabel}
                onPress={handleConfirm}
                variant={confirmVariant}
                size="md"
                loading={loading}
                disabled={isConfirmDisabled}
                style={[styles.actionButton, !hasCancel && styles.actionButtonFull]}
                testID={testID ? `${testID}-confirm` : undefined}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...(shadows.elevated as object),
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  title: {
    ...textStyles.heading3,
    color: colors.text,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  message: {
    ...textStyles.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    lineHeight: 22,
  },
  inputWrapper: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    ...textStyles.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  actionsSingle: {
    justifyContent: "center",
  },
  actionButton: {
    flexShrink: 1,
  },
  actionButtonFull: {
    alignSelf: "stretch",
    flex: 1,
  },
});

export default AppModal;
