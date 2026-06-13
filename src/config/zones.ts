export const APP_ZONES = [
  'Rosario — Centro',
  'Rosario — Norte',
  'Rosario — Sur',
  'Gran Rosario',
  'Santa Fe capital',
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

const SANTA_FE_CAPITAL = { lat: -31.633, lng: -60.701 };
const ROSARIO_CENTRO = { lat: -32.946, lng: -60.639 };

/**
 * Asigna la zona más cercana según coordenadas GPS.
 * Cubre Rosario, Gran Rosario y Santa Fe capital.
 */
export function resolveZoneFromCoordinates(latitude: number, longitude: number): AppZone | null {
  const distSantaFe = distanceKm(latitude, longitude, SANTA_FE_CAPITAL.lat, SANTA_FE_CAPITAL.lng);
  const distRosario = distanceKm(latitude, longitude, ROSARIO_CENTRO.lat, ROSARIO_CENTRO.lng);

  if (distSantaFe <= 22 && distSantaFe + 8 < distRosario) {
    return 'Santa Fe capital';
  }

  if (distRosario > 38) {
    return null;
  }

  if (distRosario > 11) {
    return 'Gran Rosario';
  }

  if (latitude >= -32.935) {
    return 'Rosario — Norte';
  }

  if (latitude <= -32.955) {
    return 'Rosario — Sur';
  }

  return 'Rosario — Centro';
}
