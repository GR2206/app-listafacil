import { Alert, Linking } from 'react-native';

export function openAppSettings(): void {
  void Linking.openSettings().catch(() => {
    Alert.alert(
      'Permisos del sistema',
      'Abrí Ajustes en tu dispositivo, buscá Lista Fácil y activá los permisos necesarios.'
    );
  });
}

export async function openExternalUrl(
  url: string,
  options?: { failTitle?: string; failMessage?: string }
): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        options?.failTitle ?? 'No se pudo abrir el enlace',
        options?.failMessage ?? 'Verificá que tengas una app compatible instalada.'
      );
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      options?.failTitle ?? 'No se pudo abrir el enlace',
      options?.failMessage ?? 'Verificá que tengas una app compatible instalada.'
    );
    return false;
  }
}

export async function openExternalUrlDirect(
  url: string,
  options?: { failTitle?: string; failMessage?: string }
): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      options?.failTitle ?? 'No se pudo abrir el enlace',
      options?.failMessage ?? 'Verificá que tengas una app compatible instalada.'
    );
    return false;
  }
}
