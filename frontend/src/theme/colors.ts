/**
 * Paleta de colores de BargAIn.
 *
 * Colores organizados en modo claro y oscuro.
 * El verde y azul se inspiran en ahorro + confianza.
 */

export const colors = {
  /** Colores primarios de marca */
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  /** Colores secundarios (acento) */
  secondary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  /** Colores de estado */
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  /** Tema claro */
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F3F5',
    text: '#1A1A2E',
    textSecondary: '#6C757D',
    textTertiary: '#ADB5BD',
    border: '#DEE2E6',
    divider: '#E9ECEF',
    tabBar: '#FFFFFF',
    tabBarInactive: '#ADB5BD',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  /** Tema oscuro */
  dark: {
    background: '#1A1A2E',
    surface: '#16213E',
    surfaceVariant: '#0F3460',
    text: '#F8F9FA',
    textSecondary: '#ADB5BD',
    textTertiary: '#6C757D',
    border: '#2D3748',
    divider: '#2D3748',
    tabBar: '#16213E',
    tabBarInactive: '#6C757D',
    card: '#16213E',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  /** Colores comunes */
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Tipo helper para acceder a los colores del tema activo */
export type ThemeColors = typeof colors.light;
