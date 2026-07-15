import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useCartListScale } from '@/context/CartListScaleContext';
import { radii } from '@/theme';
import { cartListColors as lc } from '@/theme/cartCompact';

export function useCartScreenStyles() {
  const { metrics: c } = useCartListScale();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        savingsBanner: {
          alignSelf: 'stretch',
          marginHorizontal: c.margin,
          marginTop: 4,
          marginBottom: c.gap,
        },
        scanDock: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingTop: 4,
          paddingBottom: 6,
        },
        listToolbar: {
          paddingHorizontal: c.margin,
          gap: c.gap,
        },
        clearBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-end',
          gap: 4,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          borderWidth: 1,
          marginBottom: 2,
          flexShrink: 0,
        },
        clearPressed: {
          opacity: 0.75,
        },
        clearText: {
          fontSize: c.clearFontSize,
          fontWeight: '600',
        },
        showComparisonBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          marginHorizontal: c.margin,
          marginBottom: c.gap,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          borderWidth: 1,
          flexShrink: 1,
        },
        showComparisonText: {
          fontSize: c.clearFontSize,
          fontWeight: '600',
          flexShrink: 1,
        },
        tableHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: c.margin,
          paddingBottom: 2,
          width: '100%',
        },
        colHeader: {
          fontSize: c.colHeaderFontSize,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: lc.textMuted,
        },
        colThumb: {
          width: c.thumbSize,
          marginRight: 4,
          flexShrink: 0,
        },
        colName: {
          flex: 1,
          minWidth: 0,
        },
        colQty: {
          width: c.qtyColWidth,
          maxWidth: c.qtyColWidth,
          textAlign: 'center',
          flexShrink: 0,
        },
        colTotal: {
          width: c.totalColWidth,
          minWidth: c.totalColWidth,
          maxWidth: c.totalColWidth,
          textAlign: 'right',
          marginRight: 4,
          flexShrink: 0,
        },
        colEdit: {
          width: c.editBtnSize,
          flexShrink: 0,
        },
        list: {
          paddingHorizontal: c.margin,
        },
        empty: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: c.margin * 2,
          gap: c.gap,
        },
        emptyTitle: {
          fontSize: c.emptyTitleSize,
          fontWeight: '700',
        },
        emptyHint: {
          fontSize: c.emptyHintSize,
          textAlign: 'center',
          lineHeight: Math.round(c.emptyHintSize * 1.35),
        },
        footerFixed: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
      }),
    [c]
  );
}
