import { useRef } from 'react';

import {

  Animated,

  PanResponder,

  Text,

  StyleSheet,

  Platform,

  View,

} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';



import { useSupermarketTheme } from '@/context/ThemeContext';

import { useCartListScale } from '@/context/CartListScaleContext';

import { cartCompact as c } from '@/theme/cartCompact';



interface ManualAddFabProps {

  onPress: () => void;

}



const DRAG_THRESHOLD = 8;

const FAB_RIGHT = c.margin;

const BOTTOM_MARGIN = 6;

/** Altura aprox. del FAB — solo para bajar la posición inicial (no cambia el tamaño). */
const FAB_BASE_HEIGHT = 40;

/** Ubicación inicial dos veces más baja que la altura del botón. */
const FAB_INITIAL_DROP = FAB_BASE_HEIGHT * 2;



export function ManualAddFab({ onPress }: ManualAddFabProps) {

  const { theme } = useSupermarketTheme();

  const { metrics } = useCartListScale();

  const insets = useSafeAreaInsets();

  const fabBottom = metrics.listBottomPadding + 8 - FAB_INITIAL_DROP;



  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const dragOffset = useRef({ x: 0, y: 0 });

  const moved = useRef(false);

  const onPressRef = useRef(onPress);

  onPressRef.current = onPress;



  const fabSize = useRef({ width: 148, height: 40 });

  const containerSize = useRef({ width: 0, height: 0 });



  const clampOffset = (x: number, y: number) => {

    const { width: containerW, height: containerH } = containerSize.current;

    const { width: fabW, height: fabH } = fabSize.current;



    if (containerW <= 0 || containerH <= 0) {

      return { x, y };

    }



    const minX = -(containerW - fabW - FAB_RIGHT - c.margin);

    const maxY = Math.max(0, fabBottom - insets.bottom - BOTTOM_MARGIN);

    const minY = -(containerH - fabH - fabBottom - c.margin - 48);



    return {

      x: Math.min(0, Math.max(minX, x)),

      y: Math.min(maxY, Math.max(minY, y)),

    };

  };



  const panResponder = useRef(

    PanResponder.create({

      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gesture) =>

        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,

      onPanResponderGrant: () => {

        moved.current = false;

        translate.setOffset({

          x: dragOffset.current.x,

          y: dragOffset.current.y,

        });

        translate.setValue({ x: 0, y: 0 });

      },

      onPanResponderMove: (_, gesture) => {

        if (Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD) {

          moved.current = true;

        }

        translate.setValue({ x: gesture.dx, y: gesture.dy });

      },

      onPanResponderRelease: (_, gesture) => {

        translate.flattenOffset();

        const next = clampOffset(

          dragOffset.current.x + gesture.dx,

          dragOffset.current.y + gesture.dy,

        );

        dragOffset.current = next;

        translate.setValue(next);



        if (!moved.current) {

          onPressRef.current();

        }

      },

      onPanResponderTerminationRequest: () => false,

    }),

  ).current;



  return (

    <View

      pointerEvents="box-none"

      style={styles.dragLayer}

      onLayout={(event) => {

        const { width, height } = event.nativeEvent.layout;

        if (width > 0 && height > 0) {

          containerSize.current = { width, height };

        }

      }}

    >

      <Animated.View

        accessibilityRole="button"

        accessibilityLabel="Agregar producto manualmente. Arrastrá para mover."

        onLayout={(event) => {

          const { width, height } = event.nativeEvent.layout;

          if (width > 0 && height > 0) {

            fabSize.current = { width, height };

          }

        }}

        style={[

          styles.fab,

          {

            backgroundColor: theme.primary,

            bottom: fabBottom,

            transform: translate.getTranslateTransform(),

          },

        ]}

        {...panResponder.panHandlers}

      >

        <Ionicons name="create-outline" size={Math.round(18 * 0.867)} color={theme.textOnPrimary} />

        <Text style={[styles.fabText, { color: theme.textOnPrimary }]}>Agregar Manual</Text>

      </Animated.View>

    </View>

  );

}



const styles = StyleSheet.create({

  dragLayer: {

    ...StyleSheet.absoluteFillObject,

    zIndex: 20,

  },

  fab: {

    position: 'absolute',

    right: FAB_RIGHT,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 12,

    paddingVertical: 10,

    borderRadius: 20,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.28,

    shadowRadius: 8,

    elevation: 12,

    ...Platform.select({

      ios: {

        shadowOffset: { width: 0, height: 4 },

      },

    }),

  },

  fabText: {

    fontSize: Math.round(13 * 0.867),

    fontWeight: '800',

    letterSpacing: 0.2,

  },

});


