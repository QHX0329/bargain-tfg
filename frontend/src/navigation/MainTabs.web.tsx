/**
 * Tab Navigator principal de BargAIn (variante WEB — react-native-web).
 *
 * Idéntico a MainTabs.tsx en estructura (mismos 5 stacks + BottomTabBar custom),
 * pero usa @react-navigation/bottom-tabs en lugar de material-top-tabs.
 *
 * MOTIVO: material-top-tabs depende de react-native-pager-view, que NO tiene
 * implementación web (solo android/ + ios/), por lo que en navegador el pager no
 * pagina entre tabs (se ve una sola pantalla, "swipe" roto, tabs en blanco).
 * bottom-tabs sí es compatible con react-native-web. Metro resuelve el sufijo
 * .web automáticamente, dejando el comportamiento nativo intacto.
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

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

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  const tabs = useMainTabDefinitions();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
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
