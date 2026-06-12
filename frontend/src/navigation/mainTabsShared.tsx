/**
 * Piezas compartidas del Tab Navigator principal de BarGAIN.
 *
 * Tanto la variante nativa (MainTabs.tsx → material-top-tabs, con swipe lado-a-lado)
 * como la variante web (MainTabs.web.tsx → bottom-tabs, compatible con react-native-web)
 * consumen estos stacks, las definiciones de tab y el renderizador de la BottomTabBar.
 *
 * MOTIVO: react-native-pager-view (que usa material-top-tabs) NO tiene implementación
 * web, por lo que en navegador el pager no pagina entre tabs. La variante web usa
 * @react-navigation/bottom-tabs, que sí funciona en react-native-web.
 */

import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabBar, type TabDefinition } from "@/components/ui";
import { colors, sizes } from "@/theme";
import type {
  MainTabParamList,
  HomeStackParamList,
  ListsStackParamList,
  MapStackParamList,
  AssistantStackParamList,
  ProfileStackParamList,
} from "./types";

// ── Screens ──────────────────────────────────────────

// Home
import { HomeScreen } from "@/screens/home/HomeScreen";
import { ProductsCatalogScreen } from "@/screens/home/ProductsCatalogScreen";
import { NotificationScreen } from "@/screens/home/NotificationScreen";
import { PriceAlertsScreen } from "@/screens/home/PriceAlertsScreen";
import { PriceCompareScreen } from "@/screens/home/PriceCompareScreen";
import { FavoriteStoresScreen } from "@/screens/home/FavoriteStoresScreen";
import { ProductProposalScreen } from "@/screens/home/ProductProposalScreen";

// Lists
import { ListsScreen } from "@/screens/lists/ListsScreen";
import { ListDetailScreen } from "@/screens/lists/ListDetailScreen";
import { TemplatesScreen } from "@/screens/lists/TemplatesScreen";
import { RouteScreen } from "@/screens/lists/RouteScreen";
import { OCRScreen } from "@/screens/lists/OCRScreen";

// Map
import { MapScreen } from "@/screens/map/MapScreen";
import { StoreProfileScreen } from "@/screens/map/StoreProfileScreen";

// Assistant
import { AssistantScreen } from "@/screens/assistant/AssistantScreen";

// Profile
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { EditProfileScreen } from "@/screens/profile/EditProfileScreen";
import { ChangePasswordScreen } from "@/screens/profile/ChangePasswordScreen";
import { OptimizerConfigScreen } from "@/screens/profile/OptimizerConfigScreen";

// ── Stack Navigators anidados ────────────────────────

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ListsStack = createNativeStackNavigator<ListsStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const AssistantStack = createNativeStackNavigator<AssistantStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Ancho en px desde el borde para activar el gesto lateral de volver.
const STACK_BACK_SWIPE_EDGE_WIDTH = 18;

export const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureResponseDistance: { start: STACK_BACK_SWIPE_EDGE_WIDTH },
    }}
  >
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen
      name="ProductsCatalog"
      component={ProductsCatalogScreen}
      options={{ headerShown: true, title: "Productos" }}
    />
    <HomeStack.Screen
      name="Notifications"
      component={NotificationScreen}
      options={{ headerShown: true, title: "Notificaciones" }}
    />
    <HomeStack.Screen
      name="PriceAlerts"
      component={PriceAlertsScreen}
      options={{ headerShown: true, title: "Alertas de precio" }}
    />
    <HomeStack.Screen
      name="FavoriteStores"
      component={FavoriteStoresScreen}
      options={{ headerShown: true, title: "Mis favoritos" }}
    />
    <HomeStack.Screen
      name="PriceCompare"
      component={PriceCompareScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="ProductProposal"
      component={ProductProposalScreen}
      options={{ headerShown: false }}
    />
  </HomeStack.Navigator>
);

