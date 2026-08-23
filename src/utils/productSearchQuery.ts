/** Variantes de búsqueda + corrección de tipeo para el catálogo. */

const PRODUCT_LEXICON = [
  'aceite',
  'agua',
  'arroz',
  'azucar',
  'cafe',
  'coca',
  'cola',
  'crema',
  'detergent',
  'dulce',
  'fideo',
  'fideos',
  'gaseosa',
  'hamburguesa',
  'hamburguesas',
  'burger',
  'paty',
  'medallon',
  'medallones',
  'harina',
  'huevo',
  'huevos',
  'jabon',
  'jamon',
  'leche',
  'manteca',
  'mate',
  'cocido',
  'mayonesa',
  'pan',
  'papel',
  'pasta',
  'pure',
  'queso',
  'sal',
  'salsa',
  'shampoo',
  'soap',
  'tallarin',
  'tomate',
  'yerba',
  'yogur',
  'yogurt',
  'yoghurt',
  'yogurcito',
  'zanoni',
  'playadito',
  'terrabusi',
  'sprite',
  'fanta',
  'pepsi',
  'pepas',
  'masita',
  'masitas',
  'galletita',
  'galletitas',
  'quilmes',
  'brahma',
  'serenisima',
  'la serenisima',
  'coca cola',
  'cocacola',
  'mate cocido',
  'yerba mate',
  'dulce de leche',
  'papel higienico',
  'pan de hamburguesa',
  '9 de oro',
  'la serenisima',
];

/** Conectores que no deben usarse solos como criterio de match. */
const SEARCH_STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'en',
  'con',
  'para',
  'por',
  'un',
  'una',
  'al',
  'a',
]);

/**
 * Sinónimos ESTRECHOS (mismo producto / plural / ortografía).
 * Nunca ampliar a categoría padre: pepas ↛ galletitas anillitos.
 */
const PRODUCT_SEARCH_SYNONYMS: Record<string, string[]> = {
  // Carne / burger: aliases del mismo tipo de producto
  hamburguesa: ['hamburguesas', 'burger', 'burgers', 'paty'],
  hamburguesas: ['hamburguesa', 'burger', 'burgers', 'paty'],
  burger: ['hamburguesa', 'hamburguesas', 'burgers', 'paty'],
  burgers: ['hamburguesa', 'burger', 'paty'],
  paty: ['hamburguesa', 'hamburguesas', 'burger'],
  // Solo inflexión
  medallon: ['medallones'],
  medallones: ['medallon'],
  pepa: ['pepas'],
  pepas: ['pepa'],
  galletita: ['galletitas'],
  galletitas: ['galletita'],
  masita: ['masitas'],
  masitas: ['masita'],
  yogur: ['yogurt', 'yoghurt'],
  yogurt: ['yogur', 'yoghurt'],
  yoghurt: ['yogur', 'yogurt'],
  fideo: ['fideos'],
  fideos: ['fideo'],
  jabon: ['jabones'],
  detergente: ['detergent'],
  detergent: ['detergente'],
};

/** Tokens de categoría “ancha”: si buscás esto, sí esperás el surtido completo. */
const BROAD_CATEGORY_TOKENS = new Set([
  'galletitas',
  'galletita',
  'masitas',
  'masita',
  'fideos',
  'fideo',
  'yogur',
  'yogurt',
  'leche',
  'agua',
  'gaseosa',
  'hamburguesa',
  'hamburguesas',
  'pan',
  'queso',
  'yerba',
  'aceite',
  'arroz',
  'harina',
]);


/** Marcas típicas solo para LIKE local (barato). No disparan N queries remotas. */
const CATEGORY_RELATED_BRANDS: Record<string, string[]> = {
  hamburguesa: ['paladini', 'swift', 'paty', 'granja del sol', 'good mark'],
  hamburguesas: ['paladini', 'swift', 'paty', 'granja del sol'],
  burger: ['paladini', 'swift', 'paty'],
  paty: ['paty'],
};

/**
 * Exclusiones por categoría: "hamburguesa" ≠ medallón de merluza / pan de hamburguesa.
 */
