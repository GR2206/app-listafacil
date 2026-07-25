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
];

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
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
  return words.some((w) => w === token || w.startsWith(token));
}

/**
 * Match al tipeár: acepta prefijos de palabra ("lec" → "leche").
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
    const tokens = q.split(' ').filter((t) => t.length >= 2);
    if (tokens.length === 1 && STAPLE_VARIANT_BLOCKERS[tokens[0]]) {
      return !hasStapleVariantBlocker(name, q);
    }
    return true;
  }

  const tokens = q.split(' ').filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
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

  // "cocacola" ↔ "coca cola"
  if (qCompact.length >= 4 && nameCompact.includes(qCompact)) {
    return !hasStapleVariantBlocker(name, q);
  }

  const tokens = q.split(' ').filter((t) => t.length >= 2);
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
  if (word.length <= 3) return 1;
  if (word.length <= 6) return 2;
  return 2;
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

/**
 * Variantes para Firestore (case-sensitive) + tokens sueltos.
 * "coca cola" → coca cola / Coca Cola / COCA COLA / coca / cola…
 */
export function expandProductSearchQueries(query: string): string[] {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (raw.length < 2) return [];

  const normalized = normalizeSearchText(raw);
  const corrected = suggestCorrectedQuery(raw);
  const seeds = [raw, normalized, corrected].filter(
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
    // Coca-Cola estilo
    push(seed.replace(/\s+/g, '-'));
  }

  // Tokens individuales (mín. 3) — “coca cola” también busca “coca” y “cola”.
  const tokens = normalized.split(' ').filter((t) => t.length >= 3);
  for (const token of tokens) {
    push(token);
    const fix = suggestLexiconWord(token);
    if (fix) push(fix);
  }

  return out.slice(0, 18);
}

export function scoreProductNameMatch(productName: string, query: string): number {
  const name = normalizeSearchText(productName);
  const term = normalizeSearchText(query);
  if (!name || !term) return 0;
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
