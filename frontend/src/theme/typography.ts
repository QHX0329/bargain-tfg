/**
 * Sistema tipográfico de BargAIn - "Mercado Mediterráneo Digital"
 *
 * En iOS se utiliza la fuente del sistema (SF Pro) para integrarse
 * de forma nativa con la plataforma. En Android y web se mantienen
 * las familias tipográficas personalizadas.
 *
 * - iOS      → SF Pro (fontFamily: undefined + fontWeight explícito)
 * - Android  → Source Sans 3 (Google Fonts)
 * - Display  → Fraunces (solo Android/Web) / SF Pro Display en iOS
 * - Mono     → Menlo (iOS) / IBM Plex Mono (Android/Web)
 */

import { Platform } from "react-native";

// ─── Familias tipográficas ────────────────────────────────────────────────────

/**
 * En iOS, fontFamily = undefined activa SF Pro automáticamente.
 * El peso se controla mediante fontWeight en textStyles.
 */
export const fontFamilies = {
  /** Display: Fraunces en Android/Web — SF Pro Display en iOS */
  display:       Platform.OS === "ios" ? undefined : "Fraunces_600SemiBold",
  /** Body regular */
  body:          Platform.OS === "ios" ? undefined : "SourceSans3_400Regular",
  bodyMedium:    Platform.OS === "ios" ? undefined : "SourceSans3_500Medium",
  bodySemiBold:  Platform.OS === "ios" ? undefined : "SourceSans3_600SemiBold",
  bodyBold:      Platform.OS === "ios" ? undefined : "SourceSans3_700Bold",
  /** Monoespaciado: Menlo (iOS) / IBM Plex Mono (otros) */
  mono:          Platform.OS === "ios" ? "Menlo"   : "IBMPlexMono_400Regular",
  monoMedium:    Platform.OS === "ios" ? "Menlo"   : "IBMPlexMono_500Medium",
} as Record<string, string | undefined>;

/**
 * Pesos de fuente para iOS (SF Pro).
 * En Android/Web el peso viene codificado en el nombre de familia, por lo que
 * estos valores son undefined para no interferir con los Google Fonts.
 */
const iosW = {
  regular:  Platform.OS === "ios" ? ("400" as const) : undefined,
  medium:   Platform.OS === "ios" ? ("500" as const) : undefined,
  semibold: Platform.OS === "ios" ? ("600" as const) : undefined,
  bold:     Platform.OS === "ios" ? ("700" as const) : undefined,
  heavy:    Platform.OS === "ios" ? ("800" as const) : undefined,
};

// ─── Escala de tamaños (móvil 360px) ─────────────────────────────────────────

export const fontSize = {
  /** 11px - caption iOS, badges muy pequeños */
  "2xs": 11,
  /** 12px - caption, badges, etiquetas muy pequeñas */
  xs: 12,
  /** 13px - labels iOS estándar, metadata */
  "13": 13,
  /** 14px - labels de formulario, metadata, tiempo */
  sm: 14,
  /** 15px - texto de cuerpo iOS estándar */
  "15": 15,
  /** 16px - texto de cuerpo estándar */
  md: 16,
  /** 17px - texto de cuerpo iOS grande (headline) */
  "17": 17,
  /** 18px - texto de cuerpo grande, subtítulos */
  lg: 18,
  /** 20px - subtítulos de sección */
  xl: 20,
  /** 22px - títulos de pantalla iOS */
  "2xl": 22,
  /** 28px - títulos grandes iOS (Large Title) */
  "3xl": 28,
  /** 34px - Large Title iOS */
  "4xl": 34,
  /** 48px - hero display */
  "5xl": 48,
} as const;

// ─── Pesos ────────────────────────────────────────────────────────────────────

export const fontWeight = {
  regular: "400" as const,
  medium:  "500" as const,
  semibold: "600" as const,
  bold:    "700" as const,
} as const;

// ─── Alturas de línea ─────────────────────────────────────────────────────────

