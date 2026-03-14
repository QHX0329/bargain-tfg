/**
 * Sistema tipografico de BargAIn - "Mercado Mediterraneo Digital"
 *
 * Tres familias tipograficas con roles muy definidos:
 *
 * - Fraunces          - Headings y display text. Serif con personalidad
 *                       editorial y un tono mediterraneo contemporaneo.
 *
 * - Source Sans 3     - Body, UI labels, navegacion. Sans-serif neutro y
 *                       legible a cualquier tamano en pantalla movil.
 *
 * - IBM Plex Mono     - Exclusivo para cantidades monetarias (EUR). Monoespaciado
 *                       que da peso visual y precision a los precios.
 *
 * Instalacion (expo-google-fonts):
 *   npx expo install @expo-google-fonts/fraunces
 *   npx expo install @expo-google-fonts/source-sans-3
 *   npx expo install @expo-google-fonts/ibm-plex-mono
 *
 * En _layout.tsx o App.tsx:
 *   const [fontsLoaded] = useFonts({
 *     Fraunces_600SemiBold,
 *     Fraunces_700Bold,
 *     SourceSans3_400Regular,
 *     SourceSans3_500Medium,
 *     SourceSans3_600SemiBold,
 *     SourceSans3_700Bold,
 *     IBMPlexMono_400Regular,
 *     IBMPlexMono_500Medium,
 *   });
 */

// ─── Nombres de familia ───────────────────────────────────────────────────────

export const fontFamilies = {
  /** Fraunces - headings, hero text, display */
  display: "Fraunces_600SemiBold",
  /** Source Sans 3 - todos los textos de interfaz */
  body: "SourceSans3_400Regular",
  bodyMedium: "SourceSans3_500Medium",
  bodySemiBold: "SourceSans3_600SemiBold",
  bodyBold: "SourceSans3_700Bold",
  /** IBM Plex Mono - cantidades monetarias unicamente */
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

// ─── Escala de tamanos (movil 360px) ─────────────────────────────────────────

export const fontSize = {
  /** 12px - caption, badges, etiquetas muy pequenas */
  xs: 12,
  /** 14px - labels de formulario, metadata, tiempo */
  sm: 14,
  /** 16px - texto de cuerpo estandar */
  md: 16,
  /** 18px - texto de cuerpo grande, subtitulos */
  lg: 18,
  /** 20px - subtitulos de seccion */
  xl: 20,
  /** 24px - titulos de pantalla */
  "2xl": 24,
  /** 30px - titulos grandes */
  "3xl": 30,
  /** 38px - display, numero de ahorro destacado */
  "4xl": 38,
  /** 48px - hero display (onboarding, cifras clave) */
  "5xl": 48,
} as const;

// ─── Pesos ────────────────────────────────────────────────────────────────────

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
} as const;

// ─── Alturas de línea ─────────────────────────────────────────────────────────

export const lineHeight = {
  /** 1.15 - display grandes, un solo renglon */
  tight: 1.15,
  /** 1.35 - headings H2-H3 */
  snug: 1.35,
  /** 1.55 - cuerpo de texto estandar */
  normal: 1.55,
  /** 1.7 - texto largo, parrafos de chat */
  relaxed: 1.7,
} as const;

// ─── Tracking (letter-spacing) ───────────────────────────────────────────────

export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.2,
  /** Para labels en mayusculas */
  wider: 0.4,
  /** Para caps tracking decorativo */
  widest: 0.8,
} as const;

// ─── Estilos compuestos listos para usar ─────────────────────────────────────

/**
 * Estilos tipográficos predefinidos. Usar como spread o TextStyle directamente.
 *
 * @example
 * <Text style={[textStyles.heading1, { color: colors.text }]}>
 *   BargAIn
 * </Text>
 */
export const textStyles = {
  // Display - Fraunces, pantalla completa / hero
  heroDisplay: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["5xl"],
    lineHeight: Math.round(fontSize["5xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["4xl"],
    lineHeight: Math.round(fontSize["4xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },

  // Headings - Fraunces
  heading1: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["3xl"],
    lineHeight: Math.round(fontSize["3xl"] * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },
  heading2: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize["2xl"],
    lineHeight: Math.round(fontSize["2xl"] * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },
  // Sub-headings - Source Sans 3 (sans da mas densidad de info)
  heading3: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },
  heading4: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },

  // Body - Source Sans 3
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.normal),
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.normal),
  },
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.normal),
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.normal),
  },

  // Label - Source Sans 3 SemiBold con tracking
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },
  labelSmall: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    letterSpacing: letterSpacing.wider,
  },

  // Caption - muy pequeno, metadatos
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.normal),
  },

  // Button - CTA, acciones principales
  button: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    letterSpacing: letterSpacing.wide,
  },

  // Precio - IBM Plex Mono, exclusivo para cantidades monetarias
  priceLarge: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize["3xl"],
    lineHeight: Math.round(fontSize["3xl"] * lineHeight.tight),
    letterSpacing: letterSpacing.tight,
  },
  price: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
  },
  priceSmall: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
  },
  priceCaption: {
    fontFamily: fontFamilies.mono,
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
