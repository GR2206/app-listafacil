/**
 * Provincias = unidad de precios.
 * Las zonas UI (barrios/ciudades) se colapsan a una provincia.
 * Hipótesis: precios similares dentro de la provincia; cambian entre provincias.
 */

export const APP_PROVINCES = [
  'santa-fe',
  'buenos-aires',
  'cordoba',
  'mendoza',
  'san-juan',
  'san-luis',
  'tucuman',
  'salta',
  'neuquen',
  'entre-rios',
  'chaco',
  'misiones',
] as const;

export type AppProvince = (typeof APP_PROVINCES)[number];

export const PROVINCE_LABELS: Record<AppProvince, string> = {
  'santa-fe': 'Santa Fe',
  'buenos-aires': 'Buenos Aires',
  cordoba: 'Córdoba',
  mendoza: 'Mendoza',
  'san-juan': 'San Juan',
  'san-luis': 'San Luis',
  tucuman: 'Tucumán',
  salta: 'Salta',
  neuquen: 'Neuquén',
  'entre-rios': 'Entre Ríos',
  chaco: 'Chaco',
  misiones: 'Misiones',
};

/** Provincia por defecto del catálogo actual (scrapers Rosario / Santa Fe). */
export const DEFAULT_PRICE_PROVINCE: AppProvince = 'santa-fe';
