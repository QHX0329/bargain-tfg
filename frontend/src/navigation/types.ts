/**
 * Definición de tipos para el sistema de navegación de BargAIn.
 *
 * Tipado fuerte para todas las rutas y sus parámetros.
 */

/** Parámetros del Stack raíz */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

/** Parámetros del Stack de autenticación */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Parámetros del Tab Navigator principal */
export type MainTabParamList = {
  HomeTab: undefined;
  ListsTab: undefined;
  MapTab: undefined;
  ProfileTab: undefined;
};

/** Parámetros del Stack de Home */
export type HomeStackParamList = {
  Home: undefined;
};

/** Parámetros del Stack de Listas */
export type ListsStackParamList = {
  Lists: undefined;
  ListDetail: { listId: string; listName: string };
};

/** Parámetros del Stack de Mapa */
export type MapStackParamList = {
  Map: undefined;
};

/** Parámetros del Stack de Perfil */
export type ProfileStackParamList = {
  Profile: undefined;
};
