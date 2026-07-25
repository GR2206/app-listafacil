import { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { UserPriceRecord } from '@/db/userPrices';
import type { TicketSubstituteMap } from '@/services/similarProductSubstitute';
import type { CartLine } from '@/types';
import { radii } from '@/theme';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  resolveCartLinesForSupermarket,
  type ResolvedCartLine,
} from '@/utils/resolveCartLines';
import { withClickSound } from '@/utils/withClickSound';

interface TicketQuoteDetailModalProps {
  visible: boolean;
  supermarketId: string;
  supermarketName: string;
  ticketTotal: number;
  items: CartLine[];
  pricesByBarcode: Record<string, Record<string, number>>;
  syncedAtByBarcode?: Record<string, Record<string, string>>;
  userPricesByBarcode?: Record<string, UserPriceRecord>;
  substitutesByKey?: TicketSubstituteMap;
  onClose: () => void;
  onOpenMaps?: (supermarketId: string) => void;
}

export function TicketQuoteDetailModal({
  visible,
  supermarketId,
  supermarketName,
  ticketTotal,
  items,
  pricesByBarcode,
  syncedAtByBarcode = {},
  userPricesByBarcode = {},
  substitutesByKey = {},
  onClose,
  onOpenMaps,
}: TicketQuoteDetailModalProps) {
  const insets = useSafeAreaInsets();

  const lines = useMemo(
    () =>
      resolveCartLinesForSupermarket(items, pricesByBarcode, supermarketId, {
        syncedAtByBarcode,
        userPricesByBarcode,
        substitutesByKey,
      }),
    [
      items,
      pricesByBarcode,
      supermarketId,
      syncedAtByBarcode,
      userPricesByBarcode,
      substitutesByKey,
    ]
  );

  const substitutedCount = lines.filter((line) => line.isSubstitute).length;
  const missingCount = lines.filter((line) => line.unitPrice <= 0).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={withClickSound(onClose)} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.grab} />

          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={1}>
                Ticket · {supermarketName}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {missingCount > 0
                  ? `Ticket incompleto · ${missingCount} sin precio (total solo de lo encontrado)`
                  : substitutedCount > 0
                    ? `${substitutedCount} producto${substitutedCount === 1 ? '' : 's'} para completar el ticket`
                    : 'Precios del mismo producto'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={withClickSound(onClose)}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={lc.textMuted} />
            </Pressable>
          </View>

          <FlatList
            data={lines}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <TicketLineRow line={item} />}
          />

          <View style={styles.footer}>
            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>Total estimado</Text>
              <Text style={styles.totalValue}>{formatCurrency(ticketTotal)}</Text>
            </View>

            {onOpenMaps ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${supermarketName} en Google Maps`}
                onPress={withClickSound(() => onOpenMaps(supermarketId))}
                style={({ pressed }) => [styles.mapsBtn, pressed && { opacity: 0.88 }]}
              >
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.mapsBtnText}>Ver en Maps</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TicketLineRow({ line }: { line: ResolvedCartLine }) {
  const lineTotal = line.unitPrice * line.quantity;
  const missing = line.unitPrice <= 0;

  return (
    <View style={styles.lineRow}>
      <View style={styles.lineMain}>
        <Text style={[styles.lineName, missing && styles.lineNameMuted]} numberOfLines={2}>
          {line.name}
          {line.quantity > 1 ? ` ×${line.quantity}` : ''}
        </Text>

        {line.isSubstitute && line.substituteName ? (
          <View style={styles.similarBlock}>
            <Text style={styles.similarBadge}>
              {line.substituteKind === 'same_product' ? 'Mismo prod.' : 'Similar'}
            </Text>
            <Text style={styles.similarName} numberOfLines={2}>
              → {line.substituteName}
            </Text>
          </View>
        ) : null}

        {missing ? <Text style={styles.missingHint}>Sin precio en este super</Text> : null}
      </View>

      <Text style={[styles.linePrice, missing && styles.lineNameMuted]}>
        {missing ? '—' : formatCurrency(lineTotal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: lc.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lc.border,
    overflow: 'hidden',
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: lc.border,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: c.margin,
    paddingBottom: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: lc.text,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: lc.textMuted,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: c.margin,
    paddingBottom: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lc.border,
  },
  lineMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  lineName: {
    fontSize: c.nameFontSize,
    fontWeight: '700',
    color: lc.text,
  },
  lineNameMuted: {
    color: lc.textSecondary,
  },
  similarBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  similarBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#0B6E4F',
    backgroundColor: 'rgba(11,110,79,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  similarName: {
    flex: 1,
    fontSize: Math.max(12, c.nameFontSize - 1),
    fontWeight: '600',
    color: lc.textMuted,
  },
  missingHint: {
    fontSize: 11,
    fontWeight: '600',
    color: lc.textSecondary,
  },
  linePrice: {
    fontSize: c.nameFontSize,
    fontWeight: '800',
    color: lc.text,
    minWidth: 72,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: c.margin,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lc.border,
  },
  totalBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: lc.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: lc.text,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: '#1A73E8',
  },
  mapsBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
