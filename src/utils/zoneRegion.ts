import { APP_ZONES, type AppZone, type ZoneRegionKey } from '@/config/zones';
import {
  DEFAULT_PRICE_PROVINCE,
  PROVINCE_LABELS,
  type AppProvince,
} from '@/config/provinces';

/** Ciudad/área para UI (taquillero, mapas). */
const ZONE_CITY: Record<AppZone, { key: ZoneRegionKey | string; label: string }> = {
  'Rosario — Centro': { key: 'rosario', label: 'Rosario' },
  'Rosario — Norte': { key: 'rosario', label: 'Rosario' },
  'Rosario — Sur': { key: 'rosario', label: 'Rosario' },
  'Gran Rosario': { key: 'rosario', label: 'Rosario' },
  'Santa Fe capital': { key: 'santa-fe', label: 'Santa Fe' },
  'Buenos Aires CABA': { key: 'caba', label: 'Buenos Aires' },
  'La Plata': { key: 'la-plata', label: 'La Plata' },
  'Mar del Plata': { key: 'mar-del-plata', label: 'Mar del Plata' },
  'Bahía Blanca': { key: 'bahia-blanca', label: 'Bahía Blanca' },
  Córdoba: { key: 'cordoba', label: 'Córdoba' },
  'Río Cuarto': { key: 'rio-cuarto', label: 'Río Cuarto' },
  Mendoza: { key: 'mendoza', label: 'Mendoza' },
  'San Juan': { key: 'san-juan', label: 'San Juan' },
  'San Luis': { key: 'san-luis', label: 'San Luis' },
  Tucumán: { key: 'tucuman', label: 'Tucumán' },
  Salta: { key: 'salta', label: 'Salta' },
  Neuquén: { key: 'neuquen', label: 'Neuquén' },
  Paraná: { key: 'parana', label: 'Paraná' },
  Resistencia: { key: 'resistencia', label: 'Resistencia' },
  Posadas: { key: 'posadas', label: 'Posadas' },
};

/** Provincia de precios por zona UI. */
const ZONE_PROVINCE: Record<AppZone, AppProvince> = {
  'Rosario — Centro': 'santa-fe',
  'Rosario — Norte': 'santa-fe',
  'Rosario — Sur': 'santa-fe',
  'Gran Rosario': 'santa-fe',
  'Santa Fe capital': 'santa-fe',
  'Buenos Aires CABA': 'buenos-aires',
  'La Plata': 'buenos-aires',
  'Mar del Plata': 'buenos-aires',
  'Bahía Blanca': 'buenos-aires',
  Córdoba: 'cordoba',
  'Río Cuarto': 'cordoba',
  Mendoza: 'mendoza',
  'San Juan': 'san-juan',
  'San Luis': 'san-luis',
  Tucumán: 'tucuman',
  Salta: 'salta',
  Neuquén: 'neuquen',
  Paraná: 'entre-rios',
  Resistencia: 'chaco',
  Posadas: 'misiones',
};

const DEFAULT_CITY = { key: 'rosario', label: 'Rosario' };

/** Ciudades donde hoy mostrar supers locales scrapeados (La Reina, DAR, etc.). */
export const LOCAL_SUPER_CITY_KEYS = new Set(['rosario']);

function slugifyZone(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Región de ciudad (ranking / mapas). */
export function resolveZoneRegion(zoneSetting: string | null): {
  key: string;
  label: string;
} {
  if (!zoneSetting) return DEFAULT_CITY;
  if ((APP_ZONES as readonly string[]).includes(zoneSetting)) {
    return ZONE_CITY[zoneSetting as AppZone];
  }
  return {
    key: slugifyZone(zoneSetting),
    label: zoneSetting,
  };
}

/** Provincia de precios. */
export function resolveProvince(zoneSetting: string | null): {
  key: AppProvince;
  label: string;
} {
  if (zoneSetting && (APP_ZONES as readonly string[]).includes(zoneSetting)) {
    const key = ZONE_PROVINCE[zoneSetting as AppZone];
    return { key, label: PROVINCE_LABELS[key] };
  }
  return {
    key: DEFAULT_PRICE_PROVINCE,
    label: PROVINCE_LABELS[DEFAULT_PRICE_PROVINCE],
  };
}

export function isLocalSupermarketRegion(zoneSetting: string | null): boolean {
  const { key } = resolveZoneRegion(zoneSetting);
  return LOCAL_SUPER_CITY_KEYS.has(key);
}

/** @deprecated usar LOCAL_SUPER_CITY_KEYS / isLocalSupermarketRegion */
export const LOCAL_SUPER_REGION_KEYS = LOCAL_SUPER_CITY_KEYS;
