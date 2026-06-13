import { spacing, typography } from '@/theme';
import { clampCartScale } from '@/theme/scaledCartMetrics';

function scaleValue(value: number, factor: number, min = 1): number {
  return Math.max(min, Math.round(value * factor));
}

export interface ScaledMenuMetrics {
  body: number;
  bodyLarge: number;
  title: number;
  caption: number;
  button: number;
  iconSm: number;
  iconMd: number;
  iconLg: number;
  paddingH: number;
  paddingBottom: number;
  sectionGap: number;
  headerMarginTop: number;
  headerMarginBottom: number;
  spacingXs: number;
  spacingSm: number;
  spacingMd: number;
  spacingLg: number;
}

/** Métricas de menú derivadas del zoom global de Mi Lista. */
export function createScaledMenuMetrics(scale: number): ScaledMenuMetrics {
  const factor = clampCartScale(scale);

  return {
    body: scaleValue(typography.body, factor),
    bodyLarge: scaleValue(typography.bodyLarge, factor),
    title: scaleValue(typography.title, factor),
    caption: scaleValue(typography.caption, factor),
    button: scaleValue(typography.button, factor),
    iconSm: scaleValue(18, factor),
    iconMd: scaleValue(22, factor),
    iconLg: scaleValue(26, factor),
    paddingH: scaleValue(spacing.md, factor),
    paddingBottom: scaleValue(spacing.xl, factor),
    sectionGap: scaleValue(spacing.sm, factor),
    headerMarginTop: scaleValue(spacing.sm, factor),
    headerMarginBottom: scaleValue(spacing.sm, factor),
    spacingXs: scaleValue(spacing.xs, factor),
    spacingSm: scaleValue(spacing.sm, factor),
    spacingMd: scaleValue(spacing.md, factor),
    spacingLg: scaleValue(spacing.lg, factor),
  };
}
