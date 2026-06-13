import * as cheerio from 'cheerio';

import { extractCotoCardPrice, enrichWithDetailPage } from '../lib/extractors.js';

import { MARKETS } from '../config.js';

import {
  applyScrapeLimit,
  buildPagedUrl,
  canCollectMore,
  hasScrapeLimit,
} from '../lib/pagination.js';

const SELECTORS = {
  card: '.product-item, .producto, [class*="product-card"], [class*="product-item"]',
  name: '.product-name, .nombre, h2, h3',
  image: 'img',
  link: 'a',
};

export async function scrapeCoto(page, limit, maxPages = 0) {
  const market = MARKETS.coto;
  const allProducts = [];
  const seenUrls = new Set();

  for (const category of market.categories) {
    const baseUrl = `${market.baseUrl}${category}`;

    console.log(`\n📦 Coto — ${baseUrl}`);

    let pageNum = 1;
    let categoryCount = 0;

    try {
      while (canCollectMore(limit, allProducts.length)) {
        if (maxPages > 0 && pageNum > maxPages) break;

        const url = buildPagedUrl(baseUrl, pageNum);
        console.log(`  Página ${pageNum}: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        const html = await page.content();
        const $ = cheerio.load(html);

        const items = [];
        $(SELECTORS.card).each((_, el) => {
          const card = $(el);
          const name = card.find(SELECTORS.name).first().text().trim();
          const price = extractCotoCardPrice($, card);
          const imageUrl =
            card.find(SELECTORS.image).attr('src') ||
            card.find(SELECTORS.image).attr('data-src') ||
            null;
          const link = card.find(SELECTORS.link).attr('href') || null;

          if (!name) return;

          items.push({
            name,
            price,
            imageUrl,
            productUrl: link,
            supermarketId: market.id,
            barcode: null,
          });
        });

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
          const enriched = await enrichWithDetailPage(page, item, market.baseUrl, {
            marketId: market.id,
          });

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
      console.warn(`  ⚠ Coto: ${err.message}`);
    }
  }

  return allProducts;
}
