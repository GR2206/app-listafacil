import { Platform, ToastAndroid } from 'react-native';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications/build/NotificationChannelManager.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';

import { useInstagramClipboardNoticeStore } from '@/store/instagramClipboardNoticeStore';
import { triggerHaptic } from '@/utils/triggerHaptic';

const CHANNEL_ID = 'instagram-banner';
const NOTICE_TITLE = '¡Mensaje copiado al portapapeles!';
const NOTICE_BODY = 'Ahora pegalo en el chat de Instagram para enviarlo';
const HEADS_UP_VISIBLE_MS = 1400;
const SYSTEM_NOTICE_DELAY_SECONDS = 1;

let notificationsReady = false;

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
    name: 'Avisos de Instagram',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 220, 120, 220],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
    showBadge: false,
  });
}

async function ensureNotificationPermission(): Promise<boolean> {
  const current = await getPermissionsAsync();
  if (current.granted) return true;

  const requested = await requestPermissionsAsync();
  return requested.granted;
}

export function getInstagramClipboardNoticeCopy(): { title: string; body: string } {
  return { title: NOTICE_TITLE, body: NOTICE_BODY };
}

export async function initInstagramClipboardNotifications(): Promise<void> {
  if (notificationsReady) return;

  try {
    ensureNotificationHandler();
    await ensureAndroidChannel();
    notificationsReady = true;
  } catch {
    // En Expo Go las notificaciones pueden fallar sin bloquear el flujo visual.
  }
}

export function showInstagramClipboardHeadsUp(
  durationMs = HEADS_UP_VISIBLE_MS
): Promise<void> {
  const { title, body } = getInstagramClipboardNoticeCopy();
  const store = useInstagramClipboardNoticeStore.getState();

  triggerHaptic('success');
  store.show(title, body);

  return new Promise((resolve) => {
    setTimeout(() => {
      store.hide();
      resolve();
    }, durationMs);
  });
}

export function showAndroidClipboardToast(): void {
  if (Platform.OS !== 'android') return;

  ToastAndroid.showWithGravity(
    `${NOTICE_TITLE} ${NOTICE_BODY}`,
    ToastAndroid.LONG,
    ToastAndroid.TOP
  );
}

export async function notifyInstagramMessageCopied(): Promise<boolean> {
  try {
    await initInstagramClipboardNotifications();

    const granted = await ensureNotificationPermission();
    if (!granted) return false;

    await scheduleNotificationAsync({
      content: {
        title: NOTICE_TITLE,
        body: NOTICE_BODY,
        sound: true,
        priority: AndroidNotificationPriority.MAX,
        vibrate: [0, 220, 120, 220],
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: SYSTEM_NOTICE_DELAY_SECONDS,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });

    return true;
  } catch {
    return false;
  }
}

export async function presentInstagramClipboardNotice(): Promise<void> {
  await showInstagramClipboardHeadsUp();
  showAndroidClipboardToast();
  void notifyInstagramMessageCopied();
}
