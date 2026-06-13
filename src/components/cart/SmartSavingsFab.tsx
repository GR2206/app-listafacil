import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { formatCurrency } from '@/utils/formatCurrency';
import { cartCompact as c } from '@/theme/cartCompact';
import { homeColors } from '@/theme/home';

const HIDDEN_OFFSET_Y = -160;
const AUTO_DISMISS_MS = 3000;
const TOAST_TEXT_COLOR = '#042A38';
const SWIPE_DISMISS_THRESHOLD = 72;

interface SmartSavingsFabProps {
  supermarketName: string;
  savings: number;
  onPress: () => void;
}

export function SmartSavingsFab({
  supermarketName,
  savings,
  onPress,
}: SmartSavingsFabProps) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET_Y)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [interactive, setInteractive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastTriggeredSavings = useRef<number | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(
    (direction: 'up' | 'right' = 'right') => {
      const exitX = direction === 'right' ? screenWidth : 0;
      const exitY = direction === 'right' ? 0 : HIDDEN_OFFSET_Y;

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: exitX,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: exitY,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setInteractive(false);
        setDismissed(true);
        translateX.setValue(0);
        translateY.setValue(HIDDEN_OFFSET_Y);
      });
    },
    [opacity, screenWidth, translateX, translateY]
  );

  const runEnterAnimation = useCallback(() => {
    setDismissed(false);
    setInteractive(true);
    translateY.setValue(HIDDEN_OFFSET_Y);
    translateX.setValue(0);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 11,
        tension: 90,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_DISMISS_THRESHOLD || gesture.vx > 0.45) {
          dismissToast('right');
          return;
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 120,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 120,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (savings <= 0) {
      lastTriggeredSavings.current = null;
      setDismissed(false);
      setInteractive(false);
      translateY.setValue(HIDDEN_OFFSET_Y);
      translateX.setValue(0);
      opacity.setValue(0);
      return;
    }

    if (lastTriggeredSavings.current === savings) {
      return;
    }

    lastTriggeredSavings.current = savings;
    runEnterAnimation();

    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    autoDismissTimer.current = setTimeout(() => {
      dismissToast('right');
    }, AUTO_DISMISS_MS);
  }, [savings, dismissToast, opacity, runEnterAnimation, translateX, translateY]);

  useEffect(() => {
    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, []);

  if (savings <= 0 || dismissed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + c.margin,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
      pointerEvents={interactive ? 'auto' : 'none'}
      {...panResponder.panHandlers}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Comprar en ${supermarketName} y ahorrar ${formatCurrency(savings)}. Deslizá a la derecha para cerrar.`}
        onPress={onPress}
        style={({ pressed }) => [styles.toast, pressed && styles.toastPressed]}
      >
        <Ionicons name="navigate" size={16} color={TOAST_TEXT_COLOR} />
        <Text style={styles.toastText} numberOfLines={2}>
          Comprar en {supermarketName} y ahorrar {formatCurrency(savings)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={TOAST_TEXT_COLOR} style={styles.swipeHint} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: c.margin,
    right: c.margin,
    zIndex: 100,
    elevation: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: homeColors.neonBlue,
    shadowColor: homeColors.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  toastPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  toastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: TOAST_TEXT_COLOR,
    lineHeight: 16,
  },
  swipeHint: {
    opacity: 0.55,
  },
});
