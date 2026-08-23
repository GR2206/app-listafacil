import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  applyAllPendingReviewItems,
  applyPendingReviewItem,
  clearConfirmedReviewHistory,
  describePendingUserProposal,
  dismissAllPendingReviewItems,
  dismissPendingReviewItem,
  getPendingReviewDisplayName,
  getPendingReviewProposalFields,
  isUserProductProposal,
  listConfirmedReviewProducts,
  listPendingReviewProducts,
  updatePendingReviewItem,
  type PendingReviewEdits,
  type PendingReviewItem,
} from '@/services/pendingProductsAdmin';
import { homeColors } from '@/theme/home';
import { radii, touchTargets } from '@/theme';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import type { ScaledMenuMetrics } from '@/theme/scaledMenuMetrics';
import { withClickSound } from '@/utils/withClickSound';
import { formatCurrency } from '@/utils/formatCurrency';
import { normalizePriceInput, parsePriceInput } from '@/utils/priceInput';
import { uploadCatalogProductImage } from '@/services/pendingProductImageUpload';

function createRevisionStyles(m: ScaledMenuMetrics) {
  return StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: m.spacingSm,
      marginBottom: m.spacingSm,
    },
    applyAllBtn: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#059669',
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: m.spacingMd,
    },
    dismissAllBtn: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#DC2626',
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: m.spacingMd,
    },
    dismissAllText: {
      color: '#FFFFFF',
      fontSize: m.caption,
      fontWeight: '800',
    },
    applyAllText: {
      color: '#FFFFFF',
      fontSize: m.caption,
      fontWeight: '800',
    },
    refreshBtn: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      backgroundColor: homeColors.panel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedbackPanel: {
      marginBottom: m.spacingSm,
    },
    feedbackText: {
      fontSize: m.caption,
      color: homeColors.text,
      fontWeight: '600',
      lineHeight: Math.round(m.caption * 1.25),
    },
    loadingBox: {
      paddingVertical: m.spacingLg,
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: m.caption,
      fontWeight: '800',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: m.spacingSm,
    },
    sectionSpacer: {
      marginTop: m.spacingLg,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: m.spacingLg,
      marginBottom: m.spacingSm,
    },
    sectionHeaderTitle: {
      flex: 1,
      fontSize: m.caption,
      fontWeight: '800',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    clearHistoryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: '#DC2626',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
    },
    clearHistoryText: {
      fontSize: Math.max(9, m.caption - 3),
      fontWeight: '800',
      color: '#DC2626',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: m.spacingSm,
    },
    cardTitle: {
      fontSize: m.body,
      fontWeight: '800',
      color: homeColors.text,
    },
    cardMeta: {
      fontSize: m.caption,
      color: homeColors.textMuted,
      marginTop: 4,
    },
    cardHint: {
      fontSize: m.caption,
      color: homeColors.text,
      marginTop: 4,
      lineHeight: Math.round(m.caption * 1.25),
    },
    cardLabel: {
      fontSize: Math.max(9, m.caption - 2),
      fontWeight: '700',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.35,
      marginTop: 8,
    },
    proposalLine: {
      fontSize: m.caption,
      color: homeColors.text,
      marginTop: 4,
      lineHeight: Math.round(m.caption * 1.35),
    },
    cardWarn: {
      fontSize: Math.max(9, m.caption - 3),
      color: '#B45309',
      marginTop: 4,
    },
    dismissBtn: {
      minWidth: 34,
      minHeight: 34,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: '#FECACA',
      backgroundColor: '#FEF2F2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: m.spacingSm,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    modifyBtn: {
      backgroundColor: homeColors.panel,
      borderWidth: 1,
      borderColor: homeColors.border,
    },
    modifyText: {
      color: homeColors.text,
      fontSize: Math.max(9, m.caption - 3),
      fontWeight: '800',
    },
    applyBtn: {
      backgroundColor: homeColors.logoRing,
    },
    applyText: {
      color: '#FFFFFF',
      fontSize: Math.max(9, m.caption - 3),
      fontWeight: '800',
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    modalBackdropTap: {
      ...StyleSheet.absoluteFillObject,
    },
    modalSheet: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: homeColors.border,
      backgroundColor: homeColors.panel,
      padding: 20,
      paddingTop: 44,
      gap: 12,
    },
    modalCloseBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 2,
      minWidth: touchTargets.min,
      minHeight: touchTargets.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: m.body,
      fontWeight: '800',
      color: homeColors.text,
    },
    modalLabel: {
      fontSize: Math.max(9, m.caption - 2),
      fontWeight: '700',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    modalInput: {
      minHeight: touchTargets.min,
      borderWidth: 1.5,
      borderColor: homeColors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      fontSize: m.body,
      fontWeight: '600',
      color: homeColors.text,
      backgroundColor: homeColors.surface ?? homeColors.panel,
    },
    modalMeta: {
      fontSize: m.caption,
      color: homeColors.textMuted,
    },
    modalPreviewImage: {
      width: '100%',
      height: 140,
      borderRadius: radii.md,
      backgroundColor: homeColors.surface ?? homeColors.panel,
    },
    modalHelp: {
      fontSize: Math.max(9, m.caption - 2),
      color: homeColors.textMuted,
      lineHeight: 14,
    },
    modalScroll: {
      maxHeight: '82%',
    },
    modalImageActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modalImageBtn: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: touchTargets.min,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      backgroundColor: homeColors.surface ?? homeColors.panel,
    },
    modalImageBtnText: {
      fontSize: Math.max(9, m.caption - 2),
      fontWeight: '800',
      color: homeColors.text,
    },
    modalUploadError: {
      fontSize: Math.max(9, m.caption - 2),
      fontWeight: '700',
      color: '#B45309',
      lineHeight: 14,
    },
    modalActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    modalSaveBtn: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: touchTargets.min,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      backgroundColor: homeColors.panel,
    },
    modalSaveText: {
      fontSize: m.caption,
      fontWeight: '800',
      color: homeColors.text,
    },
    modalApplyBtn: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: touchTargets.min,
      borderRadius: radii.md,
      backgroundColor: '#059669',
    },
    modalApplyText: {
      fontSize: m.caption,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    confirmedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    confirmedText: {
      fontSize: Math.max(9, m.caption - 4),
      fontWeight: '700',
      color: '#059669',
    },
    cardPreviewImage: {
      width: '100%',
      height: 120,
      borderRadius: radii.sm,
      marginTop: 8,
      backgroundColor: homeColors.surface ?? homeColors.panel,
    },
    cardPrice: {
      fontSize: m.caption,
      fontWeight: '800',
      color: homeColors.logoRing,
      marginTop: 4,
    },
    proposalBox: {
      marginTop: m.spacingSm,
      borderWidth: 1,
      borderColor: homeColors.border,
      borderRadius: radii.md,
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      paddingHorizontal: m.spacingSm,
      paddingVertical: m.spacingSm,
      gap: 6,
    },
    proposalBoxTitle: {
      fontSize: Math.max(9, m.caption - 2),
      fontWeight: '800',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    proposalFieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    proposalFieldLabel: {
      width: 72,
      fontSize: m.caption,
      fontWeight: '700',
      color: homeColors.textMuted,
    },
    proposalFieldValue: {
      flex: 1,
      fontSize: m.caption,
      fontWeight: '700',
      color: homeColors.text,
      lineHeight: Math.round(m.caption * 1.3),
    },
    proposalEmptyHint: {
      fontSize: Math.max(9, m.caption - 3),
      color: homeColors.textMuted,
      fontStyle: 'italic',
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.65,
    },
  });
}

