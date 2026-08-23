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
import cancelAllScheduledNotificationsAsync from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import getAllScheduledNotificationsAsync from 'expo-notifications/build/getAllScheduledNotificationsAsync';
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

/** Solo 2 pushes diarios. */
export const PROMO_PUSH_MORNING_ID = 'promo-bancaria-morning-v2';
export const PROMO_PUSH_AFTERNOON_ID = 'promo-bancaria-afternoon-v2';

/** IDs viejos (12 / 15 / 18 / evening) — se cancelan para no disparar de más ni a las 00hs. */
const LEGACY_PROMO_PUSH_IDS = [
  'promo-bancaria-noon',
  'promo-bancaria-afternoon',
  'promo-bancaria-evening',
  'promo-bancaria-morning',
  PROMO_PUSH_MORNING_ID,
  PROMO_PUSH_AFTERNOON_ID,
] as const;

/** 09:00–09:59 y 15:00–15:59 (minuto aleatorio). */
const MORNING_HOUR = 9;
const AFTERNOON_HOUR = 15;

const MIN_PROMOS_PER_PUSH = 2;
const MAX_PROMOS_PER_PUSH = 3;

let channelReady = false;
let responseListenerAttached = false;

function randomMinuteInHour(): number {
  return Math.floor(Math.random() * 60);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

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
    importance: AndroidImportance.DEFAULT,
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

function promoLine(promo: PromoBancariaItem, zoneSetting: string | null): string {
  const medio = (promo.medios[0] ?? promo.banco ?? 'promo').trim() || 'promo';
  if (promo.supers.length === 0) return `promo con ${medio}`;

  const preferredId =
    promo.supers.find((id) => isSupermarketAvailableInZone(id, zoneSetting)) ??
    promo.supers[0];
  const superName = getCatalogEntry(preferredId)?.name ?? preferredId;
  return `${medio} en ${superName}`;
}

/** Copy: 1 promo o lista de 2–3 del mismo push. */
export function buildPromoPushCopy(
  promos: PromoBancariaItem[],
  zoneSetting: string | null
): { title: string; body: string } {
  const list = promos.filter(Boolean);
  if (list.length === 0) {
    return { title: TITLE, body: 'Mirá las promos de hoy en tu zona' };
  }

  if (list.length === 1) {
    return { title: TITLE, body: `Hoy promo con ${promoLine(list[0]!, zoneSetting)}` };
  }

  const lines = list.map((p) => `· ${promoLine(p, zoneSetting)}`);
  return {
    title: TITLE,
    body: `Hoy en tu zona:\n${lines.join('\n')}`,
  };
}

/** Compat: firma vieja de 1 promo. */
export function buildPromoPushCopySingle(
  promo: PromoBancariaItem,
  zoneSetting: string | null
): { title: string; body: string } {
  return buildPromoPushCopy([promo], zoneSetting);
}

/**
 * Pool de la zona (solo región del usuario), prioriza aplicaHoy,
 * mezcla al azar y toma 2–3 (o las que haya).
 */
export function pickRandomPromosForPush(
  manifest: PromosBancariasManifest,
  zoneSetting: string | null,
  count = MAX_PROMOS_PER_PUSH
): PromoBancariaItem[] {
  const ranked = filterPromosForZone(manifest, zoneSetting).promos_bancarias;
  if (ranked.length === 0) return [];

  const todayOnly = ranked.filter((p) => p.aplicaHoy === true);
  const pool = [...(todayOnly.length > 0 ? todayOnly : ranked)];
  shuffleInPlace(pool);

  if (pool.length <= 1) return pool.slice(0, 1);

  const desired =
    pool.length >= MAX_PROMOS_PER_PUSH
      ? MIN_PROMOS_PER_PUSH +
        Math.floor(Math.random() * (MAX_PROMOS_PER_PUSH - MIN_PROMOS_PER_PUSH + 1))
      : pool.length;

  return pool.slice(0, Math.min(desired, count, pool.length));
}

/** @deprecated usar pickRandomPromosForPush */
export function pickTopPromosForPush(
  manifest: PromosBancariasManifest,
  zoneSetting: string | null
): {
  morning: PromoBancariaItem[];
  afternoon: PromoBancariaItem[];
} {
  return {
    morning: pickRandomPromosForPush(manifest, zoneSetting),
    afternoon: pickRandomPromosForPush(manifest, zoneSetting),
  };
}

async function cancelPromoPush(identifier: string): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(identifier);
  } catch {
    // No había schedule con ese id.
  }
}

