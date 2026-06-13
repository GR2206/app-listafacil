import * as cheerio from 'cheerio';

const EAN_REGEX = /\b(\d{13}|\d{8})\b/g;

/**
 * Extrae EAN/GTIN desde JSON-LD Schema.org
 */
export function extractFromJsonLd(html) {
  const products = [];
  const scripts = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!scripts) return products;

  for (const scriptTag of scripts) {
    const jsonText = scriptTag
      .replace(/<script[^>]*>/i, '')
      .replace(/<\/script>/i, '')
      .trim();

    try {
      const data = JSON.parse(jsonText);
      const nodes = Array.isArray(data) ? data : [data];

      for (const node of nodes) {
        collectSchemaProducts(node, products);
      }
    } catch {
      // JSON-LD inválido en algunas páginas
    }
  }

  return products;
}

function collectSchemaProducts(node, out) {
  if (!node || typeof node !== 'object') return;

  const type = node['@type'];
  const isProduct =
    type === 'Product' ||
    (Array.isArray(type) && type.includes('Product'));

  if (isProduct) {
    const barcode =
      node.gtin13 ||
      node.gtin ||
      node.gtin8 ||
      node.sku ||
      node.productID;

    if (barcode && String(barcode).match(/^\d{8,13}$/)) {
      out.push({
        barcode: String(barcode).padStart(13, '0').slice(-13),
        name: node.name ?? '',
        imageUrl: extractImage(node.image),
        price: extractOfferPrice(node.offers),
        brand: typeof node.brand === 'object' ? node.brand?.name : node.brand,
      });
    }
  }

  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((n) => collectSchemaProducts(n, out));
  }
}

function extractImage(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return image[0] ?? null;
  if (typeof image === 'object') return image.url ?? null;
  return null;
}

function extractOfferPrice(offers) {
  if (!offers) return null;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const price = offer?.price ?? offer?.lowPrice;
  return price ? parseFloat(String(price).replace(/[^\d.]/g, '')) : null;
}

/**
 * Meta tags SEO (gtin, product ID ocultos)
 */
export function extractFromMeta($) {
  const candidates = [
    $('meta[property="product:gtin13"]').attr('content'),
    $('meta[property="product:gtin"]').attr('content'),
    $('meta[name="gtin13"]').attr('content'),
    $('meta[itemprop="gtin13"]').attr('content'),
    $('meta[itemprop="gtin"]').attr('content'),
  ].filter(Boolean);

  return candidates[0] ? String(candidates[0]).replace(/\D/g, '') : null;
}

/**
 * Busca EAN en HTML crudo (atributos data-*, scripts inline, APIs embebidas)
 */
