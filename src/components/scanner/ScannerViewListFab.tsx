import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { hexToRgba } from '@/utils/hexToRgba';
import { spacing, radii, typography } from '@/theme';

const STORAGE_KEY = 'scanner_list_fab_corner_v1';
const FAB_MARGIN = 16;
const DRAG_THRESHOLD = 8;

type FabCorner = 'left' | 'right';

interface ScannerViewListFabProps {
  onPress: () => void;
}

function cornerToX(corner: FabCorner, containerW: number, fabW: number): number {
  return corner === 'left' ? FAB_MARGIN : Math.max(FAB_MARGIN, containerW - fabW - FAB_MARGIN);
}

function xToCorner(x: number, containerW: number, fabW: number): FabCorner {
  const center = x + fabW / 2;
  return center < containerW / 2 ? 'left' : 'right';
}

export function ScannerViewListFab({ onPress }: ScannerViewListFabProps) {
  const { theme } = useSupermarketTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 16) + 20;

  const containerWidth = useRef(0);
  const fabWidth = useRef(156);
  const positionX = useRef(new Animated.Value(FAB_MARGIN)).current;
  const dragStartX = useRef(FAB_MARGIN);
  const moved = useRef(false);
  const placed = useRef(false);
  const savedCorner = useRef<FabCorner>('right');
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const placeFab = useCallback(
    (corner: FabCorner) => {
      const W = containerWidth.current;
      const F = fabWidth.current;
      if (W <= 0 || F <= 0) return;

      const x = cornerToX(corner, W, F);
      positionX.setValue(x);
      dragStartX.current = x;
      placed.current = true;
    },
    [positionX]
  );

  const tryInitialPlacement = useCallback(() => {
    if (placed.current) return;
    if (containerWidth.current <= 0 || fabWidth.current <= 0) return;
    placeFab(savedCorner.current);
  }, [placeFab]);

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      savedCorner.current = saved === 'left' ? 'left' : 'right';
      tryInitialPlacement();
    })();
  }, [tryInitialPlacement]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
      onPanResponderGrant: () => {
        moved.current = false;
        positionX.stopAnimation((value) => {
          dragStartX.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > DRAG_THRESHOLD) {
          moved.current = true;
        }

        const W = containerWidth.current;
        const F = fabWidth.current;
        if (W <= 0) return;

        const leftX = FAB_MARGIN;
        const rightX = Math.max(leftX, W - F - FAB_MARGIN);
        const next = Math.min(rightX, Math.max(leftX, dragStartX.current + gesture.dx));
        positionX.setValue(next);
      },
      onPanResponderRelease: () => {
        if (!moved.current) {
          onPressRef.current();
          return;
        }

        const W = containerWidth.current;
        const F = fabWidth.current;
        if (W <= 0) return;

        positionX.stopAnimation((currentX) => {
          const corner = xToCorner(currentX, W, F);
          const snapX = cornerToX(corner, W, F);

          Animated.spring(positionX, {
            toValue: snapX,
            useNativeDriver: false,
            friction: 8,
            tension: 80,
          }).start(() => {
            dragStartX.current = snapX;
          });

          savedCorner.current = corner;
          void AsyncStorage.setItem(STORAGE_KEY, corner);
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View
      pointerEvents="box-none"
      style={styles.layer}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
          containerWidth.current = width;
          tryInitialPlacement();
        }
      }}
    >
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel="Ver mi lista. Arrastrá horizontalmente para cambiar de lado."
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          if (width > 0) {
            fabWidth.current = width;
            tryInitialPlacement();
          }
        }}
        style={[
          styles.fab,
          {
            bottom,
            left: positionX,
            backgroundColor: hexToRgba(theme.primary, 0.9),
            borderColor: hexToRgba(theme.gridBorder, 0.55),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="list-outline" size={20} color={theme.textOnPrimary} />
        <Text style={[styles.label, { color: theme.textOnPrimary }]}>Ver mi lista</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
  },
  fab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
