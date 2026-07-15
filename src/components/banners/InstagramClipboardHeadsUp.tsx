import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useInstagramClipboardNoticeStore } from '@/store/instagramClipboardNoticeStore';
import { radii, spacing, typography } from '@/theme';

const ACCENT = '#25D366';

export function InstagramClipboardHeadsUp() {
  const insets = useSafeAreaInsets();
  const visible = useInstagramClipboardNoticeStore((s) => s.visible);
  const title = useInstagramClipboardNoticeStore((s) => s.title);
  const body = useInstagramClipboardNoticeStore((s) => s.body);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    slideAnim.setValue(-120);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.host} pointerEvents="none">
        <Animated.View
          style={[
            styles.card,
            {
              marginTop: insets.top + spacing.sm,
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.accent} />
          <View style={styles.iconWrap}>
            <Ionicons name="clipboard-outline" size={22} color={ACCENT} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.body} numberOfLines={3}>
              {body}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: ACCENT,
  },
  iconWrap: {
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  body: {
    fontSize: typography.caption,
    color: '#444444',
    marginTop: 2,
    lineHeight: 18,
  },
});
