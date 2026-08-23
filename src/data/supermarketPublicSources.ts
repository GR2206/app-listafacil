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
  {
    id: 'arcoiris',
    name: 'Arcoiris',
    websiteUrl: 'https://arcoirisencasa.com.ar/',
    websiteLabel: 'arcoirisencasa.com.ar',
  },
  {
    id: 'unico',
    name: 'Único',
    websiteUrl: 'https://www.unicosupermercados.com.ar/',
    websiteLabel: 'unicosupermercados.com.ar',
  },
  {
    id: 'disco',
    name: 'Disco',
    websiteUrl: 'https://www.disco.com.ar/',
    websiteLabel: 'disco.com.ar',
  },
  {
    id: 'dia',
    name: 'Día',
    websiteUrl: 'https://diaonline.supermercadosdia.com.ar/',
    websiteLabel: 'supermercadosdia.com.ar',
  },
  {
    id: 'vea',
    name: 'Vea',
    websiteUrl: 'https://www.vea.com.ar/',
    websiteLabel: 'vea.com.ar',
  },
  {
    id: 'atomo',
    name: 'Átomo',
    websiteUrl: 'https://www.atomoconviene.com/',
    websiteLabel: 'atomoconviene.com',
  },
  {
    id: 'alvear',
    name: 'Alvear',
    websiteUrl: 'https://www.supermercadoalvear.com.ar/',
    websiteLabel: 'supermercadoalvear.com.ar',
  },
  {
    id: 'kilbel',
    name: 'Kilbel',
    websiteUrl: 'https://www.kilbel.com.ar/',
    websiteLabel: 'kilbel.com.ar',
  },
  {
    id: 'changomas',
    name: 'Chango Más',
    websiteUrl: 'https://www.changomas.com.ar/',
    websiteLabel: 'changomas.com.ar',
  },
  {
    id: 'la-anonima',
    name: 'La Anónima',
    websiteUrl: 'https://www.laanonima.com.ar/',
    websiteLabel: 'laanonima.com.ar',
  },
  {
    id: 'cooperativa-obrera',
    name: 'Cooperativa Obrera',
    websiteUrl: 'https://www.cooperativaobrera.coop/',
    websiteLabel: 'cooperativaobrera.coop',
  },
  {
    id: 'top',
    name: 'Top',
    websiteUrl: 'https://www.supertop.com.ar/',
    websiteLabel: 'supertop.com.ar',
  },
  {
    id: 'california',
    name: 'California',
    websiteUrl: 'https://www.californiaonline.com.ar/',
    websiteLabel: 'californiaonline.com.ar',
  },
  {
    id: 'yaguar',
    name: 'Yaguar',
    websiteUrl: 'https://www.yaguar.com/',
    websiteLabel: 'yaguar.com',
  },
  {
    id: 'maxiconsumo',
    name: 'Maxiconsumo',
    websiteUrl: 'https://www.maxiconsumo.com/',
    websiteLabel: 'maxiconsumo.com',
  },
  {
    id: 'vital',
    name: 'Vital',
    websiteUrl: 'https://www.vital.com.ar/',
    websiteLabel: 'vital.com.ar',
  },
  {
    id: 'toledo',
    name: 'Toledo',
    websiteUrl: 'https://www.toledo.com.ar/',
    websiteLabel: 'toledo.com.ar',
  },
];

export const DATA_SOURCES_DISCLAIMER =
  'Lista Fácil no está afiliada, patrocinada ni avalada por ninguna de las cadenas mencionadas. ' +
  'Los nombres comerciales, logos y marcas pertenecen a sus respectivos titulares. ' +
  'La información de productos y precios proviene de fuentes públicas publicadas por cada supermercado ' +
  'y de datos aportados por usuarios bajo moderación. Los valores son orientativos: verificá siempre ' +
  'precio y disponibilidad en el punto de venta antes de pagar.';
