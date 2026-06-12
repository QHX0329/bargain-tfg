/**
 * Tab Navigator principal de BarGAIN (variante NATIVA — iOS/Android).
 *
 * 5 tabs: Inicio, Listas, Mapa, Asistente, Perfil.
 * Cada tab tiene su propio Stack Navigator anidado (ver mainTabsShared.tsx).
 *
 * Usa @react-navigation/material-top-tabs (sobre react-native-pager-view)
 * para transiciones lado-a-lado sin pantalla blanca entre tabs.
 * El swipe sigue el dedo en tiempo real.
 *
 * NOTA WEB: react-native-pager-view no funciona en react-native-web, por lo que
 * la web usa MainTabs.web.tsx (bottom-tabs). Metro resuelve el sufijo .web automáticamente.
 */

import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import type { MainTabParamList } from "./types";
import {
  HomeStackNavigator,
  ListsStackNavigator,
  MapStackNavigator,
  AssistantStackNavigator,
  ProfileStackNavigator,
  useMainTabDefinitions,
  renderMainTabBar,
} from "./mainTabsShared";

// ── Tab Navigator ─────────────────────────────────────

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  const tabs = useMainTabDefinitions();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true }}
      tabBar={(props) => renderMainTabBar(props, tabs)}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="ListsTab" component={ListsStackNavigator} />
      <Tab.Screen name="MapTab" component={MapStackNavigator} />
      <Tab.Screen name="AssistantTab" component={AssistantStackNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};
