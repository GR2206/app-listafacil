/**

 * Utilidades de paginación para scrapers modulares.

 * scrapeLimit = 0 → sin tope (recorre hasta que no haya productos nuevos).

 */



export function hasScrapeLimit(limit) {

  return Number.isFinite(limit) && limit > 0;

}



export function applyScrapeLimit(items, limit, alreadyCollected = 0) {

  if (!hasScrapeLimit(limit)) return items;

  const remaining = Math.max(0, limit - alreadyCollected);

  return items.slice(0, remaining);

}



export function canCollectMore(limit, collected) {

  return !hasScrapeLimit(limit) || collected < limit;

}



/**

 * Construye URL de listado con paginación (?page=N).

 */

export function buildPagedUrl(baseUrl, page) {

  if (page <= 1) return baseUrl;

  const sep = baseUrl.includes('?') ? '&' : '?';

  return `${baseUrl}${sep}page=${page}`;

}


