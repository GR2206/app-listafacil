import { useEffect, useRef, useState } from 'react';

import { Animated, StatusBar, StyleSheet, View } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as SplashScreen from 'expo-splash-screen';

import { BannerManagerProvider } from '@/context/BannerManagerContext';
import { HomeBackgroundProvider } from '@/context/HomeBackgroundContext';

import { ThemeProvider } from '@/context/ThemeContext';
import { CartListScaleProvider } from '@/context/CartListScaleContext';

import { ThemedStack } from '@/components/navigation/ThemedStack';

import { PantallaDeBienvenida } from '@/components/splash/PantallaDeBienvenida';

import { useCartStore } from '@/store/cartStore';

import { useMerchantAuthStore } from '@/store/merchantAuthStore';

import { logAppEvent } from '@/services/analytics';
import { subscribeToAppUpdateChecks, type AppUpdatePrompt } from '@/services/appUpdateCheck';
import { prepareAppResources } from '@/services/prepareAppResources';
import { UpdateAvailableModal } from '@/components/update/UpdateAvailableModal';



SplashScreen.preventAutoHideAsync().catch(() => undefined);



const BIENVENIDA_MS = 2500;

const FADE_MS = 500;



export default function RootLayout() {

  const hydrate = useCartStore((s) => s.hydrate);

  const hydrateMerchantAuth = useMerchantAuthStore((s) => s.hydrate);



  const [recursosListos, setRecursosListos] = useState(false);

  const [mostrarApp, setMostrarApp] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState<AppUpdatePrompt | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;



  useEffect(() => {
    void logAppEvent('app_open');
  }, []);



  useEffect(() => {

    let cancelled = false;



    void (async () => {

      try {

        await prepareAppResources(hydrate, hydrateMerchantAuth);

      } catch {

        // Continuar aunque falle algún recurso secundario.

      }



      if (!cancelled) {

        setRecursosListos(true);

      }

    })();



    return () => {

      cancelled = true;

    };

  }, [hydrate, hydrateMerchantAuth]);



  useEffect(() => {

    if (!recursosListos) return;



    void SplashScreen.hideAsync().catch(() => undefined);



    const timer = setTimeout(() => {

      Animated.timing(fadeAnim, {

        toValue: 0,

        duration: FADE_MS,

        useNativeDriver: true,

      }).start(({ finished }) => {

        if (finished) {

          setMostrarApp(true);

        }

      });

    }, BIENVENIDA_MS);



    return () => clearTimeout(timer);

  }, [recursosListos, fadeAnim]);

  useEffect(() => {
    if (!recursosListos) return;

    return subscribeToAppUpdateChecks((prompt) => {
      setUpdatePrompt(prompt);
    });
  }, [recursosListos]);

  return (

    <View style={styles.root}>

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />



      {recursosListos ? (

        <SafeAreaProvider>

          <BannerManagerProvider>
            <HomeBackgroundProvider>
            <ThemeProvider>
              <CartListScaleProvider>
                <ThemedStack />
              </CartListScaleProvider>
            </ThemeProvider>
            </HomeBackgroundProvider>
          </BannerManagerProvider>

        </SafeAreaProvider>

      ) : (

        <View style={styles.bootPlaceholder}>

          <PantallaDeBienvenida />

        </View>

      )}



      {!mostrarApp ? (

        <Animated.View style={[styles.bienvenidaOverlay, { opacity: fadeAnim }]}>

          <PantallaDeBienvenida />

        </Animated.View>

      ) : null}

      {updatePrompt ? (
        <UpdateAvailableModal
          prompt={updatePrompt}
          onDismiss={
            updatePrompt.forceUpdate ? undefined : () => setUpdatePrompt(null)
          }
        />
      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  root: {

    flex: 1,

    backgroundColor: '#000000',

  },

  bootPlaceholder: {

    flex: 1,

    backgroundColor: '#000000',

  },

  bienvenidaOverlay: {

    ...StyleSheet.absoluteFillObject,

    zIndex: 50,

    elevation: 50,

  },

});


