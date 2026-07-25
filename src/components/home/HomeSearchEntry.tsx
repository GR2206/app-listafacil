import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { withNavFeedback } from '@/utils/withNavFeedback';
import { MENU_CONTENT_PADDING_H } from '@/theme/menuContentStyles';
import { spacing, radii } from '@/theme';

const BOX_BG = '#E8EAED';
const ICON_COLOR = '#5F6368';
const PLACEHOLDER = '#80868B';

/** Cajón de búsqueda entre el carrusel y el título del home. */
export function HomeSearchEntry() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Buscar producto"
        onPress={withNavFeedback(() => router.push('/buscar'))}
        style={({ pressed }) => [styles.box, pressed && styles.pressed]}
      >
        <Ionicons name="search" size={20} color={ICON_COLOR} />
        <Text style={styles.placeholder} numberOfLines={1}>
          Buscar producto…
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: MENU_CONTENT_PADDING_H,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  box: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BOX_BG,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: PLACEHOLDER,
  },
});
