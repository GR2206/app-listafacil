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

function sanitizeEventToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function supermarketEventSuffix(supermarketId: string): string {
  const suffix = sanitizeEventToken(supermarketId.replace(/-/g, '_'));
  return suffix || 'desconocido';
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

/** Cada súper dispara su propio evento: click_super_coto, click_super_carrefour, etc. */
export async function logSupermarketClick(
  supermarketId: string,
  supermercadoNombre: string,
  origen: 'grid' | 'super_taquillero' | 'oferta_dia' | 'product_search' = 'grid'
): Promise<void> {
  const suffix = supermarketEventSuffix(supermarketId);

  await logAppEvent(`click_super_${suffix}`, {
    supermercado_id: supermarketId,
    supermercado_nombre: supermercadoNombre,
    origen,
  });

  // Dashboard global (todas las regiones) — Metricas_diarias.uniqueSuperEntries
  try {
    const { trackSupermarketEntry } = await import('@/services/merchantAnalytics');
    void trackSupermarketEntry(supermarketId);
  } catch {
    // no bloquear navegación
  }
}

export function logBannerTopClick(): Promise<void> {
  return logAppEvent('click_banner_top', {
    banner_id: 'banner_top',
    banner_ubicacion: 'pagina_principal',
  });
}

export function logBannerListaClick(): Promise<void> {
  return logAppEvent('click_banner_lista', {
    banner_id: 'banner_lista',
    banner_ubicacion: 'lista_compras',
  });
}

export function logScanSuccess(nombreProducto: string, precioDetectado: number): Promise<void> {
  return logAppEvent('escaneo_exitoso', {
    nombre_producto: nombreProducto.slice(0, 100),
    precio_detectado: precioDetectado,
  });
}

/** Cada recuadro de ahorro/mapa dispara su evento: click_mapa_coto, click_mapa_la_reina, etc. */
export function logSupermarketMapsClick(
  supermarketId: string,
  supermarketNombre: string
): Promise<void> {
  const suffix = supermarketEventSuffix(supermarketId);

  return logAppEvent(`click_mapa_${suffix}`, {
    supermercado_id: supermarketId,
    supermercado_nombre: supermarketNombre,
    origen: 'panel_ahorro',
  });
}