/** Cancela schedules de promos (viejos y nuevos) para evitar 00hs / spam. */
export async function cancelAllPromoPushNotifications(): Promise<void> {
  await Promise.all(LEGACY_PROMO_PUSH_IDS.map((id) => cancelPromoPush(id)));

  try {
    const scheduled = await getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.map(async (req) => {
        const data = req.content.data as { route?: unknown; slot?: unknown } | undefined;
        const id = req.identifier ?? '';
        const isPromo =
          id.includes('promo-bancaria') ||
          data?.route === ROUTE ||
          (typeof data?.slot === 'string' && data.slot.includes('promo'));
        if (isPromo) {
          await cancelPromoPush(id);
        }
      })
    );
  } catch {
    // Si falla el listado, al menos cancelamos por id conocido.
  }
}

async function scheduleDailyPromoPush(options: {
  identifier: string;
  promos: PromoBancariaItem[];
  zoneSetting: string | null;
  hour: number;
  minute: number;
}): Promise<void> {
  if (options.promos.length === 0) return;
  if (options.hour < 0 || options.hour > 23) return;
  if (options.minute < 0 || options.minute > 59) return;

  const { title, body } = buildPromoPushCopy(options.promos, options.zoneSetting);

  await scheduleNotificationAsync({
    identifier: options.identifier,
    content: {
      title,
      body,
      sound: true,
      priority: AndroidNotificationPriority.DEFAULT,
      vibrate: [0, 220, 120, 220],
      color: '#F0C419',
      data: {
        route: ROUTE,
        promoId: options.promos[0]?.id ?? null,
        promoIds: options.promos.map((p) => p.id),
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

/**
 * Pide permiso, limpia schedules viejos y programa SOLO:
 * 09:xx (mañana) y 15:xx (tarde), con 2–3 promos aleatorias de la zona.
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

    // Limpieza agresiva de leftovers (incluye evening/noon que disparaban de más).
    await cancelAllPromoPushNotifications();

    const morningPromos = pickRandomPromosForPush(options.manifest, options.zone);
    const afternoonPromos = pickRandomPromosForPush(options.manifest, options.zone);

    if (morningPromos.length === 0 && afternoonPromos.length === 0) return;

    if (morningPromos.length > 0) {
      await scheduleDailyPromoPush({
        identifier: PROMO_PUSH_MORNING_ID,
        promos: morningPromos,
        zoneSetting: options.zone,
        hour: MORNING_HOUR,
        minute: randomMinuteInHour(),
      });
    }

    if (afternoonPromos.length > 0) {
      await scheduleDailyPromoPush({
        identifier: PROMO_PUSH_AFTERNOON_ID,
        promos: afternoonPromos,
        zoneSetting: options.zone,
        hour: AFTERNOON_HOUR,
        minute: randomMinuteInHour(),
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

/** Dev: dispara una notificación de prueba en ~8s con promos de la zona. */
export async function schedulePromoPushSmokeTest(
  zoneSetting: string | null
): Promise<boolean> {
  if (!__DEV__) return false;

  try {
    await initPromoPushNotifications();
    const granted = await ensurePromoNotificationPermission();
    if (!granted) return false;

    const { manifest } = await fetchPromosBancariasManifest();
    const promos = pickRandomPromosForPush(manifest, zoneSetting);
    if (promos.length === 0) return false;

    const { title, body } = buildPromoPushCopy(promos, zoneSetting);
    await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: AndroidNotificationPriority.DEFAULT,
        color: '#F0C419',
        data: {
          route: ROUTE,
          promoId: promos[0]?.id,
          promoIds: promos.map((p) => p.id),
          slot: 'smoke-test',
        },
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

/** Solo para tests/admin: limpia TODAS las notificaciones locales programadas. */
export async function purgeAllScheduledLocalNotifications(): Promise<void> {
  try {
    await cancelAllScheduledNotificationsAsync();
  } catch {
    await cancelAllPromoPushNotifications();
  }
}
