/**
 * Extrae el TIPO de producto para buscar un similar de otra marca.
 * Ej: "Mate Cocido Playadito" → tipo "mate cocido" (nunca buscar solo "playadito").
 */

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'con',
  'sin',
  'para',
  'por',
  'y',
  'o',
  'en',
  'al',
  'x',
  'kg',
  'g',
  'gr',
  'gramo',
  'gramos',
  'ml',
  'cc',
  'lt',
  'l',
  'litro',
  'litros',
  'pack',
  'paq',
  'paquete',
  'paquetes',
  'unidad',
  'unidades',
  'u',
  'ud',
  'uds',
  'nuevo',
  'nueva',
  'light',
  'zero',
  'clasico',
  'clasica',
  'tradicional',
  'suave',
  'fuerte',
]);

/** Frases de tipo de producto frecuentes (orden: más largas primero). */
const COMPOUND_PRODUCT_TYPES = [
  'mate cocido',
  'yerba mate',
  'leche entera',
  'leche descremada',
  'leche parcial',
  'aceite mezcla',
  'aceite girasol',
  'aceite oliva',
  'agua mineral',
  'agua saborizada',
  'papel higienico',
  'jabon liquido',
  'jabon en polvo',
  'arroz largo',
  'arroz fino',
  'fideos spaghetti',
  'fideos tallarin',
  'fideos mostachol',
  'fideos fusilli',
  'fideos codos',
  'pure de tomate',
  'salsa de tomate',
  'crema de leche',
  'dulce de leche',
  'gaseosa cola',
  'pan lactal',
  'pan integral',
  'pan mesa',
  'yogurt entero',
  'yogurt cremoso',
  'yogurt vainilla',
  'atun desmenuzado',
  'atun natural',
  'limpiador en crema',
  'empanada pollo',
  'empanada carne',
  'hamburguesa clasica',
  'aritos de miel',
];

export interface SimilarProductQuery {
  /** Frase/tipo a buscar en catálogo, ej. "mate cocido". */
  searchQueries: string[];
  /** Todas deben aparecer en el candidato (mismo tipo de producto). */
  requiredTokens: string[];
  /** Tokens de marca a NO usar como búsqueda y a preferir evitar. */
  brandTokens: string[];
}

export function normalizeSimilarText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function isSizeOrNumberToken(token: string): boolean {
  if (/^\d+$/.test(token)) return true;
  if (/^\d+[a-z]+$/.test(token)) return true;
  if (/^[a-z]+\d+$/.test(token)) return true;
  return false;
}

function tokenize(value: string): string[] {
  return normalizeSimilarText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function expandPluralVariants(token: string): string[] {
  if (token.length < 3) return [token];
  if (token.endsWith('es') && token.length > 4) {
    return [token, token.slice(0, -2)];
  }
  if (token.endsWith('s') && token.length > 3) {
    return [token, token.slice(0, -1)];
  }
  return [token, `${token}s`];
}

function detectBrandTokens(name: string, brand?: string): string[] {
  const fromField = brand
    ? tokenize(brand).filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !isSizeOrNumberToken(w))
    : [];

  if (fromField.length > 0) return [...new Set(fromField)];

  // Si no hay marca en el campo, el último token “largo” suele ser la marca
  // (ej. "mate cocido playadito" → playadito).
  const words = tokenize(name).filter(
    (w) => !STOPWORDS.has(w) && !isSizeOrNumberToken(w) && w.length >= 4
  );
  if (words.length < 2) return [];
  return [words[words.length - 1]];
}

function findCompoundType(normalizedName: string): string | null {
  for (const phrase of COMPOUND_PRODUCT_TYPES) {
    if (normalizedName.includes(phrase)) return phrase;
  }
  return null;
}

/**
 * Arma la consulta de similar: mismo tipo de producto, otra marca.
 */
export function extractSimilarProductQuery(name: string, brand?: string): SimilarProductQuery {
  const normalized = normalizeSimilarText(name);
  if (!normalized) {
    return { searchQueries: [], requiredTokens: [], brandTokens: [] };
  }

  const brandTokens = detectBrandTokens(name, brand);
  const brandSet = new Set(brandTokens);

  const compound = findCompoundType(normalized);
  if (compound) {
    const requiredTokens = compound.split(' ').filter(Boolean);
    return {
      searchQueries: [compound, ...requiredTokens],
      requiredTokens,
      brandTokens,
    };
  }

  let words = tokenize(name).filter((word) => {
    if (STOPWORDS.has(word)) return false;
    if (isSizeOrNumberToken(word)) return false;
    if (word.length < 3) return false;
    if (brandSet.has(word)) return false;
    return true;
  });

  // Si al sacar la marca no queda nada, no inventar búsqueda por marca.
  if (words.length === 0) {
    return { searchQueries: [], requiredTokens: [], brandTokens };
  }

  // Tipo = primeras 1–2 palabras no-marca (mate cocido, fideos, leche…).
  const typeTokens = words.slice(0, Math.min(2, words.length));
  const searchQueries: string[] = [];

  if (typeTokens.length >= 2) {
    searchQueries.push(typeTokens.join(' '));
  }
  for (const token of typeTokens) {
    for (const variant of expandPluralVariants(token)) {
      if (!searchQueries.includes(variant)) searchQueries.push(variant);
    }
  }
  // Fallback más amplio: primer token solo (mejora cobertura).
  if (typeTokens.length >= 2 && !searchQueries.includes(typeTokens[0])) {
    searchQueries.push(typeTokens[0]);
  }

  return {
    searchQueries,
    requiredTokens: typeTokens,
    brandTokens,
  };
}

/** @deprecated Usar extractSimilarProductQuery. */
export function extractSimilarSearchTokens(name: string, brand?: string): string[] {
  return extractSimilarProductQuery(name, brand).searchQueries;
}

export function candidateMatchesProductType(
  candidateName: string,
  requiredTokens: string[]
): boolean {
  if (requiredTokens.length === 0) return false;
  const name = normalizeSimilarText(candidateName);
  const allMatch = requiredTokens.every((token) => {
    const variants = expandPluralVariants(token);
    return variants.some((variant) => name.includes(variant));
  });
  if (allMatch) return true;
  // Con ≥2 tokens: aceptar el tipo genérico (1º) para no dejar huecos.
  if (requiredTokens.length < 2) return false;
  return expandPluralVariants(requiredTokens[0]).some((variant) => name.includes(variant));
}

export function candidateSharesBrand(candidateName: string, brandTokens: string[]): boolean {
  if (brandTokens.length === 0) return false;
  const name = normalizeSimilarText(candidateName);
  return brandTokens.some((token) => name.includes(token));
}
