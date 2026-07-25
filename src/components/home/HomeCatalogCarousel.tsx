import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  fetchOfertaDiaManifest,
  filterOfertaDiaForZone,
  getStartupOfertaDiaManifest,
  pickTopOfertasForCarousel,
  prefetchOfertaDiaImages,
} from '@/services/ofertaDiaManager';
import { useCartStore } from '@/store/cartStore';
import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import { getAppSetting } from '@/db/database';
import { SupermarketLogoBadge } from '@/components/home/SupermarketLogoBadge';
import { getSupermarketNeonColor } from '@/components/home/supermarketOrbTheme';
import type { OfertaDiaItem } from '@/types/ofertaDia';
import type { Product } from '@/types';
import { logSupermarketClick } from '@/services/analytics';
import { recordSupermarketVisit } from '@/services/favoriteSupermarket';
import { withClickSound } from '@/utils/withClickSound';
import { fireInstantFeedback } from '@/utils/fireInstantFeedback';
import { homeColors } from '@/theme/home';
import { colors, radii, spacing } from '@/theme';

/** Franja de alta visibilidad: ~23% (rango 20–25%). */
const CAROUSEL_HEIGHT_RATIO = 0.23;
const CAROUSEL_HEIGHT_MIN = 168;
const CAROUSEL_HEIGHT_MAX = 236;
const SIDE_INSET = spacing.sm;
const CTA_RED = colors.danger;
const LOGO_BADGE_SIZE = 44;

function formatPriceLabel(precio: string): string {
  const digits = precio.replace(/[^\d]/g, '');
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n)) return `$${precio}`;
  return `$${n.toLocaleString('es-AR')}`;
}

function resolveSupermarket(item: OfertaDiaItem): { id: string; name: string } | null {
  const id = item.supermarketId?.trim();
  if (!id) return null;
  const known = MOCK_SUPERMARKETS.find((m) => m.id === id);
  return {
    id,
    name: item.supermarketName?.trim() || known?.name || id,
  };
}

function toCartProduct(item: OfertaDiaItem, supermarketId: string): Product | null {
  const price = Number(String(item.precio).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(price) || price <= 0) return null;

  const barcode = item.barcode?.trim() || `oferta-${item.id}`;
  return {
    id: barcode,
    barcode,
    name: item.titulo.trim(),
    imageUrl: item.imagen || undefined,
    price: Math.round(price),
    supermarketId,
  };
}

