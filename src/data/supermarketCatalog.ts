import type { Supermarket } from '@/types';
import type { AppProvince } from '@/config/provinces';
import type { ZoneRegionKey } from '@/config/zones';

/**
 * Cobertura de un súper en la grilla:
 * - national → todas las ciudades
 * - cities → solo esas ciudades (keys de resolveZoneRegion)
 * - provinces → cualquier ciudad de esas provincias
 */
export type SupermarketCoverageRule =
  | { type: 'national'; excludeCities?: Array<ZoneRegionKey | string> }
  | { type: 'cities'; cities: Array<ZoneRegionKey | string> }
  | { type: 'provinces'; provinces: AppProvince[] };

export interface SupermarketCatalogEntry extends Supermarket {
  neonColor: string;
  coverage: SupermarketCoverageRule;
}

/** Provincias AMBA / Buenos Aires (CABA + provincia). */
const BA: AppProvince[] = ['buenos-aires'];

/** Centro (Santa Fe + Córdoba). */
const CENTRO: AppProvince[] = ['santa-fe', 'cordoba'];

/** Cuyo. */
const CUYO: AppProvince[] = ['mendoza', 'san-juan', 'san-luis'];

/** Patagonia (hoy: Neuquén en el localizador). */
const PATAGONIA: AppProvince[] = ['neuquen'];

/** NOA / NEA (ciudades que ya listamos). */
const NOA_NEA: AppProvince[] = ['tucuman', 'salta', 'misiones', 'chaco', 'entre-rios'];

/**
 * Catálogo único de botones — coverage según ciudades.txt.
 * Logos: assets/supermarkets/{id}.png
 */
export const SUPERMARKET_CATALOG: SupermarketCatalogEntry[] = [
  // —— Rosario (locales) ——
  {
    id: 'la-reina',
    name: 'La Reina',
    slug: 'la-reina',
    initial: 'R',
    neonColor: '#FF8C1A',
    coverage: { type: 'cities', cities: ['rosario'] },
  },
  {
    id: 'la-gallega',
    name: 'La Gallega',
    slug: 'la-gallega',
    initial: 'G',
    neonColor: '#D946EF',
    coverage: { type: 'cities', cities: ['rosario'] },
  },
  {
    id: 'dar',
    name: 'DAR',
    slug: 'dar',
    initial: 'D',
    neonColor: '#FFBF00',
    coverage: { type: 'cities', cities: ['rosario'] },
  },
  {
    id: 'arcoiris',
    name: 'Arcoiris',
    slug: 'arcoiris',
    initial: 'A',
    neonColor: '#00A651',
    coverage: { type: 'cities', cities: ['rosario'] },
  },
  {
    id: 'unico',
    name: 'Único',
    slug: 'unico',
    initial: 'U',
    neonColor: '#E30613',
    coverage: { type: 'cities', cities: ['rosario'] },
  },

  // —— Cadenas amplias (no Posadas: ahí no hay Jumbo/Coto/Carrefour) ——
  {
    id: 'carrefour',
    name: 'Carrefour',
    slug: 'carrefour',
    initial: 'C',
    neonColor: '#3B9BFF',
    coverage: { type: 'national', excludeCities: ['posadas'] },
  },
  {
    id: 'jumbo',
    name: 'Jumbo',
    slug: 'jumbo',
    initial: 'J',
    neonColor: '#00E676',
    coverage: { type: 'national', excludeCities: ['posadas'] },
  },
  {
    id: 'coto',
    name: 'Coto',
    slug: 'coto',
    initial: 'C',
    neonColor: '#FF1A2E',
    coverage: { type: 'provinces', provinces: [...BA, ...CENTRO] },
  },

  // —— Nuevos (logos 2026-07-14) ——
  {
    id: 'disco',
    name: 'Disco',
    slug: 'disco',
    initial: 'D',
    neonColor: '#E30613',
    coverage: { type: 'provinces', provinces: BA },
  },
  {
    id: 'dia',
    name: 'Día',
    slug: 'dia',
    initial: 'D',
    neonColor: '#E30613',
    coverage: { type: 'provinces', provinces: BA },
  },
  {
    id: 'vea',
    name: 'Vea',
    slug: 'vea',
    initial: 'V',
    neonColor: '#EE1D23',
    // Interior Centro + Cuyo + NOA/NEA
    coverage: { type: 'provinces', provinces: [...CENTRO, ...CUYO, ...NOA_NEA] },
  },
  {
    id: 'atomo',
    name: 'Átomo',
    slug: 'atomo',
    initial: 'A',
    neonColor: '#E30613',
    coverage: { type: 'provinces', provinces: CUYO },
  },
  {
    id: 'changomas',
    name: 'Chango Más',
    slug: 'changomas',
    initial: 'C',
    neonColor: '#7CB342',
    // Cuyo + Patagonia + Misiones (Posadas)
    coverage: { type: 'provinces', provinces: [...CUYO, ...PATAGONIA, 'misiones'] },
  },
  {
    id: 'la-anonima',
    name: 'La Anónima',
    slug: 'la-anonima',
    initial: 'A',
    neonColor: '#004A99',
    coverage: { type: 'provinces', provinces: PATAGONIA },
  },

  // —— Posadas (Misiones) ——
  {
    id: 'california',
    name: 'California',
    slug: 'california',
    initial: 'C',
    neonColor: '#F5A623',
    coverage: { type: 'cities', cities: ['posadas'] },
  },
  {
    id: 'yaguar',
    name: 'Yaguar',
    slug: 'yaguar',
    initial: 'Y',
    neonColor: '#00A651',
    coverage: { type: 'cities', cities: ['posadas'] },
  },
  {
    id: 'maxiconsumo',
    name: 'Maxiconsumo',
    slug: 'maxiconsumo',
    initial: 'M',
    neonColor: '#E30613',
    coverage: { type: 'cities', cities: ['posadas'] },
  },
  {
    id: 'vital',
    name: 'Vital',
    slug: 'vital',
    initial: 'V',
    neonColor: '#0091DA',
    coverage: { type: 'cities', cities: ['posadas'] },
  },

  // —— Mar del Plata (Buenos Aires costa) ——
  {
    id: 'toledo',
    name: 'Toledo',
    slug: 'toledo',
    initial: 'T',
    neonColor: '#0B1F3F',
    coverage: { type: 'cities', cities: ['mar-del-plata'] },
  },
];

/** Lista compatible con el resto de la app (sin coverage/neon). */
export const MOCK_SUPERMARKETS: Supermarket[] = SUPERMARKET_CATALOG.map(
  ({ id, name, slug, initial, logoUrl }) => ({ id, name, slug, initial, logoUrl })
);

export function getCatalogEntry(supermarketId: string): SupermarketCatalogEntry | undefined {
  return SUPERMARKET_CATALOG.find((entry) => entry.id === supermarketId);
}
