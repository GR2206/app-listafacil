import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Platform,
  type TextInput as TextInputType,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { useProductNameSearch } from '@/hooks/useProductNameSearch';
import { useSelectedZone } from '@/hooks/useSelectedZone';
import {
  fetchOfertaDiaManifest,
  filterOfertaDiaForZone,
  getStartupOfertaDiaManifest,
} from '@/services/ofertaDiaManager';
import { setProductSearchSelection } from '@/store/productSearchSelectionStore';
import type { OfertaDiaItem } from '@/types/ofertaDia';
import type { Product } from '@/types';
import { homeColors } from '@/theme/home';
import {
  buildOfertaBarcodeSet,
  takeOfertasMatchingQuery,
} from '@/utils/ofertaDiaProduct';
import { withClickSound } from '@/utils/withClickSound';
import {
  dropCrossMarketPriceOutliers,
  readPriceForSupermarket,
} from '@/utils/supermarketPrices';
import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { formatCurrency } from '@/utils/formatCurrency';

/** Cajones claros + letra negra; tarjetas con fondo 30% transparente. */
const SURFACES = {
  box: '#E8EEF4',
  boxBorder: '#B8C6D4',
  card: 'rgba(238, 243, 248, 0.7)',
  cardBorder: '#C2D0DE',
  text: '#0B0B0B',
  muted: '#1A1A1A',
  thumb: '#D5DEE8',
};

function lowestZonePrice(product: Product, zone: string | null): number | null {
  const prices = dropCrossMarketPriceOutliers(product.catalogPrices?.prices ?? {});
  const markets = getSupermarketsForZone(zone);
  let min = 0;
  for (const market of markets) {
    const price = readPriceForSupermarket(prices, market.id, 0);
    if (price > 0 && (min === 0 || price < min)) min = price;
  }
  if (min > 0) return min;
  return product.price > 0 ? product.price : null;
}