export default function RevisionProductosScreen() {
  const router = useRouter();
  const isAdmin = useAdminAccess();
  const { styles: menuContentStyles, m } = useMenuContentStyles();
  const styles = useMemo(() => createRevisionStyles(m), [m]);

  const [pending, setPending] = useState<PendingReviewItem[]>([]);
  const [confirmed, setConfirmed] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [dismissingAll, setDismissingAll] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PendingReviewItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextPending, nextConfirmed] = await Promise.all([
      listPendingReviewProducts(),
      listConfirmedReviewProducts(),
    ]);
    setPending(nextPending);
    setConfirmed(nextConfirmed);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) return;
      void refresh();
    }, [isAdmin, refresh])
  );

  const handleApplyOne = useCallback(
    async (item: PendingReviewItem) => {
      if (applyingId || applyingAll) return;

      setApplyingId(item.id);
      setFeedback(null);

      const result = await applyPendingReviewItem(item);
      setApplyingId(null);

      if (!result.ok) {
        setFeedback(result.reason ?? 'No se pudo aplicar');
        return;
      }

      setPending((current) => current.filter((row) => row.id !== item.id));
      setConfirmed((current) => [
        {
          ...item,
          status: 'confirmed',
          id_producto: result.id_producto ?? item.id_producto,
          productName: result.productName ?? item.productName,
        },
        ...current.filter((row) => row.id !== item.id),
      ]);
      setFeedback(
        `«${getPendingReviewDisplayName(item)}» (EAN ${item.ean}) aplicado y movido a confirmados.`
      );
    },
    [applyingAll, applyingId]
  );

  const handleClearHistory = useCallback(() => {
    if (clearingHistory || confirmed.length === 0) return;

    Alert.alert(
      'Borrar historial',
      `¿Borrar los ${confirmed.length} productos confirmados del historial? No elimina nada del catálogo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar historial',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setClearingHistory(true);
              setFeedback(null);
              const { cleared, failed } = await clearConfirmedReviewHistory(confirmed);
              setClearingHistory(false);
              setConfirmed([]);
              setFeedback(
                failed > 0
                  ? `Historial: ${cleared} borrados, ${failed} fallaron.`
                  : `Historial borrado (${cleared}).`
              );
            })();
          },
        },
      ]
    );
  }, [clearingHistory, confirmed]);

  const handleDismiss = useCallback(
    async (item: PendingReviewItem) => {
      if (dismissingId || dismissingAll || applyingId || applyingAll) return;

      setDismissingId(item.id);
      setFeedback(null);

      const ok = await dismissPendingReviewItem(item);
      setDismissingId(null);

      if (!ok) {
        setFeedback('No se pudo descartar el pedido.');
        return;
      }

      setPending((current) => current.filter((row) => row.id !== item.id));
      setFeedback(`Pedido descartado: EAN ${item.ean}.`);
    },
    [applyingAll, applyingId, dismissingAll, dismissingId]
  );

  const handleEditSaved = useCallback(
    (updated: PendingReviewItem, message: string) => {
      setPending((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      setFeedback(message);
    },
    []
  );

  const handleEditConfirmed = useCallback(
    (updated: PendingReviewItem, result: { id_producto?: string; productName?: string }) => {
      setPending((current) => current.filter((row) => row.id !== updated.id));
      setConfirmed((current) => [
        {
          ...updated,
          status: 'confirmed',
          id_producto: result.id_producto ?? updated.id_producto,
          productName: result.productName ?? updated.productName,
        },
        ...current.filter((row) => row.id !== updated.id),
      ]);
      setFeedback(
        `«${getPendingReviewDisplayName(updated)}» (EAN ${updated.ean}) guardado y aplicado.`
      );
    },
    []
  );

  const handleDismissAll = useCallback(async () => {
    if (dismissingAll || applyingAll || applyingId || pending.length === 0) return;

    Alert.alert(
      'Descartar todo',
      `¿Descartar los ${pending.length} pedidos pendientes? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar todo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDismissingAll(true);
              setFeedback(null);

              const snapshot = [...pending];
              const { dismissed, failed } = await dismissAllPendingReviewItems(snapshot);

              await refresh();
              setDismissingAll(false);
              setFeedback(
                failed > 0
                  ? `Descartados: ${dismissed}. Fallidos: ${failed}.`
                  : `Se descartaron ${dismissed} pedidos pendientes.`
              );
            })();
          },
        },
      ]
    );
  }, [applyingAll, applyingId, dismissingAll, pending, refresh]);

  const handleApplyAll = useCallback(async () => {
    if (applyingAll || applyingId || pending.length === 0) return;

    setApplyingAll(true);
    setFeedback(null);

    const snapshot = [...pending];
    const { applied, failed } = await applyAllPendingReviewItems(snapshot);

    await refresh();
    setApplyingAll(false);
    setFeedback(
      failed > 0
        ? `Aplicados: ${applied}. Sin vincular: ${failed}.`
        : `Todos los aplicables (${applied}) pasaron a confirmados.`
    );
  }, [applyingAll, applyingId, pending, refresh]);

  if (!isAdmin) {
    return null;
  }

  return (
    <MenuScreenLayout title="Revisión de productos">
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aplicar todas las asociaciones pendientes"
          onPress={withClickSound(() => void handleApplyAll())}
          disabled={applyingAll || dismissingAll || pending.length === 0}
          style={({ pressed }) => [
            styles.applyAllBtn,
            pressed && !applyingAll && !dismissingAll && styles.pressed,
            (applyingAll || dismissingAll || pending.length === 0) && styles.disabled,
          ]}
        >
          {applyingAll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.applyAllText}>
            {applyingAll ? 'Aplicando…' : 'Aplicar Todo'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Descartar todos los pedidos pendientes"
          onPress={withClickSound(() => void handleDismissAll())}
          disabled={dismissingAll || applyingAll || pending.length === 0}
          style={({ pressed }) => [
            styles.dismissAllBtn,
            pressed && !dismissingAll && !applyingAll && styles.pressed,
            (dismissingAll || applyingAll || pending.length === 0) && styles.disabled,
          ]}
        >
          {dismissingAll ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.dismissAllText}>
            {dismissingAll ? 'Descartando…' : 'Descartar Todo'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar listas"
          onPress={withClickSound(() => void refresh())}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={18} color={homeColors.text} />
        </Pressable>
      </View>

      {feedback ? (
        <View style={[menuContentStyles.panel, styles.feedbackPanel]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={homeColors.logoRing} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Lista de revisión ({pending.length})</Text>

          {pending.length === 0 ? (
            <View style={menuContentStyles.emptyPanel}>
              <Text style={menuContentStyles.emptyText}>No hay productos pendientes.</Text>
            </View>
          ) : (
            pending.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                applying={applyingId === item.id}
                dismissing={dismissingId === item.id}
                onApply={() => void handleApplyOne(item)}
                onDismiss={() => void handleDismiss(item)}
                onModify={() => setEditingItem(item)}
              />
            ))
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              Productos confirmados ({confirmed.length})
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar historial de productos confirmados"
              onPress={withClickSound(() => handleClearHistory())}
              disabled={clearingHistory || confirmed.length === 0}
              style={({ pressed }) => [
                styles.clearHistoryBtn,
                pressed && !clearingHistory && styles.pressed,
                (clearingHistory || confirmed.length === 0) && styles.disabled,
              ]}
            >
              {clearingHistory ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
              )}
              <Text style={styles.clearHistoryText}>
                {clearingHistory ? 'Borrando…' : 'Borrar historial'}
              </Text>
            </Pressable>
          </View>

          {confirmed.length === 0 ? (
            <View style={menuContentStyles.emptyPanel}>
              <Text style={menuContentStyles.emptyText}>
                Todavía no hay productos confirmados.
              </Text>
            </View>
          ) : (
            confirmed.map((item) => <ReviewCard key={`confirmed-${item.id}`} item={item} confirmed />)
          )}
        </ScrollView>
      )}

      <PendingReviewEditModal
        item={editingItem}
        saving={savingEdit}
        onClose={() => setEditingItem(null)}
        onSave={async (edits) => {
          if (!editingItem || savingEdit) return;

          setSavingEdit(true);
          const ok = await updatePendingReviewItem(editingItem, edits);
          setSavingEdit(false);

          if (!ok) {
            setFeedback('No se pudieron guardar los cambios.');
            return;
          }

          const updated: PendingReviewItem = {
            ...editingItem,
            productName: edits.productName ?? editingItem.productName,
            nameHint: edits.nameHint ?? editingItem.nameHint,
            id_producto: edits.id_producto ?? editingItem.id_producto,
            brand: edits.brand ?? editingItem.brand,
            price: edits.price ?? editingItem.price,
            imageUrl: edits.imageUrl ?? editingItem.imageUrl,
          };
          handleEditSaved(updated, `Cambios guardados para EAN ${updated.ean}.`);
          setEditingItem(updated);
        }}
        onSaveAndApply={async (edits) => {
          if (!editingItem || savingEdit) return;

          setSavingEdit(true);
          const result = await applyPendingReviewItem(editingItem, edits);
          setSavingEdit(false);

          if (!result.ok) {
            setFeedback(result.reason ?? 'No se pudo aplicar');
            return;
          }

          const updated: PendingReviewItem = {
            ...editingItem,
            productName: edits.productName ?? editingItem.productName,
            nameHint: edits.nameHint ?? editingItem.nameHint,
            id_producto: edits.id_producto ?? editingItem.id_producto,
            brand: edits.brand ?? editingItem.brand,
            price: edits.price ?? editingItem.price,
            imageUrl: edits.imageUrl ?? editingItem.imageUrl,
          };
          handleEditConfirmed(updated, result);
          setEditingItem(null);
        }}
      />
    </MenuScreenLayout>
  );
}

function PendingReviewEditModal({
  item,
  saving,
  onClose,
  onSave,
  onSaveAndApply,
}: {
  item: PendingReviewItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (edits: PendingReviewEdits) => void | Promise<void>;
  onSaveAndApply: (edits: PendingReviewEdits) => void | Promise<void>;
}) {
  const { m } = useMenuContentStyles();
  const styles = useMemo(() => createRevisionStyles(m), [m]);
  const [productName, setProductName] = useState('');
  const [nameHint, setNameHint] = useState('');
  const [idProducto, setIdProducto] = useState('');
  const [brand, setBrand] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setProductName(item.productName ?? item.nameHint ?? '');
    setNameHint(item.nameHint ?? '');
    setIdProducto(item.id_producto ?? '');
    setBrand(item.brand ?? '');
    setPriceInput(item.price && item.price > 0 ? String(item.price) : '');
    setImageUrl(item.imageUrl ?? '');
    setUploadingImage(false);
    setImageUploadError(null);
  }, [item]);

  const pickAndUploadImage = useCallback(
    async (useCamera: boolean) => {
      if (!item || uploadingImage || saving) return;

      setImageUploadError(null);

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setImageUploadError('Necesitamos acceso a la cámara para sacar la foto.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setImageUploadError('Necesitamos acceso a tus fotos para elegir una imagen.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingImage(true);
      const remoteUrl = await uploadCatalogProductImage(result.assets[0].uri, item.ean);
      setUploadingImage(false);

      if (!remoteUrl) {
        setImageUploadError('No se pudo subir la imagen. Revisá conexión y reglas de Firebase Storage.');
        return;
      }

      setImageUrl(remoteUrl);
    },
    [item, saving, uploadingImage]
  );

  if (!item) return null;

  const userProposal = isUserProductProposal(item);
  const parsedPrice = parsePriceInput(priceInput);
  const edits: PendingReviewEdits = {
    productName: productName.trim(),
    nameHint: nameHint.trim(),
    id_producto: idProducto.trim(),
    brand: brand.trim(),
    price: parsedPrice > 0 ? parsedPrice : undefined,
    imageUrl: imageUrl.trim(),
  };
  const canApply = userProposal
    ? Boolean(edits.productName) && (edits.price ?? 0) > 0
    : Boolean(edits.id_producto);
  const busy = saving || uploadingImage;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.modalBackdropTap}
          onPress={withClickSound(onClose)}
          accessibilityLabel="Cerrar"
        />

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.modalSheet}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar ventana"
            onPress={withClickSound(onClose)}
            style={styles.modalCloseBtn}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={homeColors.textMuted} />
          </Pressable>

          <Text style={styles.modalTitle}>
            {userProposal ? 'Revisar producto cargado por usuario' : 'Modificar pedido'}
          </Text>
          <Text style={styles.modalMeta}>EAN {item.ean} · {item.supermarketName ?? item.supermarketId}</Text>

          <Text style={styles.modalLabel}>Imagen del producto</Text>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.modalPreviewImage} resizeMode="contain" />
          ) : (
            <View style={[styles.modalPreviewImage, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="image-outline" size={28} color={homeColors.textMuted} />
            </View>
          )}

          <View style={styles.modalImageActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sacar foto con cámara"
              onPress={withClickSound(() => void pickAndUploadImage(true))}
              disabled={busy}
              style={({ pressed }) => [
                styles.modalImageBtn,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={homeColors.text} />
              ) : (
                <Ionicons name="camera-outline" size={16} color={homeColors.logoRing} />
              )}
              <Text style={styles.modalImageBtnText}>
                {uploadingImage ? 'Subiendo…' : 'Cámara'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir imagen de galería"
              onPress={withClickSound(() => void pickAndUploadImage(false))}
              disabled={busy}
              style={({ pressed }) => [
                styles.modalImageBtn,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <Ionicons name="images-outline" size={16} color={homeColors.logoRing} />
              <Text style={styles.modalImageBtnText}>Galería</Text>
            </Pressable>
          </View>

          {imageUploadError ? (
            <Text style={styles.modalUploadError} accessibilityRole="alert">
              {imageUploadError}
            </Text>
          ) : null}

          {!userProposal ? (
            <>
              <Text style={styles.modalLabel}>URL de imagen (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://…"
                placeholderTextColor={homeColors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="URL de imagen"
              />
            </>
          ) : null}

          <Text style={styles.modalLabel}>Nombre en catálogo</Text>
          <TextInput
            style={styles.modalInput}
            value={productName}
            onChangeText={setProductName}
            placeholder="Nombre del producto"
            placeholderTextColor={homeColors.textMuted}
            maxLength={120}
            accessibilityLabel="Nombre en catálogo"
          />

          <Text style={styles.modalLabel}>Marca</Text>
          <TextInput
            style={styles.modalInput}
            value={brand}
            onChangeText={setBrand}
            placeholder="Marca del producto"
            placeholderTextColor={homeColors.textMuted}
            maxLength={80}
            accessibilityLabel="Marca"
          />

          <Text style={styles.modalLabel}>Precio en góndola</Text>
          <TextInput
            style={styles.modalInput}
            value={priceInput}
            onChangeText={(text) => setPriceInput(normalizePriceInput(text))}
            placeholder="0"
            placeholderTextColor={homeColors.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Precio en góndola"
          />
          {parsedPrice > 0 ? (
            <Text style={styles.cardPrice}>{formatCurrency(parsedPrice)}</Text>
          ) : null}

          {userProposal ? (
            <Text style={styles.modalHelp}>
              Subí tu foto con fondo blanco desde Cámara/Galería. Al aprobar, se publica en el catálogo
              global para futuros escaneos.
            </Text>
          ) : null}

          {!userProposal ? (
            <>
              <Text style={styles.modalLabel}>Nombre detectado / hint</Text>
              <TextInput
                style={styles.modalInput}
                value={nameHint}
                onChangeText={setNameHint}
                placeholder="Texto del escaneo o reporte"
                placeholderTextColor={homeColors.textMuted}
                maxLength={120}
                accessibilityLabel="Nombre detectado"
              />

              <Text style={styles.modalLabel}>ID interno del super</Text>
              <TextInput
                style={styles.modalInput}
                value={idProducto}
                onChangeText={setIdProducto}
                placeholder="ID del producto en el super"
                placeholderTextColor={homeColors.textMuted}
                autoCapitalize="none"
                accessibilityLabel="ID interno del supermercado"
              />
            </>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios sin aplicar"
              onPress={withClickSound(() => void onSave(edits))}
              disabled={busy}
              style={({ pressed }) => [
                styles.modalSaveBtn,
                pressed && !busy && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={homeColors.text} />
              ) : (
                <Ionicons name="save-outline" size={16} color={homeColors.text} />
              )}
              <Text style={styles.modalSaveText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar y cargar a la base de datos"
              onPress={withClickSound(() => void onSaveAndApply(edits))}
              disabled={busy || !canApply}
              style={({ pressed }) => [
                styles.modalApplyBtn,
                pressed && !busy && canApply && styles.pressed,
                (busy || !canApply) && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.modalApplyText}>
                {saving ? 'Aplicando…' : userProposal ? 'Aprobar y publicar' : 'Guardar y aplicar'}
              </Text>
            </Pressable>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReviewCard({
  item,
  confirmed = false,
  applying = false,
  dismissing = false,
  onApply,
  onDismiss,
  onModify,
}: {
  item: PendingReviewItem;
  confirmed?: boolean;
  applying?: boolean;
  dismissing?: boolean;
  onApply?: () => void;
  onDismiss?: () => void;
  onModify?: () => void;
}) {
  const { styles: menuContentStyles, m } = useMenuContentStyles();
  const styles = useMemo(() => createRevisionStyles(m), [m]);
  const displayName = getPendingReviewDisplayName(item);
  const proposalFields = getPendingReviewProposalFields(item);
  const proposalLines = describePendingUserProposal(item);
  const userProposal = isUserProductProposal(item);

  return (
    <View style={menuContentStyles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>
          {displayName}
        </Text>
        {userProposal ? (
          <View style={styles.confirmedBadge}>
            <Ionicons name="person-outline" size={14} color={homeColors.logoRing} />
            <Text style={[styles.confirmedText, { color: homeColors.logoRing }]}>Usuario</Text>
          </View>
        ) : null}
        {confirmed ? (
          <View style={styles.confirmedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.confirmedText}>Confirmado</Text>
          </View>
        ) : onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Descartar pedido EAN ${item.ean}`}
            onPress={withClickSound(onDismiss)}
            disabled={dismissing || applying}
            style={({ pressed }) => [
              styles.dismissBtn,
              pressed && !dismissing && !applying && styles.pressed,
              (dismissing || applying) && styles.disabled,
            ]}
          >
            {dismissing ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={{ fontSize: 16 }}>❌</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.cardMeta}>Código de barras (EAN): {item.ean}</Text>

      <Text style={styles.cardMeta}>
        Supermercado: {item.supermarketName ?? item.supermarketId}
      </Text>

      <View style={styles.proposalBox}>
        <Text style={styles.proposalBoxTitle}>Datos propuestos por el usuario</Text>

        <View style={styles.proposalFieldRow}>
          <Text style={styles.proposalFieldLabel}>Producto</Text>
          <Text style={styles.proposalFieldValue}>{proposalFields.productName}</Text>
        </View>

        <View style={styles.proposalFieldRow}>
          <Text style={styles.proposalFieldLabel}>Marca</Text>
          <Text style={styles.proposalFieldValue}>{proposalFields.brand}</Text>
        </View>

        <View style={styles.proposalFieldRow}>
          <Text style={styles.proposalFieldLabel}>Precio</Text>
          <Text style={[styles.proposalFieldValue, proposalFields.priceLabel !== '—' && styles.cardPrice]}>
            {proposalFields.priceLabel}
          </Text>
        </View>

        {!proposalFields.hasProposalData ? (
          <Text style={styles.proposalEmptyHint}>
            Todavía no hay nombre, marca ni precio cargados. Podés revisar, completar y aprobar desde Modificar.
          </Text>
        ) : null}
      </View>

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardPreviewImage} resizeMode="contain" />
      ) : null}

      {item.productName && item.nameHint && item.nameHint !== item.productName ? (
        <Text style={styles.cardHint} numberOfLines={2}>
          Nombre en escaneo: {item.nameHint}
        </Text>
      ) : null}

      <Text style={styles.cardLabel}>Detalle del pedido</Text>
      {proposalLines.map((line) => (
        <Text key={line} style={styles.proposalLine}>
          • {line}
        </Text>
      ))}

      {item.id_producto ? (
        <Text style={styles.cardMeta}>ID interno del super: {item.id_producto}</Text>
      ) : userProposal ? (
        <Text style={styles.cardMeta}>Se publicará con EAN {item.ean} como ID de catálogo</Text>
      ) : (
        <Text style={styles.cardWarn}>Sin ID vinculado aún (vinculá manual desde la app)</Text>
      )}

      {!confirmed && (onModify || onApply) ? (
        <View style={styles.cardActions}>
          {onModify ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Modificar pedido EAN ${item.ean}`}
              onPress={withClickSound(onModify)}
              disabled={applying || dismissing}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.modifyBtn,
                pressed && !applying && !dismissing && styles.pressed,
                (applying || dismissing) && styles.disabled,
              ]}
            >
              <Ionicons name="create-outline" size={14} color={homeColors.text} />
              <Text style={styles.modifyText}>{userProposal ? 'Revisar' : 'Modificar'}</Text>
            </Pressable>
          ) : null}

          {onApply ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aplicar asociación para EAN ${item.ean}`}
              onPress={withClickSound(onApply)}
              disabled={applying || dismissing || (!userProposal && !item.id_producto)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.applyBtn,
                pressed && !applying && !dismissing && styles.pressed,
                (applying || dismissing || (!userProposal && !item.id_producto)) && styles.disabled,
              ]}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name={userProposal ? 'checkmark-done-outline' : 'link-outline'} size={14} color="#FFFFFF" />
              )}
              <Text style={styles.applyText}>
                {applying ? 'Aplicando…' : userProposal ? 'Aprobar' : 'Aplicar'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
