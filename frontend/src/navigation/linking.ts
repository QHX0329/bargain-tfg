/**
 * Configuración de deep-linking de React Navigation para BargAIn.
 *
 * Refleja la jerarquía exacta del navegador:
 * RootStack → Main → {HomeTab, ListsTab, MapTab, AssistantTab} → stacks de screens
 * RootStack → Auth → {Login, Register}
 *
 * IMPORTANTE (Pitfall 8): FavoriteStores vive en HomeStack, NO en MapStack.
 * Su URL /app/map/favorites está registrada bajo HomeTab.screens.
 *
 * Decisión D-08 del UI-SPEC: todos los paths están definidos aquí para
 * que los flow plans no toquen la configuración de navegación.
 */

import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'http://localhost:19006',
    'http://localhost:8081',
    'https://bargain.app',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              Home: 'app/home',
              ProductsCatalog: 'app/home/catalog',
              PriceCompare: 'app/home/compare',
              PriceAlerts: 'app/home/alerts',
              Notifications: 'app/home/notifications',
              // FavoriteStores vive en HomeStack aunque su URL sea /app/map/favorites (Pitfall 8)
              FavoriteStores: 'app/map/favorites',
              ProductProposal: 'app/home/propose',
            },
          },
          ListsTab: {
            screens: {
              Lists: 'app/lists',
              ListDetail: 'app/lists/:listId',
              Templates: 'app/lists/templates',
              OCR: 'app/lists/ocr',
              Route: 'app/lists/route',
            },
          },
          MapTab: {
            screens: {
              Map: 'app/map',
              StoreProfile: 'app/map/store/:storeId',
            },
          },
          AssistantTab: {
            screens: {
              Assistant: 'app/assistant',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
    },
  },
};
