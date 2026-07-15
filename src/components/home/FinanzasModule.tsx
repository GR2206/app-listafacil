import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { CompactPromoSticker } from '@/components/home/CompactPromoSticker';
import { getAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import {
  fetchPromosBancariasManifest,
  filterPromosForZone,
} from '@/services/promosBancariasManager';
import type { PromosBancariasManifest } from '@/types/promosBancarias';
import { finanzasColors } from '@/theme/finanzas';
import { radii, spacing } from '@/theme';
import { withClickSound } from '@/utils/withClickSound';

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const DAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/** "Promos que podés usar hoy, martes 14 de julio" — cambia con el día / JSON del bot. */
function buildHoyPromoLine(manifest: PromosBancariasManifest | null): string {
  const fecha = manifest?.fecha?.trim();
  let year: number;
  let month: number;
  let day: number;
  let dow: number;

  if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [y, m, d] = fecha.split('-').map(Number);
    year = y;
    month = m;
    day = d;
    // Usar mediodía UTC-3 aprox para evitar desfases de día
    dow = new Date(Date.UTC(y, m - 1, d, 15, 0, 0)).getUTCDay();
  } else {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date());
    const map = Object.fromEntries(
      parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
    );
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    year = Number(map.year);
    month = Number(map.month);
    day = Number(map.day);
    dow = weekdayMap[map.weekday] ?? 0;
  }

  const diaLabel =
    (manifest?.diaLabel?.trim() || DAYS_ES[dow] || '').toLowerCase() || DAYS_ES[dow];
  const mes = MONTHS_ES[month - 1] ?? '';

  return `Promos que podés usar hoy, ${diaLabel} ${day} de ${mes}`;
}

type FinanzasModuleProps = {
  width: number;
  onBack?: () => void;
  showBackButton?: boolean;
  style?: StyleProp<ViewStyle>;
};

function FinanzasBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bgRoot}>
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />
      <View style={styles.bgWash} pointerEvents="none" />
      {children}
    </View>
  );
}

/** Módulo de Finanzas: 2×2 (~4 por carilla), scrolleable si hay más. */
export function FinanzasModule({
  width,
  onBack,
  showBackButton = true,
  style,
}: FinanzasModuleProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [zone, setZone] = useState<string | null>(null);
  const [manifest, setManifest] = useState<PromosBancariasManifest | null>(null);

  useEffect(() => {
    void getAppSetting(SELECTED_ZONE_SETTING_KEY).then(setZone);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { manifest: remote } = await fetchPromosBancariasManifest();
      if (!cancelled) setManifest(remote);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!manifest) return null;
    return filterPromosForZone(manifest, zone);
  }, [manifest, zone]);

  const promos = filtered?.promos_bancarias ?? [];
  const hoyLine = useMemo(() => buildHoyPromoLine(filtered ?? manifest), [filtered, manifest]);

  const hPad = spacing.md;
  const gap = 12;
  const cols = 2;
  // +30% vs celdas chicas anteriores (~width/2 * 0.97)
  const cellWidth = (width - hPad * 2 - gap) / cols;
  const headerBlock = 132;
  const availableH = Math.max(360, screenHeight - insets.top - headerBlock - insets.bottom);
  // 2 filas por carilla → 4 stickers visibles; resto con scroll vertical
  const cellHeight = Math.round((availableH - gap) / 2);

  return (
    <View style={[{ width, flex: 1 }, style]}>
      <FinanzasBackground>
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              {showBackButton && onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al inicio"
                  onPress={withClickSound(onBack)}
                  style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="chevron-back" size={24} color={finanzasColors.accent} />
                </Pressable>
              ) : (
                <View style={styles.backBtn} />
              )}
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>MÓDULO DE FINANZAS</Text>
                <Text style={styles.title} numberOfLines={1}>
                  Hoy en mi bolsillo
                </Text>
              </View>
              <View style={styles.backBtn} />
            </View>
            <Text
              style={styles.hoyLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {hoyLine}
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: hPad,
                paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl,
              },
            ]}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {promos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No hay promos bancarias aplicables a tu zona por ahora. Volvé mañana o cambiá de
                  zona.
                </Text>
              </View>
            ) : (
              <View style={[styles.mosaic, { gap }]}>
                {promos.map((item, index) => (
                  <CompactPromoSticker
                    key={item.id}
                    item={item}
                    index={index}
                    width={cellWidth}
                    height={cellHeight}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </FinanzasBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    flex: 1,
    backgroundColor: finanzasColors.background,
    overflow: 'hidden',
  },
  bgWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 200,
    backgroundColor: finanzasColors.accentSoft,
    opacity: 0.85,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: finanzasColors.backgroundDeep,
    opacity: 0.9,
  },
  headerBlock: {
    paddingBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: finanzasColors.accent,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: finanzasColors.text,
    textAlign: 'center',
  },
  hoyLine: {
    marginTop: 2,
    marginHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: finanzasColors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
  },
  mosaic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyCard: {
    backgroundColor: finanzasColors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: finanzasColors.border,
    padding: spacing.md,
  },
  emptyText: {
    color: finanzasColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
