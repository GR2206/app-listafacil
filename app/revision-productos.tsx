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
} from 'react-native';

import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  applyAllPendingReviewItems,
  applyPendingReviewItem,
  describePendingUserProposal,
  dismissPendingReviewItem,
  getPendingReviewDisplayName,
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

function createRevisionStyles(m: ScaledMenuMetrics) {
  return StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: m.spacingSm,
      marginBottom: m.spacingSm,
    },
    applyAllBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#059669',
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: m.spacingMd,
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

  const handleDismiss = useCallback(
    async (item: PendingReviewItem) => {
      if (dismissingId || applyingId || applyingAll) return;

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
    [applyingAll, applyingId, dismissingId]
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
          disabled={applyingAll || pending.length === 0}
          style={({ pressed }) => [
            styles.applyAllBtn,
            pressed && !applyingAll && styles.pressed,
            (applyingAll || pending.length === 0) && styles.disabled,
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

          <Text style={[styles.sectionTitle, styles.sectionSpacer]}>
            Productos confirmados ({confirmed.length})
          </Text>

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

  useEffect(() => {
    if (!item) return;
    setProductName(item.productName ?? item.nameHint ?? '');
    setNameHint(item.nameHint ?? '');
    setIdProducto(item.id_producto ?? '');
  }, [item]);

  if (!item) return null;

  const edits: PendingReviewEdits = {
    productName: productName.trim(),
    nameHint: nameHint.trim(),
    id_producto: idProducto.trim(),
  };
  const canApply = Boolean(edits.id_producto);

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

          <Text style={styles.modalTitle}>Modificar pedido</Text>
          <Text style={styles.modalMeta}>EAN {item.ean} · {item.supermarketName ?? item.supermarketId}</Text>

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

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios sin aplicar"
              onPress={withClickSound(() => void onSave(edits))}
              disabled={saving}
              style={({ pressed }) => [
                styles.modalSaveBtn,
                pressed && !saving && styles.pressed,
                saving && styles.disabled,
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
              disabled={saving || !canApply}
              style={({ pressed }) => [
                styles.modalApplyBtn,
                pressed && !saving && canApply && styles.pressed,
                (saving || !canApply) && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.modalApplyText}>
                {saving ? 'Aplicando…' : 'Guardar y aplicar'}
              </Text>
            </Pressable>
          </View>
        </View>
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
  const proposalLines = describePendingUserProposal(item);

  return (
    <View style={menuContentStyles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>
          {displayName}
        </Text>
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

      {item.productName && item.nameHint && item.nameHint !== item.productName ? (
        <Text style={styles.cardHint} numberOfLines={2}>
          Nombre en escaneo: {item.nameHint}
        </Text>
      ) : null}

      <Text style={styles.cardLabel}>Qué propone el usuario</Text>
      {proposalLines.map((line) => (
        <Text key={line} style={styles.proposalLine}>
          • {line}
        </Text>
      ))}

      {item.id_producto ? (
        <Text style={styles.cardMeta}>ID interno del super: {item.id_producto}</Text>
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
              <Text style={styles.modifyText}>Modificar</Text>
            </Pressable>
          ) : null}

          {onApply ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aplicar asociación para EAN ${item.ean}`}
              onPress={withClickSound(onApply)}
              disabled={applying || dismissing}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.applyBtn,
                pressed && !applying && !dismissing && styles.pressed,
                (applying || dismissing) && styles.disabled,
              ]}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="link-outline" size={14} color="#FFFFFF" />
              )}
              <Text style={styles.applyText}>{applying ? 'Aplicando…' : 'Aplicar'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
