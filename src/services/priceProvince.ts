import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import {
  DEFAULT_PRICE_PROVINCE,
  type AppProvince,
} from '@/config/provinces';
import { getAppSetting } from '@/db/database';
import { resolveProvince } from '@/utils/zoneRegion';

/** Provincia de precios de la zona activa del usuario. */
export async function getActivePriceProvince(): Promise<AppProvince> {
  try {
    const zone = await getAppSetting(SELECTED_ZONE_SETTING_KEY);
    return resolveProvince(zone).key;
  } catch {
    return DEFAULT_PRICE_PROVINCE;
  }
}
