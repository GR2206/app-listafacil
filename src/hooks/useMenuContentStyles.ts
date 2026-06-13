import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useCartListScale } from '@/context/CartListScaleContext';
import { createScaledMenuMetrics } from '@/theme/scaledMenuMetrics';
import { homeColors } from '@/theme/home';
import { radii, spacing } from '@/theme';
import type { ScaledMenuMetrics } from '@/theme/scaledMenuMetrics';

export function createMenuContentStyles(m: ScaledMenuMetrics) {
  return StyleSheet.create({
    headerPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: m.spacingSm,
      marginHorizontal: m.paddingH,
      marginTop: m.headerMarginTop,
      marginBottom: m.headerMarginBottom,
      paddingHorizontal: m.spacingMd,
      paddingVertical: m.spacingMd,
      backgroundColor: homeColors.panel,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
    },
    panel: {
      backgroundColor: homeColors.panel,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      padding: m.spacingMd,
    },
    card: {
      backgroundColor: homeColors.panel,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      padding: m.spacingMd,
      marginBottom: m.sectionGap,
    },
    sectionPanel: {
      backgroundColor: homeColors.panel,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      padding: m.spacingMd,
      marginBottom: m.sectionGap,
    },
    emptyPanel: {
      backgroundColor: homeColors.panel,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: homeColors.border,
      padding: m.spacingLg,
      marginTop: m.spacingLg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: m.body,
      color: homeColors.textMuted,
      textAlign: 'center',
    },
    hintText: {
      fontSize: m.caption,
      color: homeColors.textMuted,
      lineHeight: Math.round(m.caption * 1.35),
      marginBottom: m.spacingMd,
    },
  });
}

export function useMenuContentStyles() {
  const { scale } = useCartListScale();
  const m = useMemo(() => createScaledMenuMetrics(scale), [scale]);
  const styles = useMemo(() => createMenuContentStyles(m), [m]);

  return {
    styles,
    m,
    MENU_CONTENT_PADDING_H: m.paddingH,
    MENU_CONTENT_PADDING_BOTTOM: m.paddingBottom,
    MENU_SECTION_GAP: m.sectionGap,
  };
}