export const lineHeight = {
  /** 1.15 - display grandes, un solo renglón */
  tight:   1.15,
  /** 1.35 - headings H2-H3 */
  snug:    1.35,
  /** 1.55 - cuerpo de texto estándar */
  normal:  1.55,
  /** 1.7 - texto largo, párrafos de chat */
  relaxed: 1.7,
} as const;

// ─── Tracking (letter-spacing) ───────────────────────────────────────────────

export const letterSpacing = {
  tight:  -0.3,
  normal:  0,
  wide:    0.2,
  /** Para labels en mayúsculas */
  wider:   0.4,
  /** Para caps tracking decorativo */
  widest:  0.8,
} as const;

// ─── Estilos compuestos ───────────────────────────────────────────────────────

/**
 * Estilos tipográficos predefinidos que integran fontFamily + fontWeight
 * según la plataforma. En iOS producen SF Pro; en Android/Web usan
 * las familias Google Fonts instaladas.
 *
 * @example
 * <Text style={[textStyles.heading1, { color: colors.text }]}>
 *   BargAIn
 * </Text>
 */
export const textStyles = {
  // ── Display ────────────────────────────────────────────────────────────────

  heroDisplay: {
    fontFamily: fontFamilies.display,
    fontWeight: iosW.bold,
    fontSize: fontSize["5xl"],
    lineHeight: Math.round(fontSize["5xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontWeight: iosW.bold,
    fontSize: fontSize["4xl"],
    lineHeight: Math.round(fontSize["4xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },

  // ── Headings ───────────────────────────────────────────────────────────────

  /** Large Title iOS (34pt) */
  heading1: {
    fontFamily: fontFamilies.display,
    fontWeight: iosW.bold,
    fontSize: fontSize["3xl"],
    lineHeight: Math.round(fontSize["3xl"] * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },
  /** Title 1 iOS (28pt) */
  heading2: {
    fontFamily: fontFamilies.display,
    fontWeight: iosW.bold,
    fontSize: fontSize["2xl"],
    lineHeight: Math.round(fontSize["2xl"] * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },
  /** Title 2 iOS — Source Sans SemiBold */
  heading3: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: iosW.semibold,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },
  /** Title 3 iOS */
  heading4: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: iosW.semibold,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },

  // ── Body ───────────────────────────────────────────────────────────────────

  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontWeight: iosW.regular,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.normal),
  },
  body: {
    fontFamily: fontFamilies.body,
    fontWeight: iosW.regular,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.normal),
  },
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: iosW.medium,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.normal),
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontWeight: iosW.regular,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.normal),
  },

  // ── Labels ─────────────────────────────────────────────────────────────────

  /** Subhead iOS (15pt semibold) */
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: iosW.semibold,
    fontSize: fontSize["15"],
    lineHeight: Math.round(fontSize["15"] * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },
  /** Caption iOS (11–12pt) */
  labelSmall: {
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: iosW.medium,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    letterSpacing: letterSpacing.wider,
  },

  // ── Caption ────────────────────────────────────────────────────────────────

  caption: {
    fontFamily: fontFamilies.body,
    fontWeight: iosW.regular,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.normal),
  },

  // ── Botones ────────────────────────────────────────────────────────────────

  button: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: iosW.semibold,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.bodySemiBold,
    fontWeight: iosW.semibold,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },

  // ── Precios (monoespaciado) ────────────────────────────────────────────────

  priceLarge: {
    fontFamily: fontFamilies.monoMedium,
    fontWeight: iosW.medium,
    fontSize: fontSize["3xl"],
    lineHeight: Math.round(fontSize["3xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },
  price: {
    fontFamily: fontFamilies.monoMedium,
    fontWeight: iosW.medium,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
  },
  priceSmall: {
    fontFamily: fontFamilies.mono,
    fontWeight: iosW.regular,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
  },
  priceCaption: {
    fontFamily: fontFamilies.mono,
    fontWeight: iosW.regular,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
  },
} as const;

// ─── Objeto unificado para importación conveniente ────────────────────────────

export const typography = {
  fontFamilies,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} as const;

export type Typography = typeof typography;
