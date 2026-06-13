import 'dotenv/config';



export const config = {

  firebaseServiceAccountPath:

    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './serviceAccountKey.json',

  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',

  firestoreCollection: process.env.FIRESTORE_COLLECTION ?? 'Productos',

  /** 0 = sin límite (recorrido completo). Usar SCRAPE_LIMIT=50 solo para pruebas. */

  scrapeLimit: parseInt(process.env.SCRAPE_LIMIT ?? '0', 10),

  maxPagesPerCategory: parseInt(process.env.MAX_PAGES_PER_CATEGORY ?? '0', 10),

};



export const MARKETS = {

  carrefour: {

    id: 'carrefour',

    name: 'Carrefour',

    baseUrl: 'https://www.carrefour.com.ar',

    categories: [

      '/almacen',

      '/limpieza',

      '/perfumeria',

      '/bebidas',

      '/lacteos-y-huevos',

      '/frescos',

    ],

    usePuppeteer: true,

  },

  coto: {

    id: 'coto',

    name: 'Coto Digital',

    baseUrl: 'https://www.cotodigital.com.ar',

    categories: [

      '/sitios/cdigi/nuevositio/categoria/almacen',

      '/sitios/cdigi/nuevositio/categoria/limpieza',

      '/sitios/cdigi/nuevositio/categoria/perfumeria',

      '/sitios/cdigi/nuevositio/categoria/bebidas',

      '/sitios/cdigi/nuevositio/categoria/lacteos',

      '/sitios/cdigi/nuevositio/categoria/frescos',

    ],

    usePuppeteer: true,

  },

  jumbo: {

    id: 'jumbo',

    name: 'Jumbo',

    baseUrl: 'https://www.jumbo.com.ar',

    categories: [

      '/almacen',

      '/limpieza',

      '/perfumeria',

      '/bebidas',

      '/lacteos-y-huevos',

      '/frescos',

    ],

    usePuppeteer: true,

  },

};


