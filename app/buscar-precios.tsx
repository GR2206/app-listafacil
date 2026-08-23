import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { SupermarketLogoBadge } from '@/components/home/SupermarketLogoBadge';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { useSelectedZone } from '@/hooks/useSelectedZone';
import { fetchProductByDocId } from '@/services/firebaseProducts';
import {
  fetchOfertaDiaManifest,
  filterOfertaDiaForZone,
} from '@/services/ofertaDiaManager';
import {
  buildProductSupermarketPriceRows,
  filterPromoOrDiscountRows,
  mergeComparisonRowsIntoProduct,
  productToCartPayload,
  type ProductSupermarketPriceRow,
} from '@/services/productPriceComparison';
import { lookupProduct } from '@/services/productLookup';
import { upsertProduct } from '@/db/database';
import { logSupermarketClick } from '@/services/analytics';
import { recordSupermarketVisit } from '@/services/favoriteSupermarket';
import {
  getProductSearchSelection,
  setProductSearchSelection,
} from '@/store/productSearchSelectionStore';
import { useCartStore } from '@/store/cartStore';
import type { OfertaDiaItem } from '@/types/ofertaDia';
import type { Product } from '@/types';
import { homeColors } from '@/theme/home';
import { formatCurrency } from '@/utils/formatCurrency';
import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { withClickSound } from '@/utils/withClickSound';
import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

const SURFACES = {
  card: 'rgba(196, 210, 224, 0.72)',
  cardBorder: 'rgba(150, 174, 196, 0.5)',
  text: '#243548',
  muted: '#5A738A',
  thumb: 'rgba(170, 188, 206, 0.65)',
};