const SEARCH_RELEVANCE_BLOCKERS: Record<string, string[]> = {
  hamburguesa: [
    'merluza',
    'pescado',
    'salmon',
    'atun',
    'calamar',
    'langostino',
    'abadejo',
    'filet',
    'filete',
    'rabas',
    'pescad',
    'mariscos',
    'pan de hamburguesa',
    'pan hamburguesa',
    'pan para hamburguesa',
    'pan para burger',
  ],
  hamburguesas: [
    'merluza',
    'pescado',
    'salmon',
    'atun',
    'calamar',
    'langostino',
    'abadejo',
    'filet',
    'filete',
    'rabas',
    'pescad',
    'pan de hamburguesa',
    'pan hamburguesa',
    'pan para hamburguesa',
  ],
  burger: [
    'merluza',
    'pescado',
    'salmon',
    'atun',
    'calamar',
    'pan de hamburguesa',
    'pan hamburguesa',
  ],
  paty: ['merluza', 'pescado', 'salmon', 'atun', 'calamar'],
};

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

/**
 * Tokens útiles para match (ignora "de"/"la"/…; conserva dígitos de marcas como "9").
 * "9 de oro" → ["9", "oro"]
 */
export function significantSearchTokens(query: string): string[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  return q.split(' ').filter((token) => {
    if (!token || SEARCH_STOPWORDS.has(token)) return false;
    if (/^\d+[a-z]?$/.test(token)) return true;
    return token.length >= 2;
  });
}