export const ListsStackNavigator: React.FC = () => (
  <ListsStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      animation: "slide_from_right",
      gestureResponseDistance: { start: STACK_BACK_SWIPE_EDGE_WIDTH },
    }}
  >
    <ListsStack.Screen
      name="Lists"
      component={ListsScreen}
      options={{ headerShown: false }}
    />
    <ListsStack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={({ route }) => ({ title: route.params.listName })}
    />
    <ListsStack.Screen
      name="Templates"
      component={TemplatesScreen}
      options={{ headerShown: false }}
    />
    <ListsStack.Screen
      name="ProductsCatalog"
      component={ProductsCatalogScreen}
      options={{ headerShown: true, title: "Productos" }}
    />
    <ListsStack.Screen
      name="PriceCompare"
      component={PriceCompareScreen}
      options={{ headerShown: false }}
    />
    <ListsStack.Screen
      name="Route"
      component={RouteScreen}
      options={{ headerShown: false }}
    />
    <ListsStack.Screen
      name="OCR"
      component={OCRScreen}
      options={{ headerShown: false }}
    />
  </ListsStack.Navigator>
);

export const MapStackNavigator: React.FC = () => (
  <MapStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureResponseDistance: { start: STACK_BACK_SWIPE_EDGE_WIDTH },
    }}
  >
    <MapStack.Screen name="Map" component={MapScreen} />
    <MapStack.Screen
      name="StoreProfile"
      component={StoreProfileScreen}
      options={{ headerShown: true, title: "Tienda" }}
    />
  </MapStack.Navigator>
);

export const AssistantStackNavigator: React.FC = () => (
  <AssistantStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureResponseDistance: { start: STACK_BACK_SWIPE_EDGE_WIDTH },
    }}
  >
    <AssistantStack.Screen name="Assistant" component={AssistantScreen} />
  </AssistantStack.Navigator>
);

export const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      animation: "slide_from_right",
      gestureResponseDistance: { start: STACK_BACK_SWIPE_EDGE_WIDTH },
    }}
  >
    <ProfileStack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ headerShown: false }}
    />
    <ProfileStack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ title: "Modificar información" }}
    />
    <ProfileStack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ title: "Cambiar contraseña" }}
    />
    <ProfileStack.Screen
      name="OptimizerConfig"
      component={OptimizerConfigScreen}
      options={{ headerShown: false }}
    />
  </ProfileStack.Navigator>
);

// ── Tab icons ────────────────────────────────────────

export const TAB_ICONS: Record<
  keyof MainTabParamList,
  { focused: string; unfocused: string; label: string }
> = {
  HomeTab: { focused: "home", unfocused: "home-outline", label: "Inicio" },
  ListsTab: { focused: "list", unfocused: "list-outline", label: "Listas" },
  MapTab: { focused: "map", unfocused: "map-outline", label: "Mapa" },
  AssistantTab: {
    focused: "sparkles",
    unfocused: "sparkles-outline",
    label: "Asistente",
  },
  ProfileTab: {
    focused: "person",
    unfocused: "person-outline",
    label: "Perfil",
  },
};

/** Construye las definiciones de tab (icono + label) memoizadas. */
export function useMainTabDefinitions(): TabDefinition[] {
  return useMemo(
    () =>
      (Object.keys(TAB_ICONS) as (keyof MainTabParamList)[]).map((key) => {
        const info = TAB_ICONS[key];
        return {
          key,
          route: key,
          label: info.label,
          icon: (
            <Ionicons
              name={info.unfocused as any}
              size={sizes.tabIconSize}
              color={colors.textMuted}
            />
          ),
          iconActive: (
            <Ionicons
              name={info.focused as any}
              size={sizes.tabIconSize}
              color={colors.primary}
            />
          ),
          accessibilityLabel: info.label,
        };
      }),
    [],
  );
}

/**
 * Renderiza la BottomTabBar custom a partir de los props del navegador.
 * Compatible con material-top-tabs y bottom-tabs (ambos exponen
 * `state.index`, `state.routes`, `navigation.emit` y `navigation.navigate`).
 */
export function renderMainTabBar(
  props: {
    state: { index: number; routes: { key: string; name: string }[] };
    navigation: {
      emit: (event: {
        type: "tabPress";
        target: string;
        canPreventDefault: true;
      }) => { defaultPrevented: boolean };
      navigate: (name: string) => void;
    };
  },
  tabs: TabDefinition[],
): React.ReactElement {
  return (
    <BottomTabBar
      tabs={tabs}
      activeIndex={props.state.index}
      onTabPress={(index) => {
        const route = props.state.routes[index];
        const event = props.navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
          props.navigation.navigate(route.name);
        }
      }}
    />
  );
}
