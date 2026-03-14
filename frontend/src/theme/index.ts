/**
 * Design System de BargAIn — "Mercado Mediterráneo Digital"
 *
 * Barrel export unificado. Importa siempre desde '@/theme', nunca
 * desde sub-archivos directamente, para mantener la API estable.
 *
 * @example
 * import { colors, typography, spacing, borderRadius, shadows, sizes } from '@/theme';
 */

// ─── Objeto `theme` consolidado ──────────────────────────────────────────────
// Útil cuando se necesita pasar el tema completo a un provider o función helper.

import { colors } from "./colors";
import {
  typography,
  fontFamilies,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} from "./typography";
import { spacing, borderRadius, shadows, sizes } from "./spacing";

export { colors } from "./colors";
export type { Colors } from "./colors";

export {
  typography,
  fontFamilies,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} from "./typography";
export type { Typography } from "./typography";

export { spacing, borderRadius, shadows, sizes } from "./spacing";
export type { Spacing, BorderRadius, Shadows, Sizes } from "./spacing";

export const theme = {
  colors,
  typography,
  fontFamilies,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  sizes,
} as const;

export type Theme = typeof theme;
