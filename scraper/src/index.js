import puppeteer from 'puppeteer';

import { config, MARKETS } from './config.js';

import { initFirebase, saveBatch } from './lib/firebase.js';

import { scrapeCarrefour } from './scrapers/carrefour.js';

import { scrapeCoto } from './scrapers/coto.js';

import { scrapeJumbo } from './scrapers/jumbo.js';

import { hasScrapeLimit } from './lib/pagination.js';



const SCRAPERS = {

  carrefour: scrapeCarrefour,

  coto: scrapeCoto,

  jumbo: scrapeJumbo,

};



function parseArgs() {

  const marketArg = process.argv.find((a) => a.startsWith('--market='));

  const market = marketArg?.split('=')[1] ?? 'all';

  return { market };

}



async function main() {

  const { market } = parseArgs();

  const limit = config.scrapeLimit;

  const maxPages = config.maxPagesPerCategory;



  console.log('🚀 Lista Fácil — Scraper de supermercados');

  console.log(

    hasScrapeLimit(limit)

      ? `   Modo prueba: límite ${limit} productos por mercado`

      : '   Modo completo: sin límite de productos'

  );

  if (maxPages > 0) {

    console.log(`   Tope de páginas por categoría: ${maxPages}`);

  }

  console.log(`   Mercado: ${market}`);



  initFirebase();



  const browser = await puppeteer.launch({

    headless: 'new',

    args: ['--no-sandbox', '--disable-setuid-sandbox'],

  });



  const page = await browser.newPage();

  await page.setUserAgent(

    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  );

  await page.setViewport({ width: 1280, height: 900 });



  const marketsToRun = market === 'all' ? Object.keys(SCRAPERS) : [market];



  let totalProcesados = 0;

  let totalGuardados = 0;

  let totalErrores = 0;

  let totalOmitidos = 0;



  for (const marketId of marketsToRun) {

    const scraper = SCRAPERS[marketId];

    if (!scraper) {

      console.error(`❌ Scraper no encontrado: ${marketId}`);

      continue;

    }



    console.log(`\n══════════════════════════════════════`);

    console.log(`  ${MARKETS[marketId]?.name ?? marketId}`);

    console.log(`══════════════════════════════════════`);



    const products = await scraper(page, limit, maxPages);

    const { saved, skipped, errors } = await saveBatch(products);



    totalProcesados += products.length;

    totalGuardados += saved;

    totalOmitidos += skipped;

    totalErrores += errors;



    console.log(`\n  → ${MARKETS[marketId]?.name}: ${saved} guardados | ${skipped} omitidos | ${errors} errores`);

  }



  await browser.close();



  console.log('\n✅ Scraping finalizado');

  console.log(`   Robot finalizado: ${totalProcesados} productos procesados`);

  console.log(

    `   Guardados en Firebase: ${totalGuardados} | Omitidos: ${totalOmitidos} | Errores: ${totalErrores}`

  );

}



main().catch((err) => {

  console.error('❌ Error fatal:', err);

  process.exit(1);

});


