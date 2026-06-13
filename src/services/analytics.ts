import { Platform } from 'react-native';

type EventParams = Record<string, string | number | boolean | undefined>;

type NativeAnalytics = {
  logEvent: (name: string, params?: EventParams) => Promise<void>;
};

let nativeAnalytics: NativeAnalytics | null = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyticsFactory = require('@react-native-firebase/analytics').default;
    nativeAnalytics = analyticsFactory();
  } catch {
    // Módulo nativo no disponible (p. ej. Expo Go).
  }
}

let webAnalytics: import('firebase/analytics').Analytics | null = null;
let webAnalyticsInit: Promise<import('firebase/analytics').Analytics | null> | null = null;

async function ensureWebAnalytics(): Promise<import('firebase/analytics').Analytics | null> {
  if (Platform.OS !== 'web') return null;
  if (webAnalytics) return webAnalytics;
  if (webAnalyticsInit) return webAnalyticsInit;

  webAnalyticsInit = (async () => {
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      const { firebaseApp } = await import('../../firebaseConfig.js');

      if (!(await isSupported())) return null;

      webAnalytics = getAnalytics(firebaseApp);
      return webAnalytics;
    } catch {
      return null;
    }
  })();

  return webAnalyticsInit;
}

export async function logAppEvent(eventName: string, params?: object): Promise<void> {
  const eventParams = params as EventParams | undefined;

  try {
    if (nativeAnalytics) {
      await nativeAnalytics.logEvent(eventName, eventParams);
      return;
    }

    if (Platform.OS === 'web') {
      const analytics = await ensureWebAnalytics();
      if (!analytics) return;

      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, eventName, eventParams);
    }
  } catch {
    // Analytics no debe interrumpir el flujo de la app.
  }
}

export function logSupermarketClick(supermercadoNombre: string): Promise<void> {
  return logAppEvent('click_supermercado', { supermercado_nombre: supermercadoNombre });
}

export function logBannerOfferClick(bannerId: string): Promise<void> {
  return logAppEvent('click_banner_oferta', { banner_id: bannerId });
}

export function logScanSuccess(nombreProducto: string, precioDetectado: number): Promise<void> {
  return logAppEvent('escaneo_exitoso', {
    nombre_producto: nombreProducto.slice(0, 100),
    precio_detectado: precioDetectado,
  });
}

export function logSupermarketMapsClick(
  supermarketId: string,
  supermarketNombre: string
): Promise<void> {
  return logAppEvent('click_mapa_supermercado', {
    supermercado_id: supermarketId,
    supermercado_nombre: supermarketNombre,
  });
}
