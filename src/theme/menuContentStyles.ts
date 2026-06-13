import { StyleSheet } from 'react-native';

import { homeColors } from '@/theme/home';
import { spacing, radii, typography } from '@/theme';

/** Márgenes unificados para pantallas del menú (sin saltos entre rutas). */
export const MENU_CONTENT_PADDING_H = spacing.md;
export const MENU_CONTENT_PADDING_BOTTOM = spacing.xl;
export const MENU_SECTION_GAP = spacing.sm;
export const MENU_HEADER_MARGIN_TOP = spacing.sm;
export const MENU_HEADER_MARGIN_BOTTOM = spacing.sm;

export const menuContentStyles = StyleSheet.create({
  headerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: MENU_CONTENT_PADDING_H,
    marginTop: MENU_HEADER_MARGIN_TOP,
    marginBottom: MENU_HEADER_MARGIN_BOTTOM,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    padding: spacing.md,
  },
  card: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.md,
    marginBottom: MENU_SECTION_GAP,
  },
  sectionPanel: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.md,
    marginBottom: MENU_SECTION_GAP,
  },
  emptyPanel: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.body,
    color: homeColors.textMuted,
    textAlign: 'center',
  },
  hintText: {
    fontSize: typography.caption,
    color: homeColors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});
