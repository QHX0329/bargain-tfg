/**
 * Entry point de la aplicación BarGAIN.
 *
 * Configura el NavigationContainer y renderiza el RootNavigator.
 * Llama a authStore.hydrate() en el montaje para restaurar la sesión
 * desde SecureStore antes de renderizar la navegación (evita el auth flicker).
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';

import { RootNavigator } from '@/navigation';
import { linking } from '@/navigation/linking';
import { useAuthStore } from '@/store/authStore';
import { registerLockscreenChecklistActionHandler } from '@/services/lockscreenChecklistService';
import { colors } from '@/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  /** Indica si la sesión ha sido restaurada desde SecureStore */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate().finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const subscription = registerLockscreenChecklistActionHandler();
    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
