/**
 * Paleta de colores de BargAIn — "Mercado Mediterráneo Digital"
 *
 * Inspirada en los mercados de Sevilla (Triana, Lonja del Barranco):
 * azulejos, naranja sevillano, verde oliva y cerámica artesanal
 * traducidos a interfaz digital cálida y funcional.
 */

export const colors = {
  // ─── Identidad de marca ───────────────────────────────────────────────
  /** Naranja Triana — CTA principal, énfasis de marca */
  primary: "#E8541A",
  /** Verde Oliva Macarena — éxito, ahorro, acciones positivas */
  secondary: "#2D5016",
  /** Amarillo Azulejo — acento vivo, highlights, badges */
  accent: "#F5C842",

  // ─── Fondos y superficies ────────────────────────────────────────────
  /** Blanco Cálido — fondo raíz de la app */
  background: "#FAFAF7",
  /** Crema Cerámica — superficie de cards, modals y paneles */
  surface: "#FDF6EC",
  /** Variante de superficie — separadores visuales, input backgrounds */
  surfaceVariant: "#F2E3D1",

  // ─── Texto ───────────────────────────────────────────────────────────
  /** Casi Negro cálido — texto principal */
  text: "#1A1A18",
  /** Gris Tierra — texto secundario, subtítulos, placeholders */
  textMuted: "#4F4F47",
  /** Texto desactivado */
  textDisabled: "#B0AFA6",

  // ─── Estados semánticos ──────────────────────────────────────────────
  /** Verde Ahorro — confirmación, precio reducido, rutas óptimas */
  success: "#3A7D44",
  /** Rojo Alerta — errores, precio subido, avisos críticos */
  error: "#C0392B",
  /** Ámbar Aviso — advertencias, expiración próxima de precio */
  warning: "#D4850A",
  /** Azul Informativo — tooltips, estados neutros */
  info: "#1A6B8A",

  // ─── Bordes y separadores ────────────────────────────────────────────
  /** Borde Suave — contornos de input, separaciones de card */
  border: "#E8E0D0",
  /** Divisor ligero — líneas entre ítems de lista */
  divider: "#EFE9DB",

  // ─── Tintes de primaria (estados interactivos) ───────────────────────
  primaryTint: "#FCE7DD", // Fondo hover / focus suave
  primaryLight: "#F5A07A", // Versión clara para estados visuales
  primaryDark: "#C03E0E", // Pressed / versión profunda

  // ─── Tintes de secundaria ────────────────────────────────────────────
  secondaryTint: "#EAF1E6",
  secondaryLight: "#5A8A30",
  secondaryDark: "#1E3610",

  // ─── Tintes de acento ────────────────────────────────────────────────
  accentTint: "#FEF9E7",
  accentDark: "#C9A20A",

  // ─── Fondos semánticos con opacidad ──────────────────────────────────
  successBg: "#EDF5EF",
  errorBg: "#FBEAEA",
  warningBg: "#FEF3E2",
  infoBg: "#E6F3F8",

  // ─── Overlays ────────────────────────────────────────────────────────
  overlay: "rgba(26, 26, 24, 0.5)",
  overlayLight: "rgba(26, 26, 24, 0.18)",
  overlayHeavy: "rgba(26, 26, 24, 0.72)",

  // ─── Primitivos ──────────────────────────────────────────────────────
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  // ─── Colores de cadenas de supermercado ──────────────────────────────
  /** Usado en chips de tienda, marcadores de mapa y logos */
  chains: {
    mercadona: "#00A650",
    lidl: "#0050AA",
    aldi: "#00529F",
    carrefour: "#004A99",
    dia: "#E30613",
    alcampo: "#E4002B",
    local: "#E8541A", // Comercio local = primario BargAIn
  },

  // ─── Compat legacy (v1 theme API) ─────────────────────────────────────
  // Mantiene operativas pantallas que todavía consumen `colors.light.*`.
  light: {
    background: "#FAFAF7",
    surface: "#FDF6EC",
    surfaceVariant: "#F5EDD9",
    text: "#1A1A18",
    textSecondary: "#6B6B63",
    textTertiary: "#B0AFA6",
    border: "#E8E0D0",
    divider: "#EFE9DB",
    tabBar: "#FDF6EC",
    tabBarInactive: "#6B6B63",
  },
} as const;

export type Colors = typeof colors;
