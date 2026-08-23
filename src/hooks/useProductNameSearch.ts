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

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

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
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const prevNormalizedRef = useRef('');

  const trimmed = query.trim();

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
      setEnriching(false);
      setError(null);
      prevNormalizedRef.current = '';
      return;
    }

    setError(null);
    setLoading(true);
    setEnriching(false);

    const instant = peekInstantCatalogResults(trimmed, pivotId);
    if (instant && instant.length > 0) {
      setResults(instant);
      prefetchProductThumbs(instant);
    } else {
      const prev = prevNormalizedRef.current;
      const refining =
        Boolean(prev) &&
        (normalized.startsWith(prev) || prev.startsWith(normalized));
      if (!refining) setResults([]);
    }
    prevNormalizedRef.current = normalized;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await searchCatalogProducts({
            query: trimmed,
            supermarketId: pivotId,
            onPartial: (partial, phase) => {
              if (requestId !== requestIdRef.current) return;
              setResults(partial);
              if (phase === 'local') {
                setEnriching(true);
                // Ya hay algo en pantalla: dejar de mostrar spinner vacío.
                setLoading(false);
              }
            },
          });
          if (requestId !== requestIdRef.current) return;
          setResults(found.products);
          setCorrectedQuery(found.correctedQuery);
          setUsedCorrection(found.usedCorrection);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setCorrectedQuery(null);
          setUsedCorrection(false);
          setError('No pudimos buscar ahora.');
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false);
            setEnriching(false);
          }
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
    /** Todavía enriqueciando catálogo remoto con resultados parciales visibles. */
    enriching,
    searching: loading || enriching,
    error,
    zone,
    minChars: MIN_CHARS,
    canSearch: trimmed.length >= MIN_CHARS,
  };
}
