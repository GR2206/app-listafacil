export interface SupermarketPublicSource {
  id: string;
  name: string;
  /** Sitio público del supermercado (catálogo / tienda online). */
  websiteUrl: string;
  websiteLabel: string;
}

export const SUPERMARKET_PUBLIC_SOURCES: SupermarketPublicSource[] = [
  {
    id: 'la-reina',
    name: 'La Reina',
    websiteUrl: 'https://www.lareinaonline.com.ar/',
    websiteLabel: 'lareinaonline.com.ar',
  },
  {
    id: 'la-gallega',
    name: 'La Gallega',
    websiteUrl: 'https://www.lagallega.com.ar/',
    websiteLabel: 'lagallega.com.ar',
  },
  {
    id: 'carrefour',
    name: 'Carrefour',
    websiteUrl: 'https://www.carrefour.com.ar/',
    websiteLabel: 'carrefour.com.ar',
  },
  {
    id: 'jumbo',
    name: 'Jumbo',
    websiteUrl: 'https://www.jumbo.com.ar/',
    websiteLabel: 'jumbo.com.ar',
  },
  {
    id: 'dar',
    name: 'DAR',
    websiteUrl: 'https://darentucasa.com.ar/',
    websiteLabel: 'darentucasa.com.ar',
  },
  {
    id: 'coto',
    name: 'Coto Digital',
    websiteUrl: 'https://www.cotodigital.com.ar/',
    websiteLabel: 'cotodigital.com.ar',
  },
];

export const DATA_SOURCES_DISCLAIMER =
  'Lista Fácil no está afiliada, patrocinada ni avalada por ninguna de las cadenas mencionadas. ' +
  'Los nombres comerciales, logos y marcas pertenecen a sus respectivos titulares. ' +
  'La información de productos y precios proviene de fuentes públicas publicadas por cada supermercado ' +
  'y de datos aportados por usuarios bajo moderación. Los valores son orientativos: verificá siempre ' +
  'precio y disponibilidad en el punto de venta antes de pagar.';
