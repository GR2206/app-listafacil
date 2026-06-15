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
import { markPendingProductLinked } from '@/services/pendingProductsAdmin';
import { formatCurrency } from '@/utils/formatCurrency';
import { radii } from '@/theme';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';
import { withClickSound } from '@/utils/withClickSound';
import { UserProductProposalModal } from '@/components/cart/UserProductProposalModal';

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
  onProductSelected,
}: ScanNotFoundBannerProps) {
  const { theme } = useSupermarketTheme();
  const [mode, setMode] = useState<BannerMode>('alert');
  const [query, setQuery] = useState(nameHint ?? '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSubmitted, setProposalSubmitted] = useState(false);

  const openProposal = useCallback(() => {
    setProposalOpen(true);
  }, []);

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
        setSearchError('Sin resultados en la web de este super. Podés agregar el producto manualmente.');
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

  const renderAddProductButton = (compact = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar producto manualmente con foto"
      onPress={withClickSound(openProposal)}
      style={({ pressed }) => [
        compact ? styles.proposeBtnCompact : styles.proposeBtn,
        { backgroundColor: theme.primary },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="add-circle-outline" size={compact ? 13 : 15} color={theme.textOnPrimary} />
      <Text style={[styles.proposeText, { color: theme.textOnPrimary }]}>Agregar producto</Text>
    </Pressable>
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
            <Text style={[styles.title, { color: lc.text }]}>Producto no registrado</Text>

            <View style={[styles.eanBadge, { borderColor: theme.primary, backgroundColor: lc.surface }]}>
              <Text style={[styles.eanLabel, { color: theme.primary }]}>Código EAN</Text>
              <Text style={[styles.eanValue, { color: lc.text }]} selectable>
                {barcode}
              </Text>
            </View>

            {nameSearchUsed && nameHint ? (
              <Text style={[styles.hint, { color: lc.textMuted }]} numberOfLines={2}>
                Búsqueda automática sin resultados: {nameHint}
              </Text>
            ) : null}

            {proposalSubmitted ? (
              <Text style={[styles.queuedText, { color: '#059669' }]}>
                Producto enviado para revisión. Ya está en tu lista y un admin lo validará antes de
                publicarlo en el catálogo.
              </Text>
            ) : (
              <>
                <Text style={[styles.hint, { color: lc.textMuted }]}>
                  Este código no está en Lista Fácil. Podés cargarlo con foto, nombre, marca y precio de
                  góndola, o buscarlo en la web del super.
                </Text>

                {pendingQueued ? (
                  <Text style={[styles.hint, { color: lc.textMuted }]}>
                    También lo buscará el sistema en segundo plano.
                  </Text>
                ) : null}

                <View style={styles.actionRow}>
                  {renderAddProductButton()}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Buscar producto por nombre en la web del super"
                    onPress={withClickSound(openSearch)}
                    style={({ pressed }) => [
                      styles.searchOutlineBtn,
                      { borderColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="search-outline" size={14} color={theme.primary} />
                    <Text style={[styles.searchOutlineText, { color: theme.primary }]}>Buscar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: lc.text }]}>Buscar en {supermarketName ?? 'super'}</Text>

            <View style={[styles.eanBadge, { borderColor: lc.border, backgroundColor: lc.surface }]}>
              <Text style={[styles.eanLabel, { color: lc.textMuted }]}>EAN escaneado</Text>
              <Text style={[styles.eanValue, { color: lc.text }]} selectable>
                {barcode}
              </Text>
            </View>

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

            {!proposalSubmitted ? (
              <View style={styles.searchFallbackRow}>
                <Text style={[styles.hint, { color: lc.textMuted, flex: 1 }]}>
                  ¿No lo encontrás? Cargalo manualmente:
                </Text>
                {renderAddProductButton(true)}
              </View>
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

      <UserProductProposalModal
        visible={proposalOpen}
        barcode={barcode}
        supermarketId={supermarketId}
        supermarketName={supermarketName}
        nameHint={nameHint}
        onClose={() => setProposalOpen(false)}
        onSubmitted={(product) => {
          setProposalOpen(false);
          setProposalSubmitted(true);
          onProductSelected(product);
          onDismiss();
        }}
      />
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
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontSize: c.noticeFontSize,
    fontWeight: '800',
  },
  eanBadge: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  eanLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  eanValue: {
    fontSize: c.clearFontSize + 1,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: c.clearFontSize,
    lineHeight: 15,
  },
  queuedText: {
    fontSize: c.clearFontSize,
    lineHeight: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  proposeBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  proposeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  searchOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  searchOutlineText: {
    fontSize: 11,
    fontWeight: '800',
  },
  searchFallbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
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
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.7,
  },
});
