import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  buildAppLogoImageUri,
  buildHomeBackgroundImageUri,
  fetchHomeAppManifest,
  getStartupHomeAppManifest,
  prefetchAppLogoImage,
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
  appLogoUrl: string | null;
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

  const load = useCallback(async (forceRefresh = false) => {
    if (!getStartupHomeAppManifest()) {
      setIsLoading(true);
      setIsReady(false);
    }

    try {
      const { manifest: nextManifest, fromRemote } = await fetchHomeAppManifest({
        forceRefresh,
      });
      setManifest(nextManifest);
      setUsedFallbackManifest(!fromRemote);
      await Promise.all([
        prefetchHomeBackgroundImage(nextManifest),
        prefetchAppLogoImage(nextManifest),
      ]);
    } catch {
      const { manifest: nextManifest } = await fetchHomeAppManifest({ forceRefresh: true });
      setManifest(nextManifest);
      setUsedFallbackManifest(true);
    } finally {
      setIsReady(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void load(true);
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [load]);

  const homeBackgroundUrl = useMemo(
    () => (manifest ? buildHomeBackgroundImageUri(manifest) : null),
    [manifest]
  );

  const appLogoUrl = useMemo(
    () => (manifest ? buildAppLogoImageUri(manifest) : null),
    [manifest]
  );

  const value = useMemo(
    () => ({
      isLoading,
      isReady,
      usedFallbackManifest,
      manifest,
      homeBackgroundUrl,
      appLogoUrl,
      reload: () => load(true),
    }),
    [isLoading, isReady, usedFallbackManifest, manifest, homeBackgroundUrl, appLogoUrl, load]
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