export default function BuscarPreciosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    barcode?: string;
    name?: string;
    onlyOfertas?: string;
  }>();
  const zone = useSelectedZone();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const addProduct = useCartStore((s) => s.addProduct);

  const barcode = (params.barcode ?? '').trim();
  const titleName = (params.name ?? '').trim();
  const onlyOfertas = params.onlyOfertas === '1';

  const [product, setProduct] = useState<Product | null>(() => {
    const selected = getProductSearchSelection();
    if (selected && (!barcode || selected.barcode === barcode)) return selected;
    return null;
  });
  const [ofertaItems, setOfertaItems] = useState<OfertaDiaItem[]>([]);
  const [loading, setLoading] = useState(!product);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { m, MENU_SECTION_GAP } = useMenuContentStyles();
  const markets = useMemo(() => getSupermarketsForZone(zone), [zone]);
  const pivotId = markets[0]?.id ?? product?.supermarketId ?? 'carrefour';

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { manifest } = await fetchOfertaDiaManifest();
      if (cancelled) return;
      setOfertaItems(filterOfertaDiaForZone(manifest, zone).oferta_dia);
    })();

    return () => {
      cancelled = true;
    };
  }, [zone]);

  useEffect(() => {
    let cancelled = false;
    const selected = getProductSearchSelection();

    if (!barcode) {
      if (selected) setProduct(selected);
      setLoading(false);
      return;
    }

    // Mostrar selección al toque, pero siempre hidratar desde Firestore
    // para tener precios de todos los súper (comparación justa).
    if (selected && selected.barcode === barcode) {
      setProduct(selected);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void (async () => {
      const fetched = await fetchProductByDocId(barcode, pivotId);
      if (cancelled) return;
      if (fetched) {
        setProduct(fetched);
        setProductSearchSelection(fetched);
      } else if (!selected || selected.barcode !== barcode) {
        setProduct(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [barcode, pivotId]);

  const allRows = useMemo(() => {
    if (!product) return [];
    return buildProductSupermarketPriceRows({
      product,
      markets,
      ofertaDiaItems: ofertaItems,
    });
  }, [product, markets, ofertaItems]);

  const rows = useMemo(
    () => (onlyOfertas ? filterPromoOrDiscountRows(allRows) : allRows),
    [allRows, onlyOfertas]
  );

  const fs = Math.max(11, Math.round(m.body * 0.75));
  const fsCaption = Math.max(10, Math.round(m.caption * 0.75));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerCard: {
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: SURFACES.cardBorder,
          backgroundColor: SURFACES.card,
          borderRadius: 10,
          padding: 8,
          marginBottom: Math.max(8, MENU_SECTION_GAP - 4),
        },
        thumb: {
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: SURFACES.thumb,
        },
        thumbPlaceholder: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerBody: {
          flex: 1,
          minWidth: 0,
          gap: 2,
        },
        productName: {
          fontSize: fs,
          fontWeight: '700',
          color: SURFACES.text,
        },
        meta: {
          fontSize: fsCaption,
          fontWeight: '500',
          color: SURFACES.muted,
        },
        row: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: SURFACES.cardBorder,
          backgroundColor: SURFACES.card,
          borderRadius: 10,
          padding: 8,
          marginBottom: 6,
        },
        rowWinner: {
          borderColor: homeColors.logoRing,
        },
        rowTop: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        marketBlock: {
          flex: 1,
          minWidth: 0,
          gap: 2,
        },
        marketName: {
          fontSize: fs,
          fontWeight: '700',
          color: SURFACES.text,
        },
        badges: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 1,
        },
        badge: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.2,
          textTransform: 'uppercase',
          color: SURFACES.text,
          backgroundColor: 'rgba(18, 32, 51, 0.08)',
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: 3,
          overflow: 'hidden',
        },
        badgeBest: {
          backgroundColor: 'rgba(0, 229, 255, 0.22)',
          color: '#066A78',
        },
        badgePromo: {
          backgroundColor: '#FF1A1A',
          color: '#FFFFFF',
        },
        badgeSavings: {
          backgroundColor: '#FF1A1A',
          color: '#FFFFFF',
        },
        price: {
          fontSize: Math.round(fs * 1.1),
          fontWeight: '800',
          color: '#000000',
        },
        addBtn: {
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          borderRadius: 10,
          paddingVertical: 8,
          backgroundColor: homeColors.logoRing,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#000000',
        },
        addBtnText: {
          fontSize: fsCaption,
          fontWeight: '800',
          color: '#041016',
        },
        empty: {
          alignItems: 'center',
          paddingVertical: 28,
          gap: 6,
        },
        emptyTitle: {
          fontSize: fs,
          fontWeight: '700',
          color: homeColors.textMuted,
          textAlign: 'center',
        },
      }),
    [fs, fsCaption, MENU_SECTION_GAP]
  );

  const handleAdd = useCallback(
    async (row: ProductSupermarketPriceRow) => {
      if (!product || addingId) return;
      setAddingId(row.supermarketId);
      try {
        fireInstantFeedback({ sound: 'click', haptic: 'medium' });
        void logSupermarketClick(row.supermarketId, row.supermarketName, 'product_search');
        void recordSupermarketVisit(row.supermarketId);
        await setSupermarket(row.supermarketId, row.supermarketName);

        // Misma base que el escaneo: persistir precios de todos los súper en SQLite
        // para que el carrito compare y marque el más barato.
        let toAdd = mergeComparisonRowsIntoProduct(
          product,
          allRows,
          row.supermarketId,
          row.unitPrice
        );

        const isRealEan =
          /^\d{8,14}$/.test(product.barcode.replace(/\D/g, '')) &&
          !product.barcode.startsWith('oferta-');

        if (isRealEan) {
          try {
            const looked = await lookupProduct(product.barcode, row.supermarketId);
            if (looked) {
              toAdd = mergeComparisonRowsIntoProduct(
                {
                  ...looked,
                  catalogPrices: {
                    prices: {
                      ...(looked.catalogPrices?.prices ?? {}),
                      ...(toAdd.catalogPrices?.prices ?? {}),
                    },
                    syncedAt: {
                      ...(looked.catalogPrices?.syncedAt ?? {}),
                      ...(toAdd.catalogPrices?.syncedAt ?? {}),
                    },
                  },
                },
                allRows,
                row.supermarketId,
                row.unitPrice
              );
            }
          } catch {
            // Seguimos con lo ya fusionado de la pantalla de comparación.
          }
        }

        try {
          await upsertProduct(toAdd);
        } catch {
          // No bloquear el alta si falla SQLite.
        }

        addProduct(productToCartPayload(toAdd, row.supermarketId, row.unitPrice));
        router.push({
          pathname: '/cart',
          params: {
            supermarketId: row.supermarketId,
            name: row.supermarketName,
            focusBarcode: toAdd.barcode,
          },
        });
      } finally {
        setAddingId(null);
      }
    },
    [addProduct, addingId, allRows, product, router, setSupermarket]
  );

  const displayName = product?.name || titleName || 'Producto';

  return (
    <MenuScreenLayout title="Precios en tu zona">
      {loading ? (
        <ActivityIndicator color={homeColors.logoRing} style={{ marginTop: 28 }} />
      ) : !product ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={36} color={homeColors.textMuted} />
          <Text style={styles.emptyTitle}>Sin producto</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.thumb} resizeMode="contain" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="cube-outline" size={26} color={SURFACES.muted} />
              </View>
            )}
            <View style={styles.headerBody}>
              <Text style={styles.productName} numberOfLines={3}>
                {displayName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {rows.length} súper
              </Text>
            </View>
          </View>

          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={36} color={homeColors.textMuted} />
              <Text style={styles.emptyTitle}>Sin precios</Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item) => item.supermarketId}
              scrollEnabled={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const busy = addingId === item.supermarketId;
                return (
                  <View style={[styles.row, item.isCheapest && styles.rowWinner]}>
                    <View style={styles.rowTop}>
                      <SupermarketLogoBadge marketId={item.supermarketId} size={40} />
                      <View style={styles.marketBlock}>
                        <Text style={styles.marketName} numberOfLines={1}>
                          {item.supermarketName}
                        </Text>
                        <View style={styles.badges}>
                          {item.isCheapest ? (
                            <Text style={[styles.badge, styles.badgeBest]}>Más barato</Text>
                          ) : null}
                          {item.hasOfertaDia ? (
                            <Text style={[styles.badge, styles.badgePromo]}>
                              {item.ofertaLabel || 'Promo'}
                            </Text>
                          ) : null}
                          {!item.hasOfertaDia &&
                          item.discountPctVsMax != null &&
                          item.discountPctVsMax >= 5 ? (
                            <Text style={[styles.badge, styles.badgeSavings]}>
                              -{item.discountPctVsMax}%
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.price}>{formatCurrency(item.unitPrice)}</Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Agregar a lista en ${item.supermarketName}`}
                      disabled={busy}
                      onPress={withClickSound(() => {
                        void handleAdd(item);
                      })}
                      style={({ pressed }) => [
                        styles.addBtn,
                        (pressed || busy) && { opacity: 0.85 },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator color="#041016" />
                      ) : (
                        <>
                          <Ionicons name="cart-outline" size={16} color="#041016" />
                          <Text style={styles.addBtnText}>Agregar a lista</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </MenuScreenLayout>
  );
}