export function extractBarcodeFromHtml(html) {
  const patterns = [
    /"gtin13"\s*:\s*"(\d{13})"/i,
    /"ean"\s*:\s*"(\d{13})"/i,
    /"barcode"\s*:\s*"(\d{13})"/i,
    /data-ean=["'](\d{13})["']/i,
    /data-gtin=["'](\d{13})["']/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }

  const all = [...html.matchAll(EAN_REGEX)].map((m) => m[1]);
  const ean13 = all.find((c) => c.length === 13 && c.startsWith('779'));
  return ean13 ?? null;
}

/**
 * Parser genérico de tarjetas de producto en listados HTML
 */
export function parseProductCards($, selectors, supermarketId) {
  const items = [];

  $(selectors.card).each((_, el) => {
    const card = $(el);
    const name = card.find(selectors.name).first().text().trim();
    const priceText = card.find(selectors.price).first().text().trim();
    const price = parsePrice(priceText);
    const imageUrl =
      card.find(selectors.image).attr('src') ||
      card.find(selectors.image).attr('data-src') ||
      null;
    const link = card.find(selectors.link).attr('href') || null;

    if (!name) return;

    items.push({
      name,
      price,
      imageUrl: normalizeUrl(imageUrl),
      productUrl: link,
      supermarketId,
      barcode: null,
    });
  });

  return items;
}

export function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const UNIT_MEASURE_TEXT =
  /por\s*(kg|kilo|kilogramo|litro|l\b|ml|gr|g\b|100\s*g)|unidad\s+de\s+medida|precio\s+por/i;

const FINAL_SALE_TEXT = /precio\s*(de\s*)?(venta\s*)?final|precio\s+final|precio\s+de\s+venta/i;

const COTO_UNIT_PRICE_SELECTOR =
  '.unit-price, .price-unit, [class*="unit-price"], [class*="price-unit"], [class*="price-per"], [class*="precio-unidad"], [class*="precio_por"]';

const COTO_FINAL_PRICE_SELECTOR =
  '.sale-price, .final-price, .precio-final, [class*="sale-price"], [class*="final-price"], [class*="precio-final"], [class*="precio-venta"], .price-sale';

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Cheerio<import('domhandler').Element>} node
 */
function isCotoUnitPriceNode($, node) {
  const cls = (node.attr('class') || '').toLowerCase();
  if (
    cls.includes('unit-price') ||
    cls.includes('price-unit') ||
    cls.includes('price-per') ||
    cls.includes('precio-unidad') ||
    cls.includes('precio_por')
  ) {
    return true;
  }

  if (node.is(COTO_UNIT_PRICE_SELECTOR) || node.closest(COTO_UNIT_PRICE_SELECTOR).length > 0) {
    return true;
  }

  const text = node.text().trim();
  if (UNIT_MEASURE_TEXT.test(text)) return true;

  const context = node.parent().text().toLowerCase();
  if (UNIT_MEASURE_TEXT.test(context) && !FINAL_SALE_TEXT.test(context)) {
    return true;
  }

  return false;
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Cheerio<import('domhandler').Element>} root
 * @param {number[]} [peerPrices]
 */
export function extractCotoSalePrices($, root, peerPrices = []) {
  /** @type {Array<{ price: number, priority: number }>} */
  const candidates = [];

  root.find(COTO_FINAL_PRICE_SELECTOR).each((_, el) => {
    const node = $(el);
    if (isCotoUnitPriceNode($, node)) return;
    const price = parsePrice(node.text().trim());
    if (price > 0) candidates.push({ price, priority: 0 });
  });

  root.find('[class*="price"], .precio, [class*="precio"]').each((_, el) => {
    const node = $(el);
    if (isCotoUnitPriceNode($, node)) return;

    const context = node.parent().text();
    const cls = (node.attr('class') || '').toLowerCase();
    const price = parsePrice(node.text().trim());
    if (price <= 0) return;

    let priority = 2;
    if (FINAL_SALE_TEXT.test(context)) priority = 0;
    else if (cls.includes('sale') || cls.includes('final') || cls.includes('venta')) priority = 1;

    candidates.push({ price, priority });
  });

  const seen = new Set();
  const unique = candidates
    .filter((c) => {
      if (seen.has(c.price)) return false;
      seen.add(c.price);
      return true;
    })
    .sort((a, b) => a.priority - b.priority || b.price - a.price);

  if (peerPrices.length === 0) {
    return unique[0]?.price ?? null;
  }

  const avg = peerPrices.filter((p) => p > 0).reduce((sum, p) => sum + p, 0) / peerPrices.length;
  for (const candidate of unique) {
    if (avg <= 0) return candidate.price;
    const ratio = candidate.price / avg;
    if (ratio <= 1.45 && ratio >= 0.55) return candidate.price;
  }

  return unique[0]?.price ?? null;
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Cheerio<import('domhandler').Element>} card
 * @param {number[]} [peerPrices]
 */
export function extractCotoCardPrice($, card, peerPrices = []) {
  return extractCotoSalePrices($, card, peerPrices);
}

export function normalizeUrl(url, base = '') {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Enriquece productos de listado visitando cada ficha (EAN en JSON-LD)
 */
export async function enrichWithDetailPage(page, item, baseUrl, options = {}) {
  if (!item.productUrl) return item;

  const url = normalizeUrl(item.productUrl, baseUrl);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const jsonLdProducts = extractFromJsonLd(html);
    const metaBarcode = extractFromMeta($);
    const htmlBarcode = extractBarcodeFromHtml(html);

    const barcode =
      jsonLdProducts[0]?.barcode || metaBarcode || htmlBarcode || null;

    const detail = jsonLdProducts[0] ?? {};
    const peerPrices = options.peerPrices ?? [];
    const domPrice =
      options.marketId === 'coto' ? extractCotoSalePrices($, $('body'), peerPrices) : null;

    return {
      ...item,
      barcode,
      name: detail.name || item.name,
      price: domPrice ?? detail.price ?? item.price,
      imageUrl: detail.imageUrl || item.imageUrl,
      brand: detail.brand ?? null,
    };
  } catch (err) {
    console.warn(`  ⚠ No se pudo enriquecer: ${url} — ${err.message}`);
    return item;
  }
}