export function HomeCatalogCarousel() {
  const router = useRouter();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const addProduct = useCartStore((s) => s.addProduct);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const startup = getStartupOfertaDiaManifest();
  const [items, setItems] = useState<OfertaDiaItem[]>(() =>
    pickTopOfertasForCarousel(startup?.oferta_dia ?? [])
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    const [{ manifest }, zoneSetting] = await Promise.all([
      fetchOfertaDiaManifest({ forceRefresh }),
      getAppSetting(SELECTED_ZONE_SETTING_KEY),
    ]);
    const filtered = filterOfertaDiaForZone(manifest, zoneSetting);
    const top = pickTopOfertasForCarousel(filtered.oferta_dia);
    setItems(top);
    // Solo precargar las 10 del carrusel (no las 500 del feed).
    await prefetchOfertaDiaImages({ oferta_dia: top });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') void load(false);
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [load]);

  const carouselHeight = Math.round(
    Math.min(
      CAROUSEL_HEIGHT_MAX,
      Math.max(CAROUSEL_HEIGHT_MIN, screenHeight * CAROUSEL_HEIGHT_RATIO)
    )
  );
  const slideWidth = screenWidth;
  const cardWidth = screenWidth - SIDE_INSET * 2;

  const sumarALista = useCallback(
    async (item: OfertaDiaItem) => {
      const market = resolveSupermarket(item);
      if (!market) return;

      const product = toCartProduct(item, market.id);
      if (!product) return;

      setAddingId(item.id);
      try {
        fireInstantFeedback({ sound: 'click', haptic: 'medium' });
        void logSupermarketClick(market.id, market.name, 'oferta_dia');
        void recordSupermarketVisit(market.id);
        await setSupermarket(market.id, market.name);
        addProduct(product);
        router.push({
          pathname: '/cart',
          params: { supermarketId: market.id, name: market.name },
        });
      } finally {
        setAddingId(null);
      }
    },
    [addProduct, router, setSupermarket]
  );

  const renderSlide = useCallback(
    (item: OfertaDiaItem) => {
      const priceLabel = formatPriceLabel(item.precio);
      const market = resolveSupermarket(item);
      const busy = addingId === item.id;
      const canAdd = Boolean(market && toCartProduct(item, market.id));
      const neon = market
        ? getSupermarketNeonColor(market.id)
        : homeColors.bannerPremiumBorder;

      return (
        <View
          key={`oferta-${item.id}-${item.barcode || item.titulo}`}
          style={[styles.slidePage, { width: slideWidth, height: carouselHeight }]}
        >
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                height: carouselHeight - 8,
                borderColor: neon,
                shadowColor: neon,
              },
            ]}
          >
            {item.imagen ? (
              <Image
                source={{ uri: item.imagen }}
                style={styles.cardImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={180}
              />
            ) : (
              <View style={styles.cardFallback}>
                <View style={styles.fallbackGlow} />
              </View>
            )}

            <View style={styles.cardScrim} />

            <View style={styles.badgeRow} pointerEvents="none">
              <View style={styles.badgeLeft}>
                <View style={styles.ganchoBadge}>
                  <Text style={styles.ganchoText} numberOfLines={1}>
                    {item.gancho}
                  </Text>
                </View>
                <View style={styles.urgenciaBadge}>
                  <Text style={styles.urgenciaText} numberOfLines={1}>
                    {item.urgencia}
                  </Text>
                </View>
              </View>

              {market ? (
                <SupermarketLogoBadge
                  marketId={market.id}
                  size={LOGO_BADGE_SIZE}
                  accessibilityLabel={`Oferta de ${market.name}`}
                />
              ) : null}
            </View>

            <View style={styles.cardCopy}>
              <Text style={styles.title} numberOfLines={2}>
                {item.titulo}
              </Text>

              <View style={styles.metaRow}>
                {priceLabel ? <Text style={styles.price}>{priceLabel}</Text> : <View />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.cta}. ${item.titulo}. ${priceLabel}${
                    market ? `. ${market.name}` : ''
                  }`}
                  accessibilityHint="Suma el producto a tu lista y abre el carrito"
                  disabled={!canAdd || busy}
                  onPress={withClickSound(() => void sumarALista(item))}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    (!canAdd || busy) && styles.ctaDisabled,
                    pressed && canAdd && styles.ctaPressed,
                  ]}
                >
                  <Text style={styles.ctaText}>{busy ? 'Sumando…' : item.cta}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [addingId, cardWidth, carouselHeight, slideWidth, sumarALista]
  );

  if (items.length === 0) return null;

  return (
    <View
      style={[styles.shell, { width: screenWidth, height: carouselHeight + 18 }]}
      accessibilityRole="adjustable"
      accessibilityLabel="Catálogo del día. Deslizá horizontalmente para explorar."
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces
        overScrollMode="never"
        style={{ width: screenWidth }}
        nestedScrollEnabled
        directionalLockEnabled
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
          if (next !== activeIndex && next >= 0 && next < items.length) {
            setActiveIndex(next);
          }
        }}
        scrollEventThrottle={16}
      >
        {items.map((item) => renderSlide(item))}
      </ScrollView>

      <View style={styles.footerRow} pointerEvents="none">
        <Text style={styles.hint}>Deslizá para explorar</Text>
        <View style={styles.dots}>
          {items.map((item, index) => (
            <View
              key={`dot-${item.id}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  slidePage: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: homeColors.surfaceElevated,
    borderWidth: 2.5,
    borderColor: homeColors.bannerPremiumBorder,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#07111C',
  },
  fallbackGlow: {
    position: 'absolute',
    width: '70%',
    height: '80%',
    top: '10%',
    left: '15%',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 8, 16, 0.55)',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 2,
  },
  badgeLeft: {
    flex: 1,
    gap: 6,
    maxWidth: '72%',
  },
  ganchoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: CTA_RED,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  ganchoText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  urgenciaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  urgenciaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE08A',
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: homeColors.text,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaButton: {
    backgroundColor: CTA_RED,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    minHeight: 40,
    justifyContent: 'center',
    shadowColor: CTA_RED,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerRow: {
    marginTop: 6,
    paddingHorizontal: SIDE_INSET + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: {
    fontSize: 11,
    fontWeight: '700',
    color: homeColors.textMuted,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(140, 180, 217, 0.35)',
  },
  dotActive: {
    width: 16,
    backgroundColor: homeColors.neonBlue,
  },
});
