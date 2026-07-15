import { getAppSetting, setAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import { detectZoneFromDevice } from '@/services/zoneLocation';

const ZONE_GPS_PROMPTED_KEY = 'zone_gps_prompted_v1';

/**
 * Al primer arranque (sin zona guardada) intenta detectar ciudad por GPS.
 * No bloquea la app si el usuario niega o está fuera de cobertura.
 */
export async function ensureZoneOnLaunch(): Promise<{
  zone: string | null;
  source: 'existing' | 'gps' | 'skipped' | 'failed';
}> {
  const existing = await getAppSetting(SELECTED_ZONE_SETTING_KEY);
  if (existing) {
    return { zone: existing, source: 'existing' };
  }

  const alreadyPrompted = await getAppSetting(ZONE_GPS_PROMPTED_KEY);
  if (alreadyPrompted === '1') {
    return { zone: null, source: 'skipped' };
  }

  await setAppSetting(ZONE_GPS_PROMPTED_KEY, '1');

  try {
    const result = await detectZoneFromDevice();
    if (!result.ok) {
      return { zone: null, source: 'failed' };
    }

    await setAppSetting(SELECTED_ZONE_SETTING_KEY, result.zone);
    return { zone: result.zone, source: 'gps' };
  } catch {
    return { zone: null, source: 'failed' };
  }
}
