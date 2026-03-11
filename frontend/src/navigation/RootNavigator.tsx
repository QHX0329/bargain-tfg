/**
 * Navegador raíz de la aplicación BargAIn.
 *
 * Gestiona la bifurcación entre:
 * - Auth Stack (Login/Register) → si no hay token
 * - Main Tabs (Home/Lists/Map/Profile) → si hay token
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList, AuthStackParamList } from './types';
import { MainTabs } from './MainTabs';

// Auth Screens
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

/** Stack de autenticación (login + registro) */
const AuthNavigator: React.FC = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

/**
 * Navegador raíz que decide qué flujo mostrar
 * basándose en el estado de autenticación.
 */
export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};
