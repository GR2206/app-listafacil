import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

import {
  APP_UPDATE_FETCH_TIMEOUT_MS,
  APP_UPDATE_GIST_URL,
  DEFAULT_APP_UPDATE_URL,
} from '@/config/appUpdate';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

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

export function getCurrentAndroidVersionCode(): number {
  const candidates = [
    Constants.nativeBuildVersion,
    Constants.expoConfig?.android?.versionCode,
    (Constants.expoConfig?.extra as { androidVersionCode?: number } | undefined)
      ?.androidVersionCode,
  ];

  for (const candidate of candidates) {
    const parsed = Number.parseInt(String(candidate ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
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
    const json = await fetchRemoteJson(
      APP_UPDATE_GIST_URL,
      APP_UPDATE_FETCH_TIMEOUT_MS,
      'App update'
    );
    const remote = normalizeRemoteConfig(json);
    const latestVersionCode = remote.androidLatestVersionCode ?? remote.androidMinVersionCode;

    if (!latestVersionCode || latestVersionCode <= currentVersionCode) {
      return null;
    }

    const belowMinimum =
      typeof remote.androidMinVersionCode === 'number' &&
      currentVersionCode < remote.androidMinVersionCode;

    const candidateUrl = remote.updateUrl?.trim() ?? '';
    const acceptsUpdateUrl =
      candidateUrl.startsWith('market://') || isValidHttpUrl(candidateUrl);
    const updateUrl = acceptsUpdateUrl ? candidateUrl : DEFAULT_APP_UPDATE_URL;

    return {
      title: remote.title ?? 'Actualización disponible',
      message:
        remote.message ??
        'Hay una versión nueva de Lista Fácil. Actualizá para probar las últimas mejoras.',
      updateUrl,
      forceUpdate: remote.forceUpdate === true || belowMinimum,
      latestVersionCode,
      currentVersionCode,
    };
  } catch {
    return null;
  }
}

export function subscribeToAppUpdateChecks(
  onPrompt: (prompt: AppUpdatePrompt | null) => void
): () => void {
  let active = true;

  const runCheck = () => {
    void checkForAppUpdate().then((prompt) => {
      if (active && prompt) onPrompt(prompt);
    });
  };

  runCheck();

  const onAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') runCheck();
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);

  return () => {
    active = false;
    subscription.remove();
  };
}
