import { Platform } from 'react-native';
import Constants from 'expo-constants';

import {
  APP_UPDATE_FETCH_TIMEOUT_MS,
  APP_UPDATE_GIST_URL,
  DEFAULT_APP_UPDATE_URL,
} from '@/config/appUpdate';

export interface AppUpdatePrompt {
  title: string;
  message: string;
  updateUrl: string;
  forceUpdate: boolean;
  latestVersionCode: number;
  currentVersionCode: number;
}

interface RemoteAppUpdateConfig {
  androidMinVersionCode?: number;
  androidLatestVersionCode?: number;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  updateUrl?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('App update fetch timeout')), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function getCurrentAndroidVersionCode(): number {
  const raw =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode ??
    0;

  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRemoteConfig(raw: unknown): RemoteAppUpdateConfig {
  const source = raw && typeof raw === 'object' ? (raw as RemoteAppUpdateConfig) : {};
  return {
    androidMinVersionCode:
      typeof source.androidMinVersionCode === 'number' ? source.androidMinVersionCode : undefined,
    androidLatestVersionCode:
      typeof source.androidLatestVersionCode === 'number'
        ? source.androidLatestVersionCode
        : undefined,
    forceUpdate: source.forceUpdate === true,
    title: typeof source.title === 'string' ? source.title.trim() : undefined,
    message: typeof source.message === 'string' ? source.message.trim() : undefined,
    updateUrl: typeof source.updateUrl === 'string' ? source.updateUrl.trim() : undefined,
  };
}

export async function checkForAppUpdate(): Promise<AppUpdatePrompt | null> {
  if (Platform.OS !== 'android') return null;

  const currentVersionCode = getCurrentAndroidVersionCode();
  if (currentVersionCode <= 0) return null;

  try {
    const response = await withTimeout(fetch(APP_UPDATE_GIST_URL), APP_UPDATE_FETCH_TIMEOUT_MS);
    if (!response.ok) return null;

    const remote = normalizeRemoteConfig(await response.json());
    const latestVersionCode = remote.androidLatestVersionCode ?? remote.androidMinVersionCode;
    if (!latestVersionCode || latestVersionCode <= currentVersionCode) return null;

    const belowMinimum =
      typeof remote.androidMinVersionCode === 'number' &&
      currentVersionCode < remote.androidMinVersionCode;

    return {
      title: remote.title ?? 'Actualización disponible',
      message:
        remote.message ??
        'Hay una versión nueva de Lista Fácil. Actualizá para probar las últimas mejoras.',
      updateUrl: remote.updateUrl || DEFAULT_APP_UPDATE_URL,
      forceUpdate: remote.forceUpdate === true || belowMinimum,
      latestVersionCode,
      currentVersionCode,
    };
  } catch {
    return null;
  }
}
