/**
 * Zonas de Lista Fácil.
 * - Rosario / Gran Rosario / Santa Fe: detalle local (donde hay supers regionales).
 * - Resto: ciudades grandes para el localizador GPS (cadenas nacionales: Coto, Carrefour, Jumbo).
 */

export const APP_ZONES = [
  // Cobertura con supers locales (hoy)
  'Rosario — Centro',
  'Rosario — Norte',
  'Rosario — Sur',
  'Gran Rosario',
  'Santa Fe capital',
  // Ciudades grandes (localizador + cadenas nacionales)
  'Buenos Aires CABA',
  'La Plata',
  'Mar del Plata',
  'Bahía Blanca',
  'Córdoba',
  'Río Cuarto',
  'Mendoza',
  'San Juan',
  'San Luis',
  'Tucumán',
  'Salta',
  'Neuquén',
  'Paraná',
  'Resistencia',
  'Posadas',
] as const;

export type AppZone = (typeof APP_ZONES)[number];

export const SELECTED_ZONE_SETTING_KEY = 'selected_zone';

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Región de catálogo / ranking (sin barrios). */
export type ZoneRegionKey =
  | 'rosario'
  | 'santa-fe'
  | 'caba'
  | 'la-plata'
  | 'mar-del-plata'
  | 'bahia-blanca'
  | 'cordoba'
  | 'rio-cuarto'
  | 'mendoza'
  | 'san-juan'
  | 'san-luis'
  | 'tucuman'
  | 'salta'
  | 'neuquen'
  | 'parana'
  | 'resistencia'
  | 'posadas';

type CityAnchor = {
  zone: AppZone;
  regionKey: ZoneRegionKey;
  label: string;
  lat: number;
  lng: number;
  /** Radio máx. (km) para asignar esta ciudad por GPS. */
  radiusKm: number;
};

const SANTA_FE_CAPITAL = { lat: -31.633, lng: -60.701 };
const ROSARIO_CENTRO = { lat: -32.946, lng: -60.639 };

/**
 * Anclas GPS de ciudades grandes (fuera del detalle Rosario).
 * Radio ~35–45 km: alcanza el ejido / área metropolitana sin solapar mucho.
 */
const CITY_ANCHORS: CityAnchor[] = [
  {
    zone: 'Santa Fe capital',
    regionKey: 'santa-fe',
    label: 'Santa Fe',
    lat: SANTA_FE_CAPITAL.lat,
    lng: SANTA_FE_CAPITAL.lng,
    radiusKm: 22,
  },
  {
    zone: 'Buenos Aires CABA',
    regionKey: 'caba',
    label: 'Buenos Aires',
    lat: -34.6037,
    lng: -58.3816,
    radiusKm: 28,
  },
  {
    zone: 'La Plata',
    regionKey: 'la-plata',
    label: 'La Plata',
    lat: -34.9205,
    lng: -57.9536,
    radiusKm: 22,
  },
  {
    zone: 'Mar del Plata',
    regionKey: 'mar-del-plata',
    label: 'Mar del Plata',
    lat: -38.0055,
    lng: -57.5426,
    radiusKm: 25,
  },
  {
    zone: 'Bahía Blanca',
    regionKey: 'bahia-blanca',
    label: 'Bahía Blanca',
    lat: -38.7183,
    lng: -62.2663,
    radiusKm: 22,
  },
  {
    zone: 'Córdoba',
    regionKey: 'cordoba',
    label: 'Córdoba',
    lat: -31.4201,
    lng: -64.1888,
    radiusKm: 35,
  },
  {
    zone: 'Río Cuarto',
    regionKey: 'rio-cuarto',
    label: 'Río Cuarto',
    lat: -33.1301,
    lng: -64.3499,
    radiusKm: 20,
  },
  {
    zone: 'Mendoza',
    regionKey: 'mendoza',
    label: 'Mendoza',
    lat: -32.8895,
    lng: -68.8458,
    radiusKm: 35,
  },
  {
    zone: 'San Juan',
    regionKey: 'san-juan',
    label: 'San Juan',
    lat: -31.5375,
    lng: -68.5364,
    radiusKm: 22,
  },
  {
    zone: 'San Luis',
    regionKey: 'san-luis',
    label: 'San Luis',
    lat: -33.3017,
    lng: -66.3378,
    radiusKm: 20,
  },
  {
    zone: 'Tucumán',
    regionKey: 'tucuman',
    label: 'Tucumán',
    lat: -26.8083,
    lng: -65.2176,
    radiusKm: 25,
  },
  {
    zone: 'Salta',
    regionKey: 'salta',
    label: 'Salta',
    lat: -24.7821,
    lng: -65.4232,
    radiusKm: 22,
  },
  {
    zone: 'Neuquén',
    regionKey: 'neuquen',
    label: 'Neuquén',
    lat: -38.9516,
    lng: -68.0591,
    radiusKm: 25,
  },
  {
    zone: 'Paraná',
    regionKey: 'parana',
    label: 'Paraná',
    lat: -31.7413,
    lng: -60.5115,
    radiusKm: 18,
  },
  {
    zone: 'Resistencia',
    regionKey: 'resistencia',
    label: 'Resistencia',
    lat: -27.4514,
    lng: -58.9867,
    radiusKm: 22,
  },
  {
    zone: 'Posadas',
    regionKey: 'posadas',
    label: 'Posadas',
    lat: -27.3671,
    lng: -55.8961,
    radiusKm: 20,
  },
];

function resolveRosarioDetail(latitude: number, longitude: number): AppZone | null {
  const distRosario = distanceKm(latitude, longitude, ROSARIO_CENTRO.lat, ROSARIO_CENTRO.lng);
  if (distRosario > 38) return null;

  if (distRosario > 11) return 'Gran Rosario';
  if (latitude >= -32.935) return 'Rosario — Norte';
  if (latitude <= -32.955) return 'Rosario — Sur';
  return 'Rosario — Centro';
}

/**
 * Asigna la zona más cercana según GPS.
 * Prioridad: Rosario (barrios) → ciudad ancla más cercana dentro de su radio.
 */
export function resolveZoneFromCoordinates(latitude: number, longitude: number): AppZone | null {
  const distSantaFe = distanceKm(latitude, longitude, SANTA_FE_CAPITAL.lat, SANTA_FE_CAPITAL.lng);
  const distRosario = distanceKm(latitude, longitude, ROSARIO_CENTRO.lat, ROSARIO_CENTRO.lng);

  // Santa Fe vs Rosario: se mantienen las reglas locales históricas.
  if (distSantaFe <= 22 && distSantaFe + 8 < distRosario) {
    return 'Santa Fe capital';
  }

  const rosarioZone = resolveRosarioDetail(latitude, longitude);
  if (rosarioZone) return rosarioZone;

  let best: { zone: AppZone; distance: number } | null = null;
  for (const anchor of CITY_ANCHORS) {
    if (anchor.zone === 'Santa Fe capital') continue; // ya resuelto arriba
    const d = distanceKm(latitude, longitude, anchor.lat, anchor.lng);
    if (d > anchor.radiusKm) continue;
    if (!best || d < best.distance) {
      best = { zone: anchor.zone, distance: d };
    }
  }

  return best?.zone ?? null;
}

export function getCityAnchors(): readonly CityAnchor[] {
  return CITY_ANCHORS;
}
