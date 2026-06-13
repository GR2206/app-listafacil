import { View, Text, StyleSheet, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { homeColors } from '@/theme/home';

import { radii } from '@/theme';

export function BottomAdBanner() {
  return (
    <Pressable
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Anunciá tu comercio acá"
    >
      <Ionicons name="mail-outline" size={16} color={homeColors.bannerPremiumBorder} />
      <Text style={styles.text} numberOfLines={2}>
        Anunciá tu comercio acá
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.55)',
    borderWidth: 1.5,
    borderColor: homeColors.bannerPremiumBorder,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 46,
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.35,
    lineHeight: 16,
  },
});
