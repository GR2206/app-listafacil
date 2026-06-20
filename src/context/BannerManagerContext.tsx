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
  fetchBannerManifest,
  getStartupBannerManifest,
  prefetchManifestImages,
  resolveBannerSlot,
  wasRemoteBannerManifestUsed,
} from '@/services/bannerManager';
import type { BannerManifest, BannerSlotId, ResolvedBanner } from '@/types/banner';

interface BannerManagerContextValue {
  isLoading: boolean;
  isReady: boolean;
  usedFallbackManifest: boolean;
  manifest: BannerManifest | null;
  getBanner: (slot: BannerSlotId) => ResolvedBanner;
  reload: () => Promise<void>;
}

const BannerManagerContext = createContext<BannerManagerContextValue | null>(null);

const startupManifest = getStartupBannerManifest();

export function BannerManagerProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(startupManifest === null);
  const [isReady, setIsReady] = useState(startupManifest !== null);
  const [usedFallbackManifest, setUsedFallbackManifest] = useState(
    startupManifest ? !wasRemoteBannerManifestUsed() : true
  );
  const [manifest, setManifest] = useState<BannerManifest | null>(startupManifest);

  const load = useCallback(async (forceRefresh = false) => {
    if (!getStartupBannerManifest()) {
      setIsLoading(true);
      setIsReady(false);
    }

    try {
      const { manifest: nextManifest, fromRemote } = await fetchBannerManifest({
        forceRefresh,
      });
      setManifest(nextManifest);
      setUsedFallbackManifest(!fromRemote);
      await prefetchManifestImages(nextManifest);
    } catch {
      const { manifest: nextManifest } = await fetchBannerManifest({ forceRefresh: true });
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

  const getBanner = useCallback(
    (slot: BannerSlotId): ResolvedBanner => {
      if (!manifest) {
        return resolveBannerSlot(
          {
            version: 1,
            banners: {
              top_banner: { enabled: true },
              bottom_banner: { enabled: true },
              list_banner: { enabled: true },
            },
          },
          slot,
          true
        );
      }

      return resolveBannerSlot(manifest, slot);
    },
    [manifest]
  );

  const value = useMemo(
    () => ({
      isLoading,
      isReady,
      usedFallbackManifest,
      manifest,
      getBanner,
      reload: () => load(true),
    }),
    [isLoading, isReady, usedFallbackManifest, manifest, getBanner, load]
  );

  return (
    <BannerManagerContext.Provider value={value}>{children}</BannerManagerContext.Provider>
  );
}

export function useBannerManager(): BannerManagerContextValue {
  const context = useContext(BannerManagerContext);

  if (!context) {
    throw new Error('useBannerManager debe usarse dentro de BannerManagerProvider');
  }

  return context;
}
