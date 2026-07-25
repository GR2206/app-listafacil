import { Platform } from 'react-native';
import { router } from 'expo-router';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications/build/NotificationChannelManager.types';
import {
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  getLastNotificationResponse,
} from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
  type NotificationResponse,
} from 'expo-notifications/build/Notifications.types';
import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';

import { getCatalogEntry } from '@/data/supermarketCatalog';
import {
  fetchPromosBancariasManifest,
  filterPromosForZone,
} from '@/services/promosBancariasManager';
import type { PromoBancariaItem, PromosBancariasManifest } from '@/types/promosBancarias';
import { isSupermarketAvailableInZone } from '@/utils/supermarketCoverage';

const CHANNEL_ID = 'promos-bancarias';
const TITLE = 'Lista Fácil';
const ROUTE = '/promos-bancarias';

export const PROMO_PUSH_NOON_ID = 'promo-bancaria-noon';
export const PROMO_PUSH_EVENING_ID = 'promo-bancaria-evening';

const NOON_HOUR = 12;
const NOON_MINUTE = 0;
const EVENING_HOUR = 18;
const EVENING_MINUTE = 0;

let channelReady = false;
let responseListenerAttached = false;

function ensureNotificationHandler(): void {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Promos bancarias',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 220, 120, 220],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
    showBadge: false,
  });
}

export async function initPromoPushNotifications(): Promise<void> {
  if (channelReady) return;

  try {
    ensureNotificationHandler();
    await ensureAndroidChannel();
    channelReady = true;
  } catch {
    // Expo Go / emulador sin soporte nativo: no bloquear arranque.
  }
}

export async function ensurePromoNotificationPermission(): Promise<boolean> {
  try {
    const current = await getPermissionsAsync();
    if (current.granted) return true;
    const requested = await requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Copy heads-up: "Hoy promo con MODO en Carrefour". */
export function buildPromoPushCopy(
  promo: PromoBancariaItem,
  zoneSetting: string | null
): { title: string; body: string } {
  const medio = (promo.medios[0] ?? promo.banco ?? 'promo').trim() || 'promo';

  if (promo.supers.length === 0) {
    return { title: TITLE, body: `Hoy promo con ${medio}` };
  }

  const preferredId =
    promo.supers.find((id) => isSupermarketAvailableInZone(id, zoneSetting)) ??
    promo.supers[0];
  const superName = getCatalogEntry(preferredId)?.name ?? preferredId;

  return { title: TITLE, body: `Hoy promo con ${medio} en ${superName}` };
}

/** Top 1 y 2 de la zona; prioriza las que aplican hoy. */
export function pickTopPromosForPush(
  manifest: PromosBancariasManifest,
  zoneSetting: string | null
): { noon: PromoBancariaItem | null; evening: PromoBancariaItem | null } {
  const ranked = filterPromosForZone(manifest, zoneSetting).promos_bancarias;
  const todayOnly = ranked.filter((p) => p.aplicaHoy === true);
  const pool = todayOnly.length > 0 ? todayOnly : ranked;

  return {
    noon: pool[0] ?? null,
    evening: pool[1] ?? null,
  };
}

async function cancelPromoPush(identifier: string): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(identifier);
  } catch {
    // No había schedule con ese id.
  }
}

async function scheduleDailyPromoPush(options: {
  identifier: string;
  promo: PromoBancariaItem;
  zoneSetting: string | null;
  hour: number;
  minute: number;
}): Promise<void> {
  const { title, body } = buildPromoPushCopy(options.promo, options.zoneSetting);

  await scheduleNotificationAsync({
    identifier: options.identifier,
    content: {
      title,
      body,
      sound: true,
      priority: AndroidNotificationPriority.MAX,
      vibrate: [0, 220, 120, 220],
      // Acento Android (tinte del ícono pequeño + nombre de la app).
      color: '#F0C419',
      data: {
        route: ROUTE,
        promoId: options.promo.id,
        slot: options.identifier,
      },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: options.hour,
      minute: options.minute,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export async function cancelAllPromoPushNotifications(): Promise<void> {
  await Promise.all([
    cancelPromoPush(PROMO_PUSH_NOON_ID),
    cancelPromoPush(PROMO_PUSH_EVENING_ID),
  ]);
}

/**
 * Pide permiso, cancela schedules previos y programa 12:00 (1ª) y 18:00 (2ª).
 */
export async function syncPromoPushNotifications(options: {
  zone: string | null;
  manifest: PromosBancariasManifest;
}): Promise<void> {
  try {
    await initPromoPushNotifications();

    const granted = await ensurePromoNotificationPermission();
    if (!granted) {
      await cancelAllPromoPushNotifications();
      return;
    }

    const { noon, evening } = pickTopPromosForPush(options.manifest, options.zone);
    await cancelAllPromoPushNotifications();

    if (!noon) return;

    await scheduleDailyPromoPush({
      identifier: PROMO_PUSH_NOON_ID,
      promo: noon,
      zoneSetting: options.zone,
      hour: NOON_HOUR,
      minute: NOON_MINUTE,
    });

    if (evening) {
      await scheduleDailyPromoPush({
        identifier: PROMO_PUSH_EVENING_ID,
        promo: evening,
        zoneSetting: options.zone,
        hour: EVENING_HOUR,
        minute: EVENING_MINUTE,
      });
    }
  } catch {
    // Silencioso: notificaciones no deben tumbar el warm.
  }
}

/** Fetch remoto + sync para la zona actual (arranque / cambio de zona). */
export async function syncPromoPushForZone(zoneSetting: string | null): Promise<void> {
  try {
    const { manifest } = await fetchPromosBancariasManifest();
    await syncPromoPushNotifications({ zone: zoneSetting, manifest });
  } catch {
    // ignore
  }
}

function navigateFromPromoResponse(response: NotificationResponse): void {
  const data = response.notification.request.content.data as
    | { route?: unknown; promoId?: unknown }
    | undefined;
  const route = typeof data?.route === 'string' ? data.route : null;
  const promoId = typeof data?.promoId === 'string' ? data.promoId : null;

  if (route === ROUTE || promoId) {
    try {
      router.push(ROUTE);
    } catch {
      // Router aún no montado.
    }
  }
}

/** Listener de tap (una sola vez). Abre Hoy en mi bolsillo. */
export function registerPromoPushResponseListener(): () => void {
  if (responseListenerAttached) {
    return () => undefined;
  }
  responseListenerAttached = true;

  const handle = (response: NotificationResponse) => {
    navigateFromPromoResponse(response);
    clearLastNotificationResponse();
  };

  const subscription = addNotificationResponseReceivedListener(handle);

  const last = getLastNotificationResponse();
  if (last) {
    handle(last);
  }

  return () => {
    subscription.remove();
    responseListenerAttached = false;
  };
}

/** Dev: dispara una notificación de prueba en ~8s con la 1ª promo de la zona. */
export async function schedulePromoPushSmokeTest(
  zoneSetting: string | null
): Promise<boolean> {
  if (!__DEV__) return false;

  try {
    await initPromoPushNotifications();
    const granted = await ensurePromoNotificationPermission();
    if (!granted) return false;

    const { manifest } = await fetchPromosBancariasManifest();
    const { noon } = pickTopPromosForPush(manifest, zoneSetting);
    if (!noon) return false;

    const { title, body } = buildPromoPushCopy(noon, zoneSetting);
    await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: AndroidNotificationPriority.MAX,
        color: '#F0C419',
        data: { route: ROUTE, promoId: noon.id, slot: 'smoke-test' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 8,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}
