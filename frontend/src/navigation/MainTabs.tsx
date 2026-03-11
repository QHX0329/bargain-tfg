/**
 * Tab Navigator principal de BargAIn.
 *
 * 4 tabs: Inicio, Listas, Mapa, Perfil.
 * Cada tab tiene su propio Stack Navigator anidado.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import type {
  MainTabParamList,
  HomeStackParamList,
  ListsStackParamList,
  MapStackParamList,
  ProfileStackParamList,
} from './types';

// Screens
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ListsScreen } from '@/screens/lists/ListsScreen';
import { ListDetailScreen } from '@/screens/lists/ListDetailScreen';
import { MapScreen } from '@/screens/map/MapScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';

// ── Stack Navigators anidados ────────────────────────

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ListsStack = createNativeStackNavigator<ListsStackParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
  </HomeStack.Navigator>
);

const ListsStackNavigator: React.FC = () => (
  <ListsStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.light.surface },
      headerTintColor: colors.primary[700],
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
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
  </ProfileStack.Navigator>
);

// ── Tab Navigator ────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Mapa de iconos por cada tab */
const TAB_ICONS: Record<keyof MainTabParamList, { focused: string; unfocused: string }> = {
  HomeTab: { focused: 'home', unfocused: 'home-outline' },
  ListsTab: { focused: 'list', unfocused: 'list-outline' },
  MapTab: { focused: 'map', unfocused: 'map-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
};

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.light.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.light.tabBar,
          borderTopColor: colors.light.divider,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="ListsTab"
        component={ListsStackNavigator}
        options={{ tabBarLabel: 'Listas' }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapStackNavigator}
        options={{ tabBarLabel: 'Mapa' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};
