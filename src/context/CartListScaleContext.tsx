import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CART_SCALE_DEFAULT,
  CART_SCALE_MAX,
  CART_SCALE_MIN,
  CART_SCALE_STEP,
  CART_SCALE_STORAGE_KEY,
  clampCartScale,
  createScaledCartMetrics,
  type ScaledCartMetrics,
} from '@/theme/scaledCartMetrics';

/** Zoom global de la app; los controles A-/A+ viven solo en Mi Lista. */
interface CartListScaleContextValue {
  scale: number;
  metrics: ScaledCartMetrics;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseScale: () => void;
  increaseScale: () => void;
  resetScale: () => void;
  isReady: boolean;
}

const CartListScaleContext = createContext<CartListScaleContextValue | null>(null);

async function readStoredScale(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CART_SCALE_STORAGE_KEY);
    if (!raw) return CART_SCALE_DEFAULT;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return CART_SCALE_DEFAULT;
    return clampCartScale(parsed);
  } catch {
    return CART_SCALE_DEFAULT;
  }
}

async function writeStoredScale(scale: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // Persistencia secundaria; la UI sigue funcionando en memoria.
  }
}

export function CartListScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(CART_SCALE_DEFAULT);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStoredScale();
      if (!cancelled) {
        setScale(stored);
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyScale = useCallback((next: number) => {
    const clamped = clampCartScale(next);
    setScale(clamped);
    void writeStoredScale(clamped);
  }, []);

  const decreaseScale = useCallback(() => {
    applyScale(scale - CART_SCALE_STEP);
  }, [applyScale, scale]);

  const increaseScale = useCallback(() => {
    applyScale(scale + CART_SCALE_STEP);
  }, [applyScale, scale]);

  const resetScale = useCallback(() => {
    applyScale(CART_SCALE_DEFAULT);
  }, [applyScale]);

  const value = useMemo<CartListScaleContextValue>(
    () => ({
      scale,
      metrics: createScaledCartMetrics(scale),
      canDecrease: scale > CART_SCALE_MIN + 0.001,
      canIncrease: scale < CART_SCALE_MAX - 0.001,
      decreaseScale,
      increaseScale,
      resetScale,
      isReady,
    }),
    [scale, decreaseScale, increaseScale, resetScale, isReady]
  );

  return (
    <CartListScaleContext.Provider value={value}>{children}</CartListScaleContext.Provider>
  );
}

export function useCartListScale(): CartListScaleContextValue {
  const ctx = useContext(CartListScaleContext);
  if (!ctx) {
    throw new Error('useCartListScale debe usarse dentro de CartListScaleProvider');
  }
  return ctx;
}
