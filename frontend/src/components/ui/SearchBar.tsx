/**
 * [C08] SearchBar — Barra de búsqueda con filtros inline.
 *
 * Características:
 *   - Animación de foco: borde cambia de `colors.border` → `colors.primary`
 *     usando `interpolateColor` de Reanimated 2.
 *   - Botón de limpiar (×) aparece con fade cuando hay texto.
 *   - Icono de filtros opcional (`onFilterPress`) con badge numérico.
 *   - Placeholder contextual — se puede pasar o usa el default.
 *   - Estado `loading` muestra ActivityIndicator en lugar del icono derecho.
 *   - Estado `disabled` opacidad reducida.
 *
 * @example
 * <SearchBar
 *   value={query}
 *   onChangeText={setQuery}
 *   placeholder="Busca leche, aceite, pan…"
 *   onFilterPress={openFilters}
 *   activeFilterCount={2}
 * />
 */

import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  fontFamilies,
  fontSize,
  sizes,
} from "@/theme";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SearchBarProps {
  /** Valor actual del campo de búsqueda */
  value: string;
  /** Callback al cambiar el texto */
  onChangeText: (text: string) => void;
  /** Placeholder (default: 'Busca productos, tiendas…') */
  placeholder?: string;
  /** Callback al enviar la búsqueda (teclado) */
  onSubmit?: (query: string) => void;
  /** Callback al abrir el panel de filtros */
  onFilterPress?: () => void;
  /** Número de filtros activos (muestra badge naranja) */
  activeFilterCount?: number;
  /** Muestra spinner en lugar del icono de filtros */
  loading?: boolean;
  /** Deshabilita la interacción */
  disabled?: boolean;
  /** Enfoca automáticamente al montar */
  autoFocus?: boolean;
  /** Estilo adicional del contenedor exterior */
  style?: StyleProp<ViewStyle>;
  /** Props adicionales para el TextInput */
  inputProps?: Omit<
    TextInputProps,
    "value" | "onChangeText" | "placeholder" | "editable"
  >;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FOCUS_DURATION = 180;

const SearchIcon: React.FC<{ color: string }> = ({ color }) => (
  <Ionicons name="search" size={18} color={color} />
);

const FilterIcon: React.FC<{ color: string }> = ({ color }) => (
  <Ionicons name="options-outline" size={18} color={color} />
);

const ClearIcon: React.FC<{ color: string }> = ({ color }) => (
  <Ionicons name="close" size={18} color={color} />
);

// ─── Componente ───────────────────────────────────────────────────────────────

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Busca productos, tiendas…",
  onSubmit,
  onFilterPress,
  activeFilterCount = 0,
  loading = false,
  disabled = false,
  autoFocus = false,
  style,
  inputProps,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // ─── Animación de foco ─────────────────────────────────────────────────────
  const focusProgress = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.surface, colors.white],
    ),
  }));

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: FOCUS_DURATION });
    setIsFocused(true);
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: FOCUS_DURATION });
    setIsFocused(false);
  }, [focusProgress]);

  const handleClear = useCallback(() => {
    onChangeText("");
    inputRef.current?.focus();
  }, [onChangeText]);

  const handleContainerPress = useCallback(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const iconColor = isFocused ? colors.primary : colors.textMuted;
  const hasValue = value.length > 0;
  const showClear = hasValue && !loading;
  const showFilters = !!onFilterPress && !showClear;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <TouchableOpacity
      onPress={handleContainerPress}
      activeOpacity={1}
      disabled={disabled}
      accessibilityRole="search"
      style={[styles.outerContainer, disabled && styles.disabled, style]}
    >
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        {/* Icono de búsqueda izquierdo */}
        <View style={[styles.leftIcon, styles.pointerNone]}>
          <SearchIcon color={iconColor} />
        </View>

        {/* Input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => onSubmit?.(value)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          editable={!disabled}
          autoFocus={autoFocus}
          style={[styles.input]}
          accessibilityLabel="Campo de búsqueda"
          accessibilityHint={placeholder}
          {...inputProps}
        />

        {/* Lado derecho: clear / filtros / spinner */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.rightSlot}
            accessibilityLabel="Buscando"
          />
        )}

        {showClear && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
          >
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <ClearIcon color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {showFilters && (
          <TouchableOpacity
            onPress={onFilterPress}
            style={styles.filterButton}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              hasActiveFilters
                ? `Filtros: ${activeFilterCount} activos`
                : "Abrir filtros"
            }
          >
            <FilterIcon
              color={hasActiveFilters ? colors.primary : colors.textMuted}
            />
            {hasActiveFilters && (
              <View
                style={styles.filterBadge}
                accessible={false}
                importantForAccessibility="no"
              >
                <Animated.Text style={styles.filterBadgeText}>
                  {activeFilterCount}
                </Animated.Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.5,
  },
  container: {
    height: sizes.searchBarHeight,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  leftIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pointerNone: {
    pointerEvents: "none",
  },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  rightSlot: {
    marginLeft: spacing.xs,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 9,
    color: colors.white,
    lineHeight: 11,
  },
});

export default SearchBar;
