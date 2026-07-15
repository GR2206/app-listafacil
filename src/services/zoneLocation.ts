import { Alert } from 'react-native';
import * as Location from 'expo-location';

import { resolveZoneFromCoordinates, type AppZone } from '@/config/zones';
import { openAppSettings } from '@/utils/safeLinking';

export type ZoneDetectFailureReason =
  | 'services_disabled'
  | 'denied'
  | 'blocked'
  | 'outside'
  | 'error';

export type ZoneDetectResult =
  | { ok: true; zone: AppZone }
  | { ok: false; reason: ZoneDetectFailureReason; message: string };

export async function detectZoneFromDevice(): Promise<ZoneDetectResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        ok: false,
        reason: 'services_disabled',
        message: 'Activá la ubicación (GPS) en los ajustes de tu dispositivo e intentá de nuevo.',
      };
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      if (permission.canAskAgain === false) {
        return {
          ok: false,
          reason: 'blocked',
          message:
            'Lista Fácil no puede usar tu ubicación. Activá el permiso en Ajustes para detectar tu zona.',
        };
      }

      return {
        ok: false,
        reason: 'denied',
        message: 'Necesitamos permiso de ubicación solo para sugerirte la zona más cercana.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const zone = resolveZoneFromCoordinates(
      position.coords.latitude,
      position.coords.longitude
    );

    if (!zone) {
      return {
        ok: false,
        reason: 'outside',
        message:
          'Tu ubicación está fuera de las ciudades disponibles por ahora. Elegí una zona de la lista o acercate a una ciudad grande (Mendoza, Córdoba, CABA, Rosario, etc.).',
      };
    }

    return { ok: true, zone };
  } catch {
    return {
      ok: false,
      reason: 'error',
      message: 'No pudimos obtener tu ubicación. Probá de nuevo o elegí la zona manualmente.',
    };
  }
}

export function showZoneDetectFailure(result: Extract<ZoneDetectResult, { ok: false }>): void {
  const openSettings = result.reason === 'blocked' || result.reason === 'services_disabled';

  Alert.alert(
    openSettings ? 'Ubicación necesaria' : 'No se detectó la zona',
    result.message,
    openSettings
      ? [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: openAppSettings },
        ]
      : [{ text: 'Entendido' }]
  );
}
