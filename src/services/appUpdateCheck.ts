import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

import {
  APP_UPDATE_FETCH_TIMEOUT_MS,
  APP_UPDATE_GIST_URL,
} from '@/config/appUpdate';
import { getStoreUpdateUrl, PLAY_STORE_URL } from '@/config/appLinks';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';

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

function parsePositiveInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/**
 * versionCode real del APK/AAB instalado.
 * Prioriza expo-application (nativo); Constants a veces falla o trae basura en sideload.
 */
export function getCurrentAndroidVersionCode(): number {
  const candidates = [
    Application.nativeBuildVersion,
    Constants.nativeBuildVersion,
    Constants.expoConfig?.android?.versionCode,
    (Constants.expoConfig?.extra as { androidVersionCode?: number } | undefined)
      ?.androidVersionCode,
  ];

  for (const candidate of candidates) {
    const parsed = parsePositiveInt(candidate);
    if (parsed > 0) return parsed;
  }

  return 0;
}

function normalizeRemoteConfig(raw: unknown): RemoteAppUpdateConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    androidMinVersionCode: parsePositiveInt(source.androidMinVersionCode) || undefined,
    androidLatestVersionCode: parsePositiveInt(source.androidLatestVersionCode) || undefined,
    forceUpdate: source.forceUpdate === true,
    title: typeof source.title === 'string' ? source.title.trim() : undefined,
    message: typeof source.message === 'string' ? source.message.trim() : undefined,
    updateUrl: typeof source.updateUrl === 'string' ? source.updateUrl.trim() : undefined,
  };
}

/** Ignora artefactos EAS / APK sueltos: el botón Actualizar va a la tienda. */
function resolveUpdateStoreUrl(remoteUrl?: string): string {
  const storeDefault = getStoreUpdateUrl();
  const candidate = remoteUrl?.trim() ?? '';
  if (!candidate) return storeDefault;

  const lower = candidate.toLowerCase();
  // Sideload / Expo → nunca; forzar tienda.
  if (
    lower.includes('expo.dev/artifacts') ||
    lower.includes('expo.dev/') ||
    lower.endsWith('.aab') ||
    lower.endsWith('.apk')
  ) {
    return storeDefault;
  }

  if (Platform.OS === 'android') {
    if (
      candidate.startsWith('market://') ||
      lower.includes('play.google.com/store') ||
      lower.includes('play.app.goo.gl')
    ) {
      return candidate;
    }
    return PLAY_STORE_URL;
  }

  if (Platform.OS === 'ios') {
    if (lower.includes('apps.apple.com') || lower.includes('itunes.apple.com')) {
      return candidate;
    }
    return storeDefault;
  }

  return storeDefault;
}

export async function checkForAppUpdate(): Promise<AppUpdatePrompt | null> {
  if (Platform.OS !== 'android') return null;

  const currentVersionCode = getCurrentAndroidVersionCode();
  if (currentVersionCode <= 0) {
    console.warn('[AppUpdate] No se pudo leer versionCode instalado — skip');
    return null;
  }

  try {
    const json = await fetchRemoteJson(
      APP_UPDATE_GIST_URL,
      APP_UPDATE_FETCH_TIMEOUT_MS,
      'App update'
    );
    const remote = normalizeRemoteConfig(json);
    const latestVersionCode = remote.androidLatestVersionCode ?? remote.androidMinVersionCode;

    if (!latestVersionCode) {
      console.warn('[AppUpdate] Gist sin androidLatestVersionCode');
      return null;
    }

    if (latestVersionCode <= currentVersionCode) {
      // App al día (o Gist desactualizado respecto de la build instalada).
      return null;
    }

    const belowMinimum =
      typeof remote.androidMinVersionCode === 'number' &&
      currentVersionCode < remote.androidMinVersionCode;

    return {
      title: remote.title ?? 'Actualización disponible',
      message:
        remote.message ??
        'Hay una versión nueva de Lista Fácil. Actualizá para probar las últimas mejoras.',
      updateUrl: resolveUpdateStoreUrl(remote.updateUrl),
      forceUpdate: remote.forceUpdate === true || belowMinimum,
      latestVersionCode,
      currentVersionCode,
    };
  } catch (error) {
    console.warn('[AppUpdate] Falló el chequeo remoto:', error);
    return null;
  }
}

export function subscribeToAppUpdateChecks(
  onPrompt: (prompt: AppUpdatePrompt | null) => void
): () => void {
  let active = true;

  const runCheck = () => {
    void checkForAppUpdate().then((prompt) => {
      if (!active) return;
      if (prompt) onPrompt(prompt);
    });
  };

  // Primera pasada al montar + cada vez que la app vuelve al frente.
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
