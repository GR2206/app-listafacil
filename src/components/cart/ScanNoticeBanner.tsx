import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '@/theme';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';

interface ScanNoticeBannerProps {
  message: string;
}

export function ScanNoticeBanner({ message }: ScanNoticeBannerProps) {
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: lc.surfaceElevated,
          borderColor: lc.border,
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="information-circle-outline" size={c.noticeIconSize} color={lc.textMuted} />
      <Text style={[styles.text, { color: lc.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: c.gap,
    marginHorizontal: c.margin,
    marginBottom: c.gap,
    paddingVertical: c.gap,
    paddingHorizontal: c.margin,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: c.noticeFontSize,
    fontWeight: '600',
  },
});
