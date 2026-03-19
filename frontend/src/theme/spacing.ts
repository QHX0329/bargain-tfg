/**
 * Espaciado, bordes y sombras de BargAIn — "Mercado Mediterráneo Digital"
 *
 * Grid base: 8pt (mínimo 4pt para detalles finos).
 * Todos los valores son múltiplos de 4 para alineación pixel-perfect en
 * densidades de pantalla estándar (1x, 2x, 3x).
 */

import { Platform } from "react-native";

// ─── Espaciado (8pt grid) ────────────────────────────────────────────────────

export const spacing = {
  /** 0px */
  none: 0,
  /** 4px — separación mínima, ajustes finos */
  xs: 4,
  /** 8px — gaps pequeños entre elementos inline */
  sm: 8,
  /** 16px — padding estándar de componente */
  md: 16,
  /** 24px — padding de sección, espacio entre grupos */
  lg: 24,
  /** 32px — separación entre bloques de contenido */
  xl: 32,
  /** 48px — espaciado generoso, cabeceras de pantalla */
  xxl: 48,
  /** 64px — espacio heroico, separaciones de onboarding */
  xxxl: 64,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  /** 0px — sin redondeo, bordes rectos */
  none: 0,
  /** 6px — bordes suaves para inputs pequeños, chips compactos */
  sm: 6,
  /** 12px — cards estándar, botones */
  md: 12,
  /** 20px — cards grandes, modals, bottom sheets */
  lg: 20,
  /** 999px — pill, badges, chips de tienda */
  pill: 999,
} as const;

// ─── Sombras ─────────────────────────────────────────────────────────────────
//
// En React Native, las sombras se definen con propiedades nativas distintas
// por plataforma (shadowColor/Offset/Opacity/Radius en iOS,
// elevation en Android). Se proveen ambas formas.

const hexToRgba = (hex: string, opacity: number): string => {
  const sanitized = hex.replace("#", "").trim();
  const expanded =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => char + char)
          .join("")
      : sanitized;

  if (expanded.length !== 6) return `rgba(0,0,0,${opacity})`;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity})`;
};

const _buildShadow = (
  color: string,
  offsetX: number,
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: {
      elevation,
    },
    web: {
      boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${hexToRgba(color, opacity)}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
  }) as {
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
    boxShadow?: string;
  };

export const shadows = {
  /**
   * card — sombra cálida de cards con tinte naranja BargAIn.
   * 0 2px 12px rgba(232,84,26, 0.08)
   */
  card: _buildShadow("#E8541A", 0, 2, 6, 0.08, 2),

  /**
   * elevated — sombra profunda para modals, bottom sheets, elements flotantes.
   * 0 8px 32px rgba(26,26,24, 0.12)
   */
  elevated: _buildShadow("#1A1A18", 0, 8, 16, 0.12, 8),

  /**
   * button — sombra para botones primarios en estado rest.
   * 0 4px 16px rgba(232,84,26, 0.28)
   */
  button: _buildShadow("#E8541A", 0, 4, 8, 0.28, 4),

  /**
   * tabBar — sombra superior de la barra de navegación.
   */
  tabBar: _buildShadow("#1A1A18", 0, -2, 12, 0.06, 12),

  /**
   * none — sin sombra (valor neutro útil para resets condicionales).
   */
  none: Platform.select({
    ios: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
    web: { boxShadow: "none" },
    default: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
  }) as {
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
    boxShadow?: string;
  },
} as const;

// ─── Dimensiones de componente ───────────────────────────────────────────────

export const sizes = {
  /** Altura estándar de botón (BargainButton) */
  buttonHeight: {
    sm: 36,
    md: 48,
    lg: 56,
  },
  /** Altura de SearchBar */
  searchBarHeight: 44,
  /** Altura de BottomTabBar (sin safe area) — iOS estándar: 49pt */
  tabBarHeight: 50,
  /** Altura de row de lista */
  listItemHeight: 56,
  /** Tamaño de icono estándar en tabs */
  tabIconSize: 24,
  /** Tamaño de avatar/logo de tienda en chips */
  storeLogoSize: 32,
  /** Indicador de precio badge */
  priceBadgeHeight: 28,
  /** Dot de notificación */
  notificationDot: 8,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Sizes = typeof sizes;
