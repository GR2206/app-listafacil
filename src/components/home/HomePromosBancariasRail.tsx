import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import {
  fetchPromosBancariasManifest,
  filterPromosForZone,
  getStartupPromosBancariasManifest,
} from '@/services/promosBancariasManager';
import type { PromoBancariaItem, PromosBancariasManifest } from '@/types/promosBancarias';
import { PromoReintegroSticker } from '@/components/home/PromoReintegroSticker';
import { withClickSound } from '@/utils/withClickSound';
import { homeColors } from '@/theme/home';
import { spacing } from '@/theme';

type HomePromosBancariasRailProps = {
  /** Abre el Módulo de Finanzas (preferible al push de ruta). */
  onOpenFinanzas?: () => void;
};

/** Carrusel horizontal “Hoy en mi bolsillo” con stickers de reintegro. */
export function HomePromosBancariasRail({ onOpenFinanzas }: HomePromosBancariasRailProps) {
  const router = useRouter();
  const [zone, setZone] = useState<string | null>(null);
  const [manifest, setManifest] = useState<PromosBancariasManifest | null>(
    () => getStartupPromosBancariasManifest()
  );

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
  if (!filtered || promos.length === 0) return null;

  const openAll = withClickSound(() => {
    if (onOpenFinanzas) {
      onOpenFinanzas();
      return;
    }
    router.push('/promos-bancarias');
  });

  const renderItem = ({ item, index }: ListRenderItemInfo<PromoBancariaItem>) => (
    <PromoReintegroSticker item={item} index={index} onPress={openAll} variant="rail" />
  );

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Hoy en mi bolsillo</Text>
          <Text style={styles.header} numberOfLines={2}>
            {filtered.header}
          </Text>
        </View>
        <Pressable
          onPress={openAll}
          accessibilityRole="button"
          accessibilityLabel="Abrir módulo de finanzas"
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={16} color={homeColors.neonBlue} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={promos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        nestedScrollEnabled
        directionalLockEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: homeColors.neonBlueSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  header: {
    color: homeColors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  seeAllText: {
    color: homeColors.neonBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
