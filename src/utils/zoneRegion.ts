import { APP_ZONES, type AppZone } from '@/config/zones';

const ZONE_REGIONS: Record<AppZone, { key: string; label: string }> = {
  'Rosario — Centro': { key: 'rosario', label: 'Rosario' },
  'Rosario — Norte': { key: 'rosario', label: 'Rosario' },
  'Rosario — Sur': { key: 'rosario', label: 'Rosario' },
  'Gran Rosario': { key: 'rosario', label: 'Rosario' },
  'Santa Fe capital': { key: 'santa-fe', label: 'Santa Fe' },
};

const DEFAULT_ZONE = { key: 'rosario', label: 'Rosario' };

function slugifyZone(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveZoneRegion(zoneSetting: string | null): {
  key: string;
  label: string;
} {
  if (!zoneSetting) return DEFAULT_ZONE;
  if ((APP_ZONES as readonly string[]).includes(zoneSetting)) {
    return ZONE_REGIONS[zoneSetting as AppZone];
  }
  return {
    key: slugifyZone(zoneSetting),
    label: zoneSetting,
  };
}
