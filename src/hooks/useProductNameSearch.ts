import { useEffect, useMemo, useRef, useState } from 'react';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import { getDatabase } from '@/db/database';
import {
  peekInstantCatalogResults,
  prefetchProductThumbs,
  searchCatalogProducts,
} from '@/services/catalogProductSearch';
import type { Product } from '@/types';
import { normalizeSearchText } from '@/utils/productSearchQuery';
import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { useSelectedZone } from '@/hooks/useSelectedZone';

const DEBOUNCE_MS = 70;
const MIN_CHARS = 2;
const MAX_RESULTS = 16;

function pickPivotSupermarketId(zoneSetting: string | null): string {
  const zoneMarkets = getSupermarketsForZone(zoneSetting);
  if (zoneMarkets[0]?.id) return zoneMarkets[0].id;

  const national =
    MOCK_SUPERMARKETS.find((m) => m.id === 'carrefour') ??
    MOCK_SUPERMARKETS.find((m) => m.id === 'jumbo') ??
    MOCK_SUPERMARKETS[0];
  return national?.id ?? 'carrefour';
}

export function useProductNameSearch(query: string) {
  const zone = useSelectedZone();
  const pivotId = useMemo(() => pickPivotSupermarketId(zone), [zone]);

  const [results, setResults] = useState<Product[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [usedCorrection, setUsedCorrection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const prevNormalizedRef = useRef('');

  const trimmed = query.trim();

  // Abrir SQLite apenas entra a Buscar (evita demora en el 1er keystroke).
  useEffect(() => {
    void getDatabase();
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const normalized = normalizeSearchText(trimmed);

    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setCorrectedQuery(null);
      setUsedCorrection(false);
      setLoading(false);
      setError(null);
      prevNormalizedRef.current = '';
      return;
    }

    setError(null);

    // Instantáneo: caché / prefijo tipado (sin esperar debounce ni red).
    const instant = peekInstantCatalogResults(trimmed, pivotId, MAX_RESULTS);
    if (instant && instant.length > 0) {
      setResults(instant);
      prefetchProductThumbs(instant);
      setLoading(false);
    } else {
      const prev = prevNormalizedRef.current;
      const refining =
        Boolean(prev) &&
        (normalized.startsWith(prev) || prev.startsWith(normalized));
      // Si cambió de producto (leche → coca), limpiar; si sigue tipando, mantener lista.
      if (!refining) setResults([]);
      setLoading(true);
    }
    prevNormalizedRef.current = normalized;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await searchCatalogProducts({
            query: trimmed,
            supermarketId: pivotId,
            maxResults: MAX_RESULTS,
            onPartial: (partial) => {
              if (requestId !== requestIdRef.current) return;
              setResults(partial.slice(0, MAX_RESULTS));
              setLoading(false);
            },
          });
          if (requestId !== requestIdRef.current) return;
          setResults(found.products.slice(0, MAX_RESULTS));
          setCorrectedQuery(found.correctedQuery);
          setUsedCorrection(found.usedCorrection);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setCorrectedQuery(null);
          setUsedCorrection(false);
          setError('No pudimos buscar ahora.');
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmed, pivotId]);

  return {
    results,
    correctedQuery,
    usedCorrection,
    loading,
    error,
    zone,
    minChars: MIN_CHARS,
    canSearch: trimmed.length >= MIN_CHARS,
    maxResults: MAX_RESULTS,
  };
}
