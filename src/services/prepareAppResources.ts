import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { InteractionManager } from 'react-native';

import { fetchBannerManifest, prefetchManifestImages } from '@/services/bannerManager';
import {
  fetchHomeAppManifest,
  prefetchAppLogoImage,
  prefetchHomeBackgroundImage,
} from '@/services/homeBackgroundManager';
import {
  fetchOfertaDiaManifest,
  pickTopOfertasForCarousel,
  prefetchOfertaDiaImages,
} from '@/services/ofertaDiaManager';
import { fetchPromosBancariasManifest } from '@/services/promosBancariasManager';
import { ensureZoneOnLaunch } from '@/services/ensureZoneOnLaunch';
import { syncPromoPushNotifications } from '@/services/promoPushNotifications';
import { preloadAppFonts } from '@/services/preloadAppFonts';
import { seedMockCatalog } from '@/db/seed';
import { getAppSetting } from '@/db/database';
import { areSoundsPreloaded, preloadSounds } from '@/services/playSound';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';

import { APP_TECH_BACKGROUND } from '@/components/layout/AppBackground';
import { HOME_SCREEN_BACKGROUND_FALLBACK } from '@/components/home/HomeTexturedBackground';

const SPLASH_LOGO = require('../../assets/logo_redondeado.png');

async function preloadVisualAssets(): Promise<void> {
  await Asset.loadAsync([SPLASH_LOGO, APP_TECH_BACKGROUND, HOME_SCREEN_BACKGROUND_FALLBACK]);
  await Promise.all([
    Image.loadAsync(SPLASH_LOGO),
    Image.loadAsync(APP_TECH_BACKGROUND),
    Image.loadAsync(HOME_SCREEN_BACKGROUND_FALLBACK),
  ]);
}

/** Solo lo imprescindible para pintar el home (sin red pesada ni GPS). */
async function prepareCriticalDatabase(hydrate: () => Promise<void>): Promise<void> {
  await seedMockCatalog();
  await hydrate();
}

/**
 * Recursos secundarios: no bloquean el splash.
 * Se disparan en background apenas el home puede mostrarse.
 */
function warmSecondaryResources(hydrateMerchantAuth: () => Promise<void>): void {
  const run = () => {
    void hydrateMerchantAuth().catch(() => undefined);

    if (!areSoundsPreloaded()) {
      void preloadSounds().catch(() => undefined);
    }

    void (async () => {
      try {
        const { manifest } = await fetchHomeAppManifest();
        await Promise.all([
          prefetchHomeBackgroundImage(manifest),
          prefetchAppLogoImage(manifest),
        ]);
      } catch {
        // fallback local
      }
    })();

    void (async () => {
      try {
        const { manifest } = await fetchBannerManifest();
        await prefetchManifestImages(manifest);
      } catch {
        // ignore
      }
    })();

    void (async () => {
      try {
        const { manifest } = await fetchOfertaDiaManifest();
        // Solo top del carrusel (no las ~3000 imágenes).
        const top = pickTopOfertasForCarousel(manifest.oferta_dia, 10);
        await prefetchOfertaDiaImages({ ...manifest, oferta_dia: top });
      } catch {
        // ignore
      }
    })();

    void (async () => {
      try {
        await ensureZoneOnLaunch().catch(() => undefined);
        const zone = await getAppSetting(SELECTED_ZONE_SETTING_KEY);
        const { manifest } = await fetchPromosBancariasManifest();
        await syncPromoPushNotifications({ zone, manifest });
      } catch {
        // ignore
      }
    })();
  };

  InteractionManager.runAfterInteractions(() => {
    // Un tick extra para no pelear con el primer paint.
    setTimeout(run, 0);
  });
}

/**
 * Arranque rápido: fuentes + splash local + SQLite/carrito.
 * Banners, ofertas, promos, sonidos y GPS se calientan después.
 */
export async function prepareAppResources(
  hydrate: () => Promise<void>,
  hydrateMerchantAuth: () => Promise<void>
): Promise<void> {
  await Promise.all([
    preloadAppFonts(),
    preloadVisualAssets(),
    prepareCriticalDatabase(hydrate),
  ]);

  warmSecondaryResources(hydrateMerchantAuth);
}

export const splashAssets = {
  logo: SPLASH_LOGO,
};