/** Rechaza resultados fuera de categoría (ej. merluza al buscar hamburguesa). */
export function passesSearchRelevanceFilter(
  productName: string,
  query: string
): boolean {
  const name = normalizeSearchText(productName);
  const q = normalizeSearchText(query);
  if (!name || !q) return false;

  for (const token of significantSearchTokens(q)) {
    const blockers = SEARCH_RELEVANCE_BLOCKERS[token];
    if (blockers?.some((blocker) => name.includes(blocker))) return false;
  }
  return true;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Token como palabra entera (evita "co" dentro de cualquier cosa). */
export function hasWholeWord(haystack: string, word: string): boolean {
  const token = normalizeSearchText(word);
  if (!token) return false;
  const text = normalizeSearchText(haystack);
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(token)}(?:[^a-z0-9]|$)`).test(text);
}

/**
 * Variantes que NO deben salir cuando la búsqueda es solo el producto base.
 * Ej: "leche" ≠ "leche chocolatada" / "dulce de leche".
 */
const STAPLE_VARIANT_BLOCKERS: Record<string, string[]> = {
  leche: [
    'chocolat',
    'chocolatada',
    'saboriz',
    'dulce de leche',
    'almendra',
    'soja',
    'coco',
    'arroz',
    'avena',
    'vegetal',
    'condensad',
    'en polvo',
    'cultiv',
  ],
  yogur: ['bebible', 'yogurcito'],
  yogurt: ['bebible', 'yogurcito'],
  agua: ['tonica', 'saboriz', 'sabor', 'saborizada', 'con gas sabor'],
  cafe: ['cereales', 'achicoria'],
  pan: ['rallado', 'hamburguesa', 'hamburgues', 'dulce'],
  queso: ['untable', 'rallado'],
  yerba: ['mate cocido'],
};

function hasStapleVariantBlocker(productName: string, query: string): boolean {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(productName);
  const tokens = q.split(' ').filter((t) => t.length >= 2);
  if (tokens.length !== 1) return false;

  const token = tokens[0];
  const blockers = STAPLE_VARIANT_BLOCKERS[token];
  if (blockers?.some((blocker) => name.includes(blocker))) return true;

  // "yogur … leche" no es búsqueda de leche.
  const words = name.split(' ').filter(Boolean);
  const idx = words.indexOf(token);
  if (idx > 0) {
    const before = words.slice(0, idx).join(' ');
    const leadingForeign = [
      'yogur',
      'yogurt',
      'yoghurt',
      'dulce',
      'postre',
      'helado',
      'salsa',
      'crema',
      'flan',
    ];
    if (leadingForeign.some((f) => before.includes(f))) return true;
  }

  return false;
}

function tokenHitsNameWord(name: string, token: string): boolean {
  const words = name.split(' ').filter(Boolean);
  return words.some((w) => {
    if (w === token) return true;
    // Prefijo al tipeár: "pep"→pepsi, "pepas"→pepas/pepasxxx.
    // No al revés ni vecinos confusos (pepas↛pepsi).
    if (token.length >= 2 && w.startsWith(token)) return true;
    return false;
  });
}

/**
 * Match al tipeár: acepta prefijos de palabra ("lec" → "leche").
 * Multi-palabra: solo tokens significativos ("9 de oro" exige 9 + oro, no "de").
 * Los blockers de variantes solo aplican si el token es exacto (ej. "leche").
 */
export function titlePrefixMatchesSearchQuery(
  productName: string,
  query: string
): boolean {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(productName);
  if (!q || !name) return false;

  const qCompact = q.replace(/\s+/g, '');
  const nameCompact = name.replace(/\s+/g, '');
  if (qCompact.length >= 3 && nameCompact.includes(qCompact)) {
    const tokens = significantSearchTokens(q);
    if (tokens.length === 1 && STAPLE_VARIANT_BLOCKERS[tokens[0]]) {
      return !hasStapleVariantBlocker(name, q);
    }
    return true;
  }

  const tokens = significantSearchTokens(q);
  if (tokens.length === 0) {
    // Fallback: query solo stopwords / 1 letra.
    const raw = q.split(' ').filter((t) => t.length >= 2);
    if (raw.length === 0) return false;
    if (!raw.every((token) => tokenHitsNameWord(name, token))) return false;
    return true;
  }
  if (!tokens.every((token) => tokenHitsNameWord(name, token))) return false;
  if (tokens.length === 1 && STAPLE_VARIANT_BLOCKERS[tokens[0]]) {
    return !hasStapleVariantBlocker(name, q);
  }
  return true;
}

/**
 * Match estricto de producto: todos los tokens como palabra entera,
 * sin variantes (leche ≠ leche chocolatada). Sin query → false.
 */
export function titleMatchesSearchQuery(productName: string, query: string): boolean {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(productName);
  if (!q || !name) return false;

  const qCompact = q.replace(/\s+/g, '');
  const nameCompact = name.replace(/\s+/g, '');

  // "cocacola" ↔ "coca cola" / "9deoro" ↔ "9 de oro"
  if (qCompact.length >= 4 && nameCompact.includes(qCompact)) {
    return !hasStapleVariantBlocker(name, q);
  }

  const tokens = significantSearchTokens(q);
  if (tokens.length === 0) return false;
  if (!tokens.every((token) => hasWholeWord(name, token))) return false;
  if (hasStapleVariantBlocker(name, q)) return false;
  return true;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function maxEditDistance(word: string): number {
  // Cortas: solo 1 cambio (y aún así hay pares confusos pepas/pepsi).
  if (word.length <= 4) return 1;
  if (word.length <= 7) return 1;
  return 2;
}

/**
 * Pares que NO deben autocorregirse entre sí (productos distintos).
 * Ej: pepas (masitas) ≠ pepsi (gaseosa).
 */
const LEXICON_CORRECTION_BLOCKLIST: Array<[string, string]> = [
  ['pepas', 'pepsi'],
  ['pepsi', 'pepas'],
  ['coca', 'cocoa'],
  ['pan', 'pam'],
  ['sal', 'sol'],
  ['te', 'te'],
];

function isBlockedLexiconCorrection(from: string, to: string): boolean {
  return LEXICON_CORRECTION_BLOCKLIST.some(
    ([a, b]) => (from === a && to === b) || (from === b && to === a)
  );
}

/** Sugiere corrección de una palabra suelta contra el léxico. */
export function suggestLexiconWord(word: string): string | null {
  const normalized = normalizeSearchText(word);
  if (normalized.length < 3) return null;
  if (PRODUCT_LEXICON.includes(normalized)) return null;

  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const entry of PRODUCT_LEXICON) {
    if (entry.includes(' ')) continue;
    if (isBlockedLexiconCorrection(normalized, entry)) continue;
    // Misma inicial: evita saltos raros entre categorías.
    if (entry[0] !== normalized[0]) continue;
    const dist = levenshtein(normalized, entry);
    const maxDist = maxEditDistance(normalized);
    if (dist > 0 && dist <= maxDist && dist < bestDist) {
      best = entry;
      bestDist = dist;
    }
  }

  return best;
}

/**
 * Corrige la query completa (palabra por palabra + frases conocidas).
 * Ej: "fidreo" → "fideo", "coca cola" se mantiene.
 */
export function suggestCorrectedQuery(query: string): string | null {
  const normalized = normalizeSearchText(query);
  if (!normalized) return null;

  for (const phrase of PRODUCT_LEXICON.filter((e) => e.includes(' '))) {
    if (levenshtein(normalized, phrase) <= 2 && normalized !== phrase) {
      return phrase;
    }
  }

  const words = normalized.split(' ').filter(Boolean);
  let changed = false;
  const corrected = words.map((word) => {
    const suggestion = suggestLexiconWord(word);
    if (suggestion) {
      changed = true;
      return suggestion;
    }
    return word;
  });

  if (!changed) return null;
  return corrected.join(' ');
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const ACUTE: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
};

/** Variantes con tilde en la última vocal (Terepin → Terepín) para Firestore. */
function withSpanishAccentVariants(word: string): string[] {
  const raw = word.trim();
  if (raw.length < 3) return [raw];
  const out = new Set<string>([raw]);
  const lower = raw.toLowerCase();
  const match = lower.match(/^(.*)([aeiou])([^aeiou]*)$/i);
  if (match) {
    const accented = `${match[1]}${ACUTE[match[2].toLowerCase()] ?? match[2]}${match[3]}`;
    out.add(accented);
    out.add(toTitleCase(accented));
  }
  return [...out];
}

/**
 * ¿Parece búsqueda por marca? (terepin, bagley, paladini)
 * No aplica a categorías amplias (galletitas, leche…).
 */
export function isLikelyBrandQuery(query: string): boolean {
  const tokens = significantSearchTokens(query);
  if (tokens.length === 0) return false;
  if (tokens.length >= 2) {
    // Frases tipo "9 de oro" / "la serenisima" → marca
    return !tokens.every((t) => BROAD_CATEGORY_TOKENS.has(t));
  }
  const token = tokens[0];
  if (token.length < 3) return false;
  if (BROAD_CATEGORY_TOKENS.has(token)) return false;
  if (PRODUCT_SEARCH_SYNONYMS[token]?.length) {
    // Tiene aliases de producto (hamburguesa, pepas…) → no solo marca
    return false;
  }
  return true;
}

/** Casings útiles para índices Firestore (case-sensitive). */
export function expandFirestoreCasingVariants(query: string): string[] {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (raw.length < 2) return [];

  const normalized = normalizeSearchText(raw);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const v = value.trim();
    if (v.length < 2 || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };

  for (const base of [raw, normalized, ...withSpanishAccentVariants(normalized)]) {
    push(base);
    push(toTitleCase(base));
    push(base.toUpperCase());
    push(base.toLowerCase());
    for (const accented of withSpanishAccentVariants(base)) {
      push(accented);
      push(toTitleCase(accented));
      push(accented.toUpperCase());
    }
  }

  return out.slice(0, 10);
}

/**
 * Semillas de TIPO (query + sinónimos + corrección). Usar para filtrar/score.
 * No incluye marcas de categoría ni stopwords sueltos.
 */
export function expandSearchTypeSeeds(query: string): string[] {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (raw.length < 2) return [];

  const normalized = normalizeSearchText(raw);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    const v = normalizeSearchText(value ?? '');
    if (!v || seen.has(v)) return;
    // Permitir dígitos de marca ("9") aunque sean cortos.
    if (v.length < 2 && !/^\d+[a-z]?$/.test(v)) return;
    seen.add(v);
    out.push(v);
  };

  push(normalized);
  // Compacto para marcas: "9deoro"
  const compact = normalized.replace(/\s+/g, '');
  if (compact.length >= 4 && compact !== normalized) push(compact);

  const significant = significantSearchTokens(normalized);
  // Frase/marca multi-token: no expandir a "oro" suelto (trae aceite de oro, etc.).
  if (significant.length >= 2) {
    return out.slice(0, 8);
  }

  for (const token of significant) {
    push(token);
    if (token.length >= 3) {
      // Sinónimos de catálogo sí; autocorrección NO (pepas↛pepsi en seeds).
      for (const syn of PRODUCT_SEARCH_SYNONYMS[token] ?? []) {
        push(syn);
      }
    }
  }

  return out.slice(0, 16);
}

/**
 * Semillas semánticas = tipo + pocas marcas locales.
 * Firestore usa solo tipo (ver expandSearchRemoteVariants).
 */
export function expandSearchSemanticSeeds(query: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    const v = normalizeSearchText(value ?? '');
    if (!v || seen.has(v)) return;
    if (v.length < 2 && !/^\d+[a-z]?$/.test(v)) return;
    seen.add(v);
    out.push(v);
  };

  for (const seed of expandSearchTypeSeeds(query)) {
    push(seed);
  }

  for (const token of significantSearchTokens(query)) {
    for (const brand of (CATEGORY_RELATED_BRANDS[token] ?? []).slice(0, 5)) {
      push(brand);
    }
  }

  return out.slice(0, 10);
}

/** Variantes remotas: preciso + casings/tildes para marcas. */
export function expandSearchRemoteVariants(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];

  const tokens = significantSearchTokens(normalized);

  // Marca / frase de marca: muchas casings, sin sinónimos de categoría.
  if (tokens.length >= 2 || isLikelyBrandQuery(query)) {
    return expandFirestoreCasingVariants(query).slice(0, 8);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const title = toTitleCase(value);
    if (title.length < 2 || seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());
    out.push(title);
  };

  push(normalized);

  const token = tokens[0] ?? normalized;
  // Sinónimos ya son estrechos (pepa↔pepas, no pepas→galletitas).
  for (const syn of PRODUCT_SEARCH_SYNONYMS[token] ?? []) {
    if (out.length >= 3) break;
    push(syn);
  }

  return out.slice(0, 3);
}

/**
 * Match nombre y/o marca (buscador tipo súper).
 */
export function productMatchesSearchQuery(
  productName: string,
  brand: string | null | undefined,
  query: string
): boolean {
  if (titleMatchesSearchQueryExpanded(productName, query)) return true;
  if (brand && titleMatchesSearchQueryExpanded(brand, query)) return true;

  const q = normalizeSearchText(query);
  const name = normalizeSearchText(productName);
  const brandNorm = brand ? normalizeSearchText(brand) : '';
  if (isLikelyBrandQuery(query) && q.length >= 3) {
    if (brandNorm && (brandNorm === q || brandNorm.startsWith(q) || q.startsWith(brandNorm))) {
      return true;
    }
    if (hasWholeWord(name, q) || name.split(' ').some((w) => w.startsWith(q))) {
      return true;
    }
  }

  const combined = `${productName} ${brand ?? ''}`.trim();
  if (combined !== productName && titleMatchesSearchQueryExpanded(combined, query)) {
    return true;
  }
  return false;
}

/**
 * Score tipo súper: marca exacta > prefijo marca > nombre > sinónimos estrechos.
 */
export function scoreProductSearchMatch(
  productName: string,
  brand: string | null | undefined,
  query: string
): number {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(productName);
  const brandNorm = brand ? normalizeSearchText(brand) : '';

  if (!q) return 0;

  if (brandNorm) {
    if (brandNorm === q) return 110;
    if (brandNorm.startsWith(q) && q.length >= 3) return 102;
    if (q.startsWith(brandNorm) && brandNorm.length >= 3) return 98;
    if (hasWholeWord(brandNorm, q) || (q.length >= 3 && brandNorm.includes(q))) {
      const brandScore = scoreProductNameMatchExpanded(brand!, query);
      if (brandScore > 0) return Math.max(brandScore + 8, 88);
    }
  }

  if (isLikelyBrandQuery(query) && q.length >= 3) {
    if (hasWholeWord(name, q)) return 92;
    if (name.split(' ').some((w) => w.startsWith(q))) return 86;
  }

  const nameScore = scoreProductNameMatchExpanded(productName, query);
  if (nameScore > 0) return nameScore;

  if (brand) {
    const brandScore = scoreProductNameMatchExpanded(brand, query);
    if (brandScore > 0) return brandScore;
  }

  return 0;
}

/**
 * Variantes para Firestore (case-sensitive) + tokens sueltos + sinónimos.
 * "coca cola" → coca cola / Coca Cola / COCA COLA / coca / cola…
 * "hamburguesa" → Hamburguesa / Paty / Medallon / Burger…
 */
export function expandProductSearchQueries(query: string): string[] {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (raw.length < 2) return [];

  const semantic = expandSearchSemanticSeeds(raw);
  const seeds = [raw, ...semantic].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const v = value.trim();
    if (v.length < 2) return;
    for (const variant of [v, v.toLowerCase(), v.toUpperCase(), toTitleCase(v)]) {
      if (seen.has(variant)) continue;
      seen.add(variant);
      out.push(variant);
    }
  };

  for (const seed of seeds) {
    push(seed);
    const compact = seed.replace(/\s+/g, '');
    if (compact.length >= 4) push(compact);
    push(seed.replace(/\s+/g, '-'));
  }

  return out.slice(0, 24);
}

export function scoreProductNameMatch(productName: string, query: string): number {
  const name = normalizeSearchText(productName);
  const term = normalizeSearchText(query);
  if (!name || !term) return 0;
  if (!passesSearchRelevanceFilter(productName, query)) return 0;
  // Prefijo al tipeár + estricto cuando la query ya es palabra completa.
  if (!titlePrefixMatchesSearchQuery(productName, query)) return 0;

  if (name === term) return 100;
  if (name.startsWith(term)) return 90;
  if (name.includes(term)) return 75;

  const tokens = term.split(' ').filter((t) => t.length >= 2);
  if (tokens.length === 0) return 0;
  if (tokens.every((t) => hasWholeWord(name, t))) return 70;
  // Prefijo de palabra (ej. "lec" en "leche")
  if (tokens.every((t) => tokenHitsNameWord(name, t))) return 60;
  return 0;
}

/**
 * Score primario + sinónimos de TIPO (no marcas).
 * Evita que "Paladini jamón" puntúe al buscar "hamburguesa".
 */
export function scoreProductNameMatchExpanded(
  productName: string,
  query: string
): number {
  if (!passesSearchRelevanceFilter(productName, query)) return 0;

  const primary = scoreProductNameMatch(productName, query);
  if (primary > 0) return primary;

  let best = 0;
  const primaryNorm = normalizeSearchText(query);
  for (const seed of expandSearchTypeSeeds(query)) {
    if (seed === primaryNorm) continue;
    if (!passesSearchRelevanceFilter(productName, seed)) continue;
    const score = scoreProductNameMatch(productName, seed);
    if (score <= 0) continue;
    best = Math.max(best, Math.min(score, 68));
  }
  return best;
}

/** True si el nombre matchea la query o un sinónimo de tipo. */
export function titleMatchesSearchQueryExpanded(
  productName: string,
  query: string
): boolean {
  if (!passesSearchRelevanceFilter(productName, query)) return false;
  if (titlePrefixMatchesSearchQuery(productName, query)) return true;
  return expandSearchTypeSeeds(query).some(
    (seed) =>
      passesSearchRelevanceFilter(productName, seed) &&
      titlePrefixMatchesSearchQuery(productName, seed)
  );
}
