import * as cheerio from 'cheerio';

import {

  parseProductCards,

  enrichWithDetailPage,

  extractFromJsonLd,

  extractBarcodeFromHtml,

} from '../lib/extractors.js';

import { MARKETS } from '../config.js';

import {

  applyScrapeLimit,

  buildPagedUrl,

  canCollectMore,

  hasScrapeLimit,

} from '../lib/pagination.js';



const SELECTORS = {

  card: '[data-testid="product-card"], .vtex-product-summary-2-x-container',

  name: '[data-testid="product-name"], .vtex-product-summary-2-x-productBrand',

  price: '[data-testid="price"], .vtex-product-price-1-x-sellingPrice',

  image: 'img',

  link: 'a',

};



export async function scrapeCarrefour(page, limit, maxPages = 0) {

  const market = MARKETS.carrefour;

  const allProducts = [];

  const seenUrls = new Set();



  for (const category of market.categories) {

    const baseUrl = `${market.baseUrl}${category}`;

    console.log(`\n📦 Carrefour — ${baseUrl}`);



    let pageNum = 1;

    let categoryCount = 0;



    while (canCollectMore(limit, allProducts.length)) {

      if (maxPages > 0 && pageNum > maxPages) break;



      const url = buildPagedUrl(baseUrl, pageNum);

      console.log(`  Página ${pageNum}: ${url}`);



      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      await autoScroll(page);



      const html = await page.content();

      const $ = cheerio.load(html);

      let items = parseProductCards($, SELECTORS, market.id);



      if (items.length === 0) {

        const ld = extractFromJsonLd(html);

        items = ld.map((p) => ({ ...p, supermarketId: market.id }));

      }



      const newItems = items.filter((item) => {

        const key = item.productUrl ?? item.name;

        if (seenUrls.has(key)) return false;

        seenUrls.add(key);

        return true;

      });



      console.log(`  Encontrados: ${items.length} (${newItems.length} nuevos)`);



      if (newItems.length === 0) break;



      const batch = applyScrapeLimit(newItems, limit, allProducts.length);



      for (const item of batch) {

        let enriched = item;



        if (!item.barcode && item.productUrl) {

          enriched = await enrichWithDetailPage(page, item, market.baseUrl);

        }



        if (!enriched.barcode) {

          enriched.barcode = extractBarcodeFromHtml(

            enriched.name + (enriched.productUrl ?? '')

          );

        }



        if (enriched.barcode && enriched.name && enriched.price) {

          allProducts.push(enriched);

          categoryCount++;

          console.log(`  ✓ ${enriched.barcode} — ${enriched.name} — $${enriched.price}`);

        }

      }



      if (!hasScrapeLimit(limit) && items.length < 10) break;



      pageNum++;

    }



    console.log(`  → Categoría: ${categoryCount} productos`);

  }



  return allProducts;

}



async function autoScroll(page) {

  await page.evaluate(async () => {

    await new Promise((resolve) => {

      let total = 0;

      const step = 400;

      const timer = setInterval(() => {

        window.scrollBy(0, step);

        total += step;

        if (total >= document.body.scrollHeight) {

          clearInterval(timer);

          resolve();

        }

      }, 200);

    });

  });

}


