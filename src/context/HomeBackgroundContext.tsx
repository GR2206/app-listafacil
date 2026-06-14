import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchHomeAppManifest,
  getStartupHomeAppManifest,
  prefetchHomeBackgroundImage,
  wasRemoteHomeAppManifestUsed,
} from '@/services/homeBackgroundManager';
import type { HomeAppManifest } from '@/types/homeBackground';

interface HomeBackgroundContextValue {
  isLoading: boolean;
  isReady: boolean;
  usedFallbackManifest: boolean;
  manifest: HomeAppManifest | null;
  homeBackgroundUrl: string | null;
  reload: () => Promise<void>;
}

const HomeBackgroundContext = createContext<HomeBackgroundContextValue | null>(null);

const startupManifest = getStartupHomeAppManifest();

export function HomeBackgroundProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(startupManifest === null);
  const [isReady, setIsReady] = useState(startupManifest !== null);
  const [usedFallbackManifest, setUsedFallbackManifest] = useState(
    startupManifest ? !wasRemoteHomeAppManifestUsed() : true
  );
  const [manifest, setManifest] = useState<HomeAppManifest | null>(startupManifest);

  const load = useCallback(async () => {
    const hadCache = getStartupHomeAppManifest() !== null;

    if (!hadCache) {
      setIsLoading(true);
      setIsReady(false);
    }

    try {
      const { manifest: nextManifest, fromRemote } = await fetchHomeAppManifest();
      setManifest(nextManifest);
      setUsedFallbackManifest(!fromRemote);
      if (!hadCache) {
        await prefetchHomeBackgroundImage(nextManifest);
      }
    } catch {
      const { manifest: nextManifest } = await fetchHomeAppManifest();
      setManifest(nextManifest);
      setUsedFallbackManifest(true);
    } finally {
      setIsReady(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({
      isLoading,
      isReady,
      usedFallbackManifest,
      manifest,
      homeBackgroundUrl: manifest?.homeBackgroundUrl ?? null,
      reload: load,
    }),
    [isLoading, isReady, usedFallbackManifest, manifest, load]
  );

  return (
    <HomeBackgroundContext.Provider value={value}>{children}</HomeBackgroundContext.Provider>
  );
}

export function useHomeBackground(): HomeBackgroundContextValue {
  const context = useContext(HomeBackgroundContext);

  if (!context) {
    throw new Error('useHomeBackground debe usarse dentro de HomeBackgroundProvider');
  }

  return context;
}
