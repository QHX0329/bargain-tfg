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
  AssistantTab: undefined;
  ProfileTab: undefined;
};

/** Parámetros del Stack de Home */
export type HomeStackParamList = {
  Home: undefined;
  ProductsCatalog: { listId?: string; listName?: string } | undefined;
  Notifications: undefined;
  PriceAlerts: undefined;
  FavoriteStores: undefined;
  PriceCompare: {
    productId: string;
    productName: string;
    product?: import("@/types/domain").Product;
  };
};

/** Parámetros del Stack de Listas */
export type ListsStackParamList = {
  Lists: undefined;
  ListDetail: { listId: string; listName: string };
  Templates: undefined;
  ProductsCatalog: { listId?: string; listName?: string } | undefined;
  PriceCompare: {
    productId: string;
    productName: string;
    product?: import("@/types/domain").Product;
  };
  Route: { listId: string; listName: string };
  OCR: { listId?: string };
};

/** Parámetros del Stack de Mapa */
export type MapStackParamList = {
  Map: undefined;
  StoreProfile: {
    storeId: string;
    storeName?: string;
    userLat: number;
    userLng: number;
  };
};

/** Parámetros del Stack del Asistente */
export type AssistantStackParamList = {
  Assistant: undefined;
};

/** Parámetros del Stack de Perfil */
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  OptimizerConfig: undefined;
};
