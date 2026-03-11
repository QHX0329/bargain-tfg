/**
 * Escalas tipográficas de BargAIn.
 *
 * Se utiliza la fuente del sistema por defecto para rendimiento óptimo.
 * En futuras iteraciones se puede integrar Google Fonts (Inter, Outfit).
 */

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  fontFamily,

  /** Tamaños de fuente (escala modular 1.25) */
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 21,
    '2xl': 26,
    '3xl': 33,
    '4xl': 41,
  },

  /** Pesos de fuente */
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  /** Alturas de línea */
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  /** Estilos predefinidos para uso rápido */
  styles: {
    h1: {
      fontSize: 33,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 26,
      fontWeight: '700' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 21,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    label: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
      letterSpacing: 0.5,
    },
  },
} as const;
