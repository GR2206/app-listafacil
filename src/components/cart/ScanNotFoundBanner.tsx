import { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { saveEanProductMapping } from '@/services/eanProductMapping';
import { searchProductsOnSupermarketWeb } from '@/services/supermarketProductSearch';
import { reportPendingProduct } from '@/services/pendingProductReport';
import { markPendingProductLinked } from '@/services/pendingProductsAdmin';
import { formatCurrency } from '@/utils/formatCurrency';
import { radii } from '@/theme';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';
import { withClickSound } from '@/utils/withClickSound';

import type { Product } from '@/types';

type BannerMode = 'alert' | 'search' | 'results';

interface ScanNotFoundBannerProps {
  barcode: string;
  supermarketId: string;
  supermarketName?: string;
  nameHint?: string;
  pendingQueued?: boolean;
  nameSearchUsed?: boolean;
  onDismiss: () => void;
  onReported?: () => void;
  onProductSelected: (product: Product) => void;
}

export function ScanNotFoundBanner({
  barcode,
  supermarketId,
  supermarketName,
  nameHint,
  pendingQueued = false,
  nameSearchUsed = false,
  onDismiss,
  onReported,
  onProductSelected,
}: ScanNotFoundBannerProps) {
  const { theme } = useSupermarketTheme();
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(pendingQueued);
  const [mode, setMode] = useState<BannerMode>('alert');
  const [query, setQuery] = useState(nameHint ?? '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleReport = async () => {
    if (submitting || reported) return;
    setSubmitting(true);

    const ok = await reportPendingProduct({
      barcode,
      supermarketId,
      supermarketName,
      nameHint: query || nameHint,
      source: 'scan',
      priority: true,
    });

    setSubmitting(false);
    if (!ok) return;

    setReported(true);
    onReported?.();
  };

  const openSearch = useCallback(() => {
    setMode('search');
    setSearchError(null);
    if (nameHint && !query) {
      setQuery(nameHint);
    }
  }, [nameHint, query]);

  const runSearch = useCallback(async () => {
    const term = query.trim();
    if (term.length < 2) {
      setSearchError('Escribí al menos 2 letras para buscar.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const found = await searchProductsOnSupermarketWeb(term, supermarketId, 8);
      setResults(found);
      setMode('results');
      if (found.length === 0) {
        setSearchError('Sin resultados en el catálogo de este supermercado.');
      }
    } catch {
      setSearchError('No se pudo buscar. Revisá tu conexión.');
    } finally {
      setSearching(false);
    }
  }, [query, supermarketId]);

  const handleSelectProduct = useCallback(
    async (candidate: Product) => {
      if (savingId) return;

      setSavingId(candidate.id);
      setSearchError(null);

      const saved = await saveEanProductMapping({
        ean: barcode,
        supermercado: supermarketId,
        id_producto: candidate.id,
        supermarketName,
        productName: candidate.name,
        source: 'manual_search',
      });

      setSavingId(null);

      if (!saved) {
        setSearchError('No se pudo guardar la asociación. Revisá permisos de Firestore.');
        return;
      }

      await markPendingProductLinked({
        ean: barcode,
        supermarketId,
        id_producto: candidate.id,
        productName: candidate.name,
      });

      onProductSelected({
        ...candidate,
        barcode,
        id: barcode,
        supermarketId,
      });
      onDismiss();
    },
    [barcode, onDismiss, onProductSelected, savingId, supermarketId, supermarketName]
  );

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: lc.surfaceElevated,
          borderColor: theme.primary,
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="barcode-outline" size={c.noticeIconSize} color={theme.primary} />

      <View style={styles.content}>
        {mode === 'alert' ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar producto manualmente por nombre"
              onPress={withClickSound(openSearch)}
            >
              <Text style={[styles.title, styles.titleLink, { color: lc.text }]}>
                Producto no registrado
              </Text>
              <Text style={[styles.tapHint, { color: theme.primary }]}>
                Tocá acá para buscar por nombre
              </Text>
            </Pressable>

            <Text style={[styles.ean, { color: lc.textMuted }]}>EAN: {barcode}</Text>

            {nameSearchUsed && nameHint ? (
              <Text style={[styles.hint, { color: lc.textMuted }]} numberOfLines={2}>
                Búsqueda automática sin resultados: {nameHint}
              </Text>
            ) : null}

            {reported ? (
              <Text style={[styles.queuedText, { color: '#059669' }]}>
                Agregado a la lista de revisión. El bot lo buscará con prioridad.
              </Text>
            ) : (
              <Text style={[styles.hint, { color: lc.textMuted }]}>
                Se intentó código, variantes EAN y nombre antes de avisar.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: lc.text }]}>Buscar en {supermarketName ?? 'super'}</Text>
            <Text style={[styles.ean, { color: lc.textMuted }]}>EAN escaneado: {barcode}</Text>

            <View style={[styles.searchRow, { borderColor: lc.border }]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Nombre del producto…"
                placeholderTextColor={lc.textMuted}
                style={[styles.searchInput, { color: lc.text }]}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void runSearch()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buscar producto"
                onPress={withClickSound(() => void runSearch())}
                disabled={searching}
                style={({ pressed }) => [
                  styles.searchBtn,
                  { backgroundColor: theme.primary },
                  pressed && !searching && styles.pressed,
                  searching && styles.disabled,
                ]}
              >
                {searching ? (
                  <ActivityIndicator size="small" color={theme.textOnPrimary} />
                ) : (
                  <Ionicons name="search" size={16} color={theme.textOnPrimary} />
                )}
              </Pressable>
            </View>

            {searchError ? (
              <Text style={[styles.hint, { color: '#B45309' }]}>{searchError}</Text>
            ) : null}

            {mode === 'results' && results.length > 0 ? (
              <ScrollView style={styles.resultsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {results.map((item) => {
                  const isSaving = savingId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Seleccionar ${item.name}`}
                      onPress={withClickSound(() => void handleSelectProduct(item))}
                      disabled={Boolean(savingId)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        { borderColor: lc.border, backgroundColor: lc.surface },
                        pressed && !savingId && styles.pressed,
                      ]}
                    >
                      <View style={styles.resultCopy}>
                        <Text style={[styles.resultName, { color: lc.text }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.resultMeta, { color: lc.textMuted }]} numberOfLines={1}>
                          ID: {item.id}
                          {item.price > 0 ? ` · ${formatCurrency(item.price)}` : ''}
                        </Text>
                      </View>
                      {isSaving ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.actions}>
        {mode === 'alert' && !reported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reenviar a lista de revisión"
            onPress={withClickSound(() => void handleReport())}
            disabled={submitting}
            style={({ pressed }) => [
              styles.reportBtn,
              { backgroundColor: theme.primary },
              pressed && !submitting && styles.pressed,
              submitting && styles.disabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.textOnPrimary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={14} color={theme.textOnPrimary} />
            )}
            <Text style={[styles.reportText, { color: theme.textOnPrimary }]}>
              {submitting ? 'Enviando…' : 'Reenviar'}
            </Text>
          </Pressable>
        ) : null}

        {mode !== 'alert' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al aviso"
            onPress={withClickSound(() => setMode('alert'))}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={lc.textMuted} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          onPress={withClickSound(onDismiss)}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={lc.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: c.gap,
    marginHorizontal: c.margin,
    marginBottom: c.gap,
    paddingVertical: c.gap + 2,
    paddingHorizontal: c.margin,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: c.noticeFontSize,
    fontWeight: '800',
  },
  titleLink: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  tapHint: {
    fontSize: c.clearFontSize,
    fontWeight: '700',
    marginTop: 2,
  },
  ean: {
    fontSize: c.clearFontSize,
    fontWeight: '600',
  },
  hint: {
    fontSize: c.clearFontSize,
    lineHeight: 14,
  },
  queuedText: {
    fontSize: c.clearFontSize,
    lineHeight: 14,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: c.clearFontSize,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    maxHeight: 168,
    marginTop: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  resultName: {
    fontSize: c.clearFontSize,
    fontWeight: '700',
    lineHeight: 15,
  },
  resultMeta: {
    fontSize: 10,
    lineHeight: 12,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  reportText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.7,
  },
});
