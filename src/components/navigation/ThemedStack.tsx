import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import {
  CartListHeader,
  cartListHeaderTitleContainerStyle,
} from '@/components/cart/CartListHeader';
import { useSupermarketTheme } from '@/context/ThemeContext';

const MENU_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: '#121214' },
  headerTintColor: '#F5F5F7',
  headerTitleStyle: { fontWeight: '700', fontSize: 18 },
  contentStyle: { backgroundColor: 'transparent' },
};

export function ThemedStack() {
  const { theme, isDarkBackground } = useSupermarketTheme();

  const cartOptions = {
    headerTitle: () => <CartListHeader />,
    headerTitleAlign: 'left' as const,
    headerTitleContainerStyle: cartListHeaderTitleContainerStyle,
    headerBackTitle: 'Volver',
    headerStyle: {
      backgroundColor: theme.primary,
      borderBottomWidth: 3,
      borderBottomColor: theme.gridBorder,
    } as { backgroundColor: string },
    contentStyle: { backgroundColor: '#FFFFFF' },
  };

  return (
    <>
      <StatusBar style={isDarkBackground ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.textOnPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />

        {/* cast: expo-router omite headerTitleContainerStyle en ExtendedStackNavigationOptions */}
        <Stack.Screen name="cart" options={cartOptions as object} />

        <Stack.Screen name="historial" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="mis-compras" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="crear-lista" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="buscar" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen
          name="buscar-precios"
          options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }}
        />

        <Stack.Screen name="reportes" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="zona" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen
          name="promos-bancarias"
          options={{
            ...MENU_SCREEN_OPTIONS,
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            animationDuration: 320,
            contentStyle: { backgroundColor: '#E8F3EE' },
          }}
        />

        <Stack.Screen name="contacto" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="legales" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="comerciante" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="revision-productos" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />
      </Stack>
    </>
  );
}
