import { useEffect, useRef, useState } from 'react';

import type { CartLine } from '@/types';

export type PriceChangeDirection = 'up' | 'down';

export function usePriceChangeHints(items: CartLine[]) {
  const previousPricesRef = useRef<Record<string, number>>({});
  const [hints, setHints] = useState<Record<string, PriceChangeDirection>>({});

  useEffect(() => {
    const nextHints: Record<string, PriceChangeDirection> = {};

    for (const item of items) {
      const previous = previousPricesRef.current[item.id];
      const current = item.unitPrice;

      if (
        previous !== undefined &&
        previous > 0 &&
        current > 0 &&
        current !== previous
      ) {
        nextHints[item.id] = current < previous ? 'down' : 'up';
      }

      if (current > 0) {
        previousPricesRef.current[item.id] = current;
      }
    }

    if (Object.keys(nextHints).length > 0) {
      setHints((current) => ({ ...current, ...nextHints }));

      const timer = setTimeout(() => {
        setHints((current) => {
          const updated = { ...current };
          for (const id of Object.keys(nextHints)) {
            delete updated[id];
          }
          return updated;
        });
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      previousPricesRef.current = {};
      setHints({});
    }
  }, [items.length]);

  return hints;
}
