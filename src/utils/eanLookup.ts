export function normalizeBarcode(raw: string): string | null {
  const norm = normalizarEAN(raw);
  return norm?.canonical ?? null;
}

export interface EanNormalizationResult {
  /** EAN limpio tal como se escaneó (puede ser 14 dígitos). */
  scanned: string;
  /** EAN canónico para guardar en lista (13 dígitos cuando aplica). */
  canonical: string;
  /** Orden de búsqueda: primero completo, luego fallback sin prefijo. */
  lookupSequence: string[];
  isPrefixEan14: boolean;
  prefixChar?: '5' | '0';
}

/**
 * Normaliza EAN y define la secuencia de búsqueda tolerante a prefijos.
 * EAN-14 con prefijo 5/0: intenta completo y luego los últimos 13 dígitos.
 */
export function normalizarEAN(raw: string): EanNormalizationResult | null {
  const scanned = raw.replace(/\D/g, '');
  if (!scanned) return null;

  if (scanned.length === 14 && (scanned.startsWith('5') || scanned.startsWith('0'))) {
    const last13 = scanned.substring(1);
    return {
      scanned,
      canonical: scanned,
      lookupSequence: uniqueDigitCodes([scanned, last13]),
      isPrefixEan14: true,
      prefixChar: scanned.startsWith('5') ? '5' : '0',
    };
  }

  if (scanned.length === 13) {
    return {
      scanned,
      canonical: scanned,
      lookupSequence: uniqueDigitCodes([scanned]),
      isPrefixEan14: false,
    };
  }

  if (scanned.length === 12) {
    const canonical = `0${scanned}`;
    return {
      scanned,
      canonical,
      lookupSequence: uniqueDigitCodes([scanned, canonical]),
      isPrefixEan14: false,
    };
  }

  if (scanned.length === 8) {
    const canonical = scanned.padStart(13, '0');
    return {
      scanned,
      canonical,
      lookupSequence: uniqueDigitCodes([scanned, canonical]),
      isPrefixEan14: false,
    };
  }

  if (scanned.length === 14) {
    const last13 = scanned.substring(1);
    return {
      scanned,
      canonical: scanned,
      lookupSequence: uniqueDigitCodes([scanned, last13]),
      isPrefixEan14: false,
    };
  }

  return null;
}

function uniqueDigitCodes(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const digits = value.replace(/\D/g, '');
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    result.push(digits);
  }

  return result;
}



/** Variantes por errores comunes del escáner (ej. 5↔7 al inicio). */

export function barcodeLookupVariants(barcode: string): string[] {

  const variants = new Set<string>([barcode]);

  if (barcode.startsWith('7')) variants.add(`5${barcode.slice(1)}`);

  if (barcode.startsWith('5')) variants.add(`7${barcode.slice(1)}`);

  return [...variants];

}



export interface EanCleanupRound {

  round: 1 | 2 | 3;

  label: string;

  candidates: string[];

}



/** Quita ceros de padding a la izquierda sin dejar cadena vacía. */

export function stripLeadingZeroPadding(digits: string): string {

  const trimmed = digits.replace(/^0+/, '');

  return trimmed.length > 0 ? trimmed : digits;

}



function uniqueValidBarcodes(values: string[]): string[] {

  const seen = new Set<string>();

  const result: string[] = [];



  for (const value of values) {

    const digits = value.replace(/\D/g, '');

    if (!digits) continue;



    const candidates = barcodeDocIdCandidates(digits);

    for (const candidate of candidates) {

      if (seen.has(candidate)) continue;

      seen.add(candidate);

      result.push(candidate);

    }

  }



  return result;

}



/**

 * Genera IDs de documento probables en Firestore para un bloque de dígitos.

 * Incluye EAN tal cual, normalizado, sin primer dígito y sin ceros de relleno.

 */

export function barcodeDocIdCandidates(digits: string): string[] {

  const seen = new Set<string>();

  const result: string[] = [];



  const push = (value: string) => {

    const clean = value.replace(/\D/g, '');

    if (!clean || seen.has(clean)) return;

    if (![8, 12, 13, 14].includes(clean.length)) return;

    seen.add(clean);

    result.push(clean);

  };



  push(digits);



  const normalized = normalizeBarcode(digits);

  if (normalized) push(normalized);



  if (digits.length > 1) {

    push(digits.slice(1));

  }



  const stripped = stripLeadingZeroPadding(digits);

  push(stripped);



  if (stripped.length > 1) {

    push(stripped.slice(1));

  }



  if (normalized && normalized.length > 1) {

    push(normalized.slice(1));

    if (normalized.startsWith('0')) {

      push(normalized.slice(1));

    }

  }



  return result;

}



/**

 * Genera hasta 3 rondas de candidatos EAN:

 * 1) código escaneado (completo)

 * 2) con/sin primer dígito y sin ceros de relleno

 * 3) variantes depuradas adicionales

 */

export function buildEanCleanupRounds(raw: string): EanCleanupRound[] {

  const digits = raw.replace(/\D/g, '');

  if (!digits) return [];



  const round1 = uniqueValidBarcodes([digits, raw]);



  const stripped = stripLeadingZeroPadding(digits);

  const withoutFirstDigit = digits.length > 1 ? digits.slice(1) : '';

  const strippedWithoutFirst = stripped.length > 1 ? stripped.slice(1) : '';



  const round2Raw = uniqueValidBarcodes([

    withoutFirstDigit,

    stripped,

    strippedWithoutFirst,

  ]).filter((code) => !round1.includes(code));



  const round3Raw = uniqueValidBarcodes([

    withoutFirstDigit.length > 1 ? withoutFirstDigit.slice(1) : '',

    strippedWithoutFirst.length > 1 ? strippedWithoutFirst.slice(1) : '',

  ]).filter((code) => !round1.includes(code) && !round2Raw.includes(code));



  const rounds: EanCleanupRound[] = [];



  if (round1.length > 0) {

    rounds.push({

      round: 1,

      label: 'Código completo',

      candidates: round1,

    });

  }



  if (round2Raw.length > 0) {

    rounds.push({

      round: 2,

      label: 'Con/sin primer dígito y sin ceros de relleno',

      candidates: round2Raw,

    });

  }



  if (round3Raw.length > 0) {

    rounds.push({

      round: 3,

      label: 'Código depurado extendido',

      candidates: round3Raw,

    });

  }



  return rounds;

}



/** Expande candidatos con variantes 5↔7 y deduplica preservando orden. */

export function expandBarcodeVariants(candidates: string[]): string[] {

  const seen = new Set<string>();

  const expanded: string[] = [];



  for (const candidate of candidates) {

    for (const variant of barcodeLookupVariants(candidate)) {

      if (seen.has(variant)) continue;

      seen.add(variant);

      expanded.push(variant);

    }

  }



  return expanded;

}



export function buildEanLookupSequence(raw: string): EanCleanupRound[] {

  const rounds = buildEanCleanupRounds(raw);

  return rounds.map((entry) => ({

    ...entry,

    candidates: expandBarcodeVariants(entry.candidates),

  }));

}


