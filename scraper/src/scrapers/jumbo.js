import * as cheerio from 'cheerio';

import { parseProductCards, enrichWithDetailPage, extractFromJsonLd } from '../lib/extractors.js';

import { MARKETS } from '../config.js';

import {

  applyScrapeLimit,

  buildPagedUrl,

  canCollectMore,

  hasScrapeLimit,

} from '../lib/pagination.js';



const SELECTORS = {

  card: '[data-testid="product-card"], .vtex-product-summary-2-x-container, .product-card',

  name: '[data-testid="product-name"], .product-brand, h3',

  price: '[data-testid="price"], .price, [class*="Price"]',

  image: 'img',

  link: 'a',

};



export async function scrapeJumbo(page, limit, maxPages = 0) {

  const market = MARKETS.jumbo;

  const allProducts = [];

  const seenUrls = new Set();



  for (const category of market.categories) {

    const baseUrl = `${market.baseUrl}${category}`;

    console.log(`\n📦 Jumbo — ${baseUrl}`);



    let pageNum = 1;

    let categoryCount = 0;



    try {

      while (canCollectMore(limit, allProducts.length)) {

        if (maxPages > 0 && pageNum > maxPages) break;



        const url = buildPagedUrl(baseUrl, pageNum);

        console.log(`  Página ${pageNum}: ${url}`);



        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

          const enriched = await enrichWithDetailPage(page, item, market.baseUrl);

          if (enriched.barcode && enriched.name && enriched.price) {

            allProducts.push(enriched);

            categoryCount++;

            console.log(`  ✓ ${enriched.barcode} — ${enriched.name}`);

          }

        }



        if (!hasScrapeLimit(limit) && items.length < 10) break;



        pageNum++;

      }



      console.log(`  → Categoría: ${categoryCount} productos`);

    } catch (err) {

      console.warn(`  ⚠ Jumbo: ${err.message}`);

    }

  }



  return allProducts;

}


