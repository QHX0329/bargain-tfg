/**
 * Tab Navigator principal de BargAIn.
 *
 * 4 tabs: Inicio, Listas, Mapa, Perfil.
 * Cada tab tiene su propio Stack Navigator anidado.
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabBar } from "@/components/ui";
import { colors, sizes } from "@/theme";
import type {
  MainTabParamList,
  HomeStackParamList,
  ListsStackParamList,
  MapStackParamList,
  ProfileStackParamList,
} from "./types";

// Screens
import { HomeScreen } from "@/screens/home/HomeScreen";
import { NotificationScreen } from "@/screens/home/NotificationScreen";
import { ListsScreen } from "@/screens/lists/ListsScreen";
import { ListDetailScreen } from "@/screens/lists/ListDetailScreen";
import { MapScreen } from "@/screens/map/MapScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { ChangePasswordScreen } from "@/screens/profile/ChangePasswordScreen";

// ── Stack Navigators anidados ────────────────────────

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ListsStack = createNativeStackNavigator<ListsStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen
      name="Notifications"
      component={NotificationScreen}
      options={{ headerShown: true, title: "Notificaciones" }}
    />
  </HomeStack.Navigator>
);

const ListsStackNavigator: React.FC = () => (
  <ListsStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
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
      options={({ route }) => ({
        title: route.params.listName,
      })}
    />
  </ListsStack.Navigator>
);

const MapStackNavigator: React.FC = () => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="Map" component={MapScreen} />
  </MapStack.Navigator>
);

const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
    }}
  >
    <ProfileStack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ headerShown: false }}
    />
    <ProfileStack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ title: "Cambiar contraseña" }}
    />
  </ProfileStack.Navigator>
);

// ── Tab Navigator ────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Mapa de iconos por cada tab */
const TAB_ICONS: Record<
  keyof MainTabParamList,
  { focused: string; unfocused: string }
> = {
  HomeTab: { focused: "home", unfocused: "home-outline" },
  ListsTab: { focused: "list", unfocused: "list-outline" },
  MapTab: { focused: "map", unfocused: "map-outline" },
  ProfileTab: { focused: "person", unfocused: "person-outline" },
};

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => {
        const tabs = props.state.routes.map((route) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return {
            key: route.key,
            route: route.name,
            label:
              route.name === "HomeTab"
                ? "Inicio"
                : route.name === "ListsTab"
                  ? "Listas"
                  : route.name === "MapTab"
                    ? "Mapa"
                    : "Perfil",
            icon: (
              <Ionicons
                name={icons.unfocused as any}
                size={sizes.tabIconSize}
                color={colors.textMuted}
              />
            ),
            iconActive: (
              <Ionicons
                name={icons.focused as any}
                size={sizes.tabIconSize}
                color={colors.primary}
              />
            ),
            accessibilityLabel:
              route.name === "HomeTab"
                ? "Inicio"
                : route.name === "ListsTab"
                  ? "Listas"
                  : route.name === "MapTab"
                    ? "Mapa"
                    : "Perfil",
          };
        });

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
                props.navigation.navigate(route.name as never);
              }
            }}
          />
        );
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: "Inicio" }}
      />
      <Tab.Screen
        name="ListsTab"
        component={ListsStackNavigator}
        options={{ tabBarLabel: "Listas" }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapStackNavigator}
        options={{ tabBarLabel: "Mapa" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Perfil" }}
      />
    </Tab.Navigator>
  );
};