export default function BuscarProductoScreen() {
  const router = useRouter();
  const zone = useSelectedZone();
  const [query, setQuery] = useState('');
  const [onlyOfertas, setOnlyOfertas] = useState(false);
  const searchInputRef = useRef<TextInputType>(null);
  const [ofertas, setOfertas] = useState<OfertaDiaItem[]>(
    () => filterOfertaDiaForZone(getStartupOfertaDiaManifest() ?? { oferta_dia: [] }, zone).oferta_dia
  );
  const {
    results,
    correctedQuery,
    usedCorrection,
    loading,
    enriching,
    searching,
    error,
    canSearch,
  } = useProductNameSearch(query);
  const { m, MENU_SECTION_GAP } = useMenuContentStyles();

  // Entrar con teclado abierto y foco en el buscador.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { manifest } = await fetchOfertaDiaManifest();
      if (cancelled) return;
      setOfertas(filterOfertaDiaForZone(manifest, zone).oferta_dia);
    })();
    return () => {
      cancelled = true;
    };
  }, [zone]);

  const ofertaBarcodes = useMemo(() => buildOfertaBarcodeSet(ofertas), [ofertas]);

  const displayResults = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    // OFERTAS ON: solo ítems en oferta (feed + catálogo que estén en oferta).
    if (onlyOfertas) {
      const fromOfertas = takeOfertasMatchingQuery(ofertas, q);
      const seen = new Set(fromOfertas.map((p) => p.barcode));
      for (const product of results) {
        if (!ofertaBarcodes.has(product.barcode) || seen.has(product.barcode)) continue;
        seen.add(product.barcode);
        fromOfertas.push(product);
      }
      return fromOfertas;
    }

    // Default: catálogo completo. El badge "Oferta" se marca aparte;
    // no reemplazamos el catálogo por el feed de ofertas.
    const merged: Product[] = [];
    const seen = new Set<string>();
    for (const product of results) {
      if (seen.has(product.barcode)) continue;
      seen.add(product.barcode);
      merged.push(product);
    }
    return merged;
  }, [onlyOfertas, ofertaBarcodes, ofertas, query, results]);

  const fs = Math.max(11, Math.round(m.body * 0.75));
  const fsCaption = Math.max(10, Math.round(m.caption * 0.75));
  const icon = Math.max(14, Math.round(m.iconMd * 0.75));
  const thumb = Math.max(36, Math.round(52 * 0.75));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        searchWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: SURFACES.boxBorder,
          backgroundColor: SURFACES.box,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 7,
          marginBottom: 8,
        },
        input: {
          flex: 1,
          fontSize: fs,
          fontWeight: '600',
          color: '#000000',
          paddingVertical: 0,
        },
        filterRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: Math.max(8, MENU_SECTION_GAP - 4),
          gap: 8,
        },
        filterLabel: {
          fontSize: fsCaption,
          fontWeight: '700',
          color: '#FFFFFF',
        },
        switchWrap: {
          transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
        },
        suggestChip: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'rgba(0, 229, 255, 0.12)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(0, 229, 255, 0.45)',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
          marginBottom: 8,
        },
        suggestText: {
          fontSize: fsCaption,
          fontWeight: '700',
          color: homeColors.neonBlueSoft,
        },
        searchingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(0, 229, 255, 0.12)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(0, 229, 255, 0.4)',
        },
        searchingText: {
          flex: 1,
          fontSize: fsCaption,
          fontWeight: '700',
          color: '#FFFFFF',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#000000',
          backgroundColor: SURFACES.card,
          borderRadius: 10,
          padding: 8,
          marginBottom: 6,
        },
        thumb: {
          width: thumb,
          height: thumb,
          borderRadius: 8,
          backgroundColor: SURFACES.thumb,
        },
        thumbPlaceholder: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        rowBody: {
          flex: 1,
          minWidth: 0,
          gap: 1,
        },
        name: {
          fontSize: fs,
          fontWeight: '700',
          color: '#000000',
        },
        meta: {
          fontSize: fsCaption,
          fontWeight: '500',
          color: '#1A1A1A',
        },
        ofertaBadge: {
          alignSelf: 'flex-start',
          marginTop: 2,
          fontSize: Math.max(9, fsCaption - 1),
          fontWeight: '800',
          letterSpacing: 0.2,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          backgroundColor: '#FF1A1A',
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: 3,
          overflow: 'hidden',
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
    [fs, fsCaption, thumb, MENU_SECTION_GAP]
  );

  const openCompare = (product: Product) => {
    setProductSearchSelection(product);
    router.push({
      pathname: '/buscar-precios',
      params: {
        barcode: product.barcode,
        name: product.name,
        onlyOfertas: onlyOfertas ? '1' : '0',
      },
    });
  };

  const showEmpty =
    !loading &&
    displayResults.length === 0 &&
    !error &&
    (onlyOfertas || canSearch);

  return (
    <MenuScreenLayout title="Buscar producto">
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={icon} color="#000000" />
        <TextInput
          ref={searchInputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar producto o marca…"
          placeholderTextColor="#333333"
          style={styles.input}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          showSoftInputOnFocus
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            onPress={withClickSound(() => setQuery(''))}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={icon} color="#000000" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>OFERTAS</Text>
        <View style={styles.switchWrap}>
          <Switch
            value={onlyOfertas}
            onValueChange={setOnlyOfertas}
            trackColor={{ false: '#B0B8C0', true: homeColors.logoRing }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            ios_backgroundColor="#B0B8C0"
          />
        </View>
      </View>

      {correctedQuery && !usedCorrection ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buscar ${correctedQuery}`}
          onPress={withClickSound(() => setQuery(correctedQuery))}
          style={({ pressed }) => [styles.suggestChip, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="sparkles-outline" size={12} color={homeColors.logoRing} />
          <Text style={styles.suggestText}>¿{correctedQuery}?</Text>
        </Pressable>
      ) : null}

      {usedCorrection && correctedQuery ? (
        <View style={styles.suggestChip}>
          <Text style={styles.suggestText}>{correctedQuery}</Text>
        </View>
      ) : null}

      {searching ? (
        <View style={styles.searchingRow} accessibilityRole="text">
          <ActivityIndicator size="small" color={homeColors.logoRing} />
          <Text style={styles.searchingText}>
            {loading && displayResults.length === 0
              ? 'Buscando productos…'
              : enriching
                ? 'Buscando más en el catálogo…'
                : 'Buscando productos…'}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{error}</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={28} color={homeColors.textMuted} />
          <Text style={styles.emptyTitle}>
            {onlyOfertas && query.trim().length < 2
              ? 'Escribí un producto para ver sus ofertas'
              : 'Sin resultados'}
          </Text>
        </View>
      ) : null}

      {displayResults.map((item) => {
        const from = lowestZonePrice(item, zone);
        const isOferta =
          onlyOfertas ||
          item.barcode.startsWith('oferta-') ||
          ofertaBarcodes.has(item.barcode);

        return (
          <Pressable
            key={item.barcode}
            accessibilityRole="button"
            accessibilityLabel={`Ver precios de ${item.name}`}
            onPress={withClickSound(() => openCompare(item))}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.thumb}
                contentFit="contain"
                cachePolicy="memory-disk"
                recyclingKey={item.barcode}
                transition={0}
              />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="cube-outline" size={icon} color={SURFACES.muted} />
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.brand ? `${item.brand} · ` : ''}
                {from != null ? formatCurrency(from) : 'Ver precios'}
              </Text>
              {isOferta ? <Text style={styles.ofertaBadge}>Oferta</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={icon} color="#000000" />
          </Pressable>
        );
      })}
      <View style={{ height: 8 }} />
    </MenuScreenLayout>
  );
}
