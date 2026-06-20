import { ScrollView, StyleSheet, Text, View, useWindowDimensions, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import { SupermarketGridButton } from '@/components/home/SupermarketGridButton';
import { HomeTexturedBackground } from '@/components/home/HomeTexturedBackground';
import { getHomeGridMetrics } from '@/components/home/homeGridLayout';
import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';
import { homeColors } from '@/theme/home';
import { spacing } from '@/theme';
import { withNavFeedback } from '@/utils/withNavFeedback';
import { Ionicons } from '@expo/vector-icons';

const PREVIEW_MARKETS = MOCK_SUPERMARKETS.slice(0, 3);

function PreviewSection({ presetId }: { presetId: 'current' | 'proposed' }) {
  const { width } = useWindowDimensions();
  const preset = getOrbVisualPreset(presetId);
  const { orbSize, slotOrbSize } = getHomeGridMetrics(width, presetId);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{preset.label}</Text>
      <Text style={styles.sectionHint}>{preset.description}</Text>
      <Text style={styles.sectionMeta}>
        Espacio: {preset.grid.colGap}px / {preset.grid.rowGap}px · Destello: +
        {Math.round((preset.glowBackgroundScale - 1) * 100)}%
      </Text>

      <View style={[styles.previewRow, { columnGap: preset.grid.colGap }]}>
        {PREVIEW_MARKETS.map((market) => (
          <SupermarketGridButton
            key={`${presetId}-${market.id}`}
            market={market}
            orbSize={orbSize}
            slotOrbSize={slotOrbSize}
            visualPreset={presetId}
            onPress={() => undefined}
          />
        ))}
      </View>
    </View>
  );
}

export default function OrbPreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <HomeTexturedBackground paddingTop={insets.top}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={withNavFeedback(() => router.back())}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        >
          <Ionicons name="arrow-back" size={22} color={homeColors.menuIcon} />
        </Pressable>
        <Text style={styles.title}>Vista previa — botones</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          La home ya usa el diseño nuevo. Acá podés comparar con la versión anterior. Tocá cada botón
          para sentir la animación 3D.
        </Text>

        <PreviewSection presetId="current" />
        <PreviewSection presetId="proposed" />
      </ScrollView>
    </HomeTexturedBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  backPressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(210, 230, 245, 0.9)',
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(8, 14, 24, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.18)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: homeColors.logoRing,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(200, 220, 240, 0.88)',
  },
  sectionMeta: {
    fontSize: 11,
    color: 'rgba(140, 180, 217, 0.75)',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
});
