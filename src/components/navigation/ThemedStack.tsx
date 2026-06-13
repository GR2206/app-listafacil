import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import {
  CartListHeader,
  cartListHeaderTitleContainerStyle,
} from '@/components/cart/CartListHeader';
import { useSupermarketTheme } from '@/context/ThemeContext';



const MENU_SCREEN_OPTIONS = {

  headerShown: true,

  headerStyle: { backgroundColor: '#121214' },

  headerTintColor: '#F5F5F7',

  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },

  contentStyle: { backgroundColor: 'transparent' },

};



export function ThemedStack() {

  const { theme, isDarkBackground } = useSupermarketTheme();



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

        <Stack.Screen

          name="cart"

          options={{

            headerTitle: () => <CartListHeader />,

            headerTitleAlign: 'left',

            headerTitleContainerStyle: cartListHeaderTitleContainerStyle,

            headerBackTitle: 'Volver',

            headerStyle: {

              backgroundColor: theme.primary,

              borderBottomWidth: 3,

              borderBottomColor: theme.gridBorder,

            },

            contentStyle: { backgroundColor: '#FFFFFF' },

          }}

        />

        <Stack.Screen name="historial" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="mis-compras" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="reportes" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="zona" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="contacto" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="legales" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="comerciante" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

        <Stack.Screen name="revision-productos" options={{ ...MENU_SCREEN_OPTIONS, headerShown: false }} />

      </Stack>

    </>

  );

}


