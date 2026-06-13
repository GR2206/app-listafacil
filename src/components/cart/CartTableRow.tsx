import { useCallback, useEffect, useMemo, useRef } from 'react';

import { View, Text, Image, Pressable, StyleSheet, Animated, Easing } from 'react-native';

import { useHoldRepeatPress } from '@/hooks/useHoldRepeatPress';
import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';

import { CartPriceText } from '@/components/cart/CartPriceText';
import { formatPriceDisplay } from '@/utils/formatPriceDisplay';

import type { PriceChangeDirection } from '@/hooks/usePriceChangeHints';
import type { CartLine } from '@/types';

import { cartListColors as lc } from '@/theme/cartCompact';
import { isManualCartLine } from '@/utils/manualProduct';

const GOLD_FLASH = 'rgba(255, 215, 0, 0.3)';

const FLASH_DURATION_MS = 1000;
const REMOVE_FADE_MS = 280;

interface CartTableRowProps {
  item: CartLine;
  onEdit: () => void;
  onIncrement: () => void;
  onIncrementStep: () => boolean;
  onDecrement: () => void;
  onDecrementStep: () => boolean;
  highlight?: boolean;
  removing?: boolean;
  onRemoveAnimationEnd?: () => void;
  priceChange?: PriceChangeDirection | null;
}

const QTY_PULSE_UP_MS = 55;
const QTY_PULSE_DOWN_MS = 110;
const BTN_BUMP_DOWN_MS = 50;
const PRICE_DOWN_COLOR = '#16A34A';
const PRICE_UP_COLOR = '#DC2626';

export function CartTableRow({
  item,
  onEdit,
  onIncrement,
  onIncrementStep,
  onDecrement,
  onDecrementStep,
  highlight = false,
  removing = false,
  onRemoveAnimationEnd,
  priceChange = null,
}: CartTableRowProps) {
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();
  const manual = isManualCartLine(item);
  const lineTotal = item.unitPrice * item.quantity;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const removeAnim = useRef(new Animated.Value(1)).current;
  const qtyScaleAnim = useRef(new Animated.Value(1)).current;
  const minusBtnScale = useRef(new Animated.Value(1)).current;
  const plusBtnScale = useRef(new Animated.Value(1)).current;
  const qtyPulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const btnBumpRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastQtyPulseAtRef = useRef(0);

  const styles = useMemo(() => createStyles(c), [c]);

  const bumpQtyButton = useCallback((scaleAnim: Animated.Value) => {
    btnBumpRef.current?.stop();
    scaleAnim.setValue(1);
    btnBumpRef.current = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.86,
        duration: BTN_BUMP_DOWN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 280,
        useNativeDriver: true,
      }),
    ]);
    btnBumpRef.current.start();
  }, []);

  const qtyActionFeedback = useCallback(
    (scaleAnim: Animated.Value) => {
      bumpQtyButton(scaleAnim);
      fireInstantFeedback({ sound: 'tecla', haptic: 'light' });
    },
    [bumpQtyButton]
  );

  const minusActionFeedback = useCallback(() => {
    bumpQtyButton(minusBtnScale);
    const feedback =
      item.quantity <= 1
        ? { sound: 'delete' as const, haptic: 'light' as const }
        : { sound: 'tecla' as const, haptic: 'light' as const };
    fireInstantFeedback(feedback);
  }, [bumpQtyButton, item.quantity, minusBtnScale]);

  const pulseQuantity = useCallback(() => {
    const now = Date.now();
    if (now - lastQtyPulseAtRef.current < 90) return;
    lastQtyPulseAtRef.current = now;

    qtyPulseRef.current?.stop();
    qtyScaleAnim.setValue(1);
    qtyPulseRef.current = Animated.sequence([
      Animated.timing(qtyScaleAnim, {
        toValue: 1.22,
        duration: QTY_PULSE_UP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(qtyScaleAnim, {
        toValue: 1,
        duration: QTY_PULSE_DOWN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    qtyPulseRef.current.start();
  }, [qtyScaleAnim]);

  useEffect(() => {
    pulseQuantity();
  }, [item.quantity, pulseQuantity]);

  const incrementHold = useHoldRepeatPress({
    onSinglePress: onIncrement,
    onRepeatTick: onIncrementStep,
    onAction: () => qtyActionFeedback(plusBtnScale),
  });

  const decrementHold = useHoldRepeatPress({
    onSinglePress: onDecrement,
    onRepeatTick: onDecrementStep,
    onAction: minusActionFeedback,
  });

  useEffect(() => {
    if (!highlight) return;

    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: FLASH_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [highlight, flashAnim, item.id, item.quantity, item.scannedAt]);

  useEffect(() => {
    if (!removing) {
      removeAnim.setValue(1);
      return;
    }

    removeAnim.setValue(1);
    Animated.timing(removeAnim, {
      toValue: 0,
      duration: REMOVE_FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onRemoveAnimationEnd?.();
    });
  }, [removing, removeAnim, onRemoveAnimationEnd]);

  const rowBackground = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', GOLD_FLASH],
  });

  const removeOpacity = removeAnim;
  const removeScale = removeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: rowBackground,
          opacity: removeOpacity,
          transform: [{ scale: removeScale }],
        },
      ]}
      accessibilityLabel={`${item.name}, cantidad ${item.quantity}, ${formatPriceDisplay(lineTotal)}`}
    >
      {item.imageUrl && !manual ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="contain" />
      ) : (
        <View
          style={[
            styles.thumbPlaceholder,
            {
              backgroundColor: manual ? `${theme.primary}18` : lc.surfaceElevated,
              borderColor: manual ? theme.primary : 'transparent',
              borderWidth: manual ? 1 : 0,
            },
          ]}
        >
          <Ionicons
            name={manual ? 'pencil' : 'cube-outline'}
            size={Math.max(12, c.editIconSize - 2)}
            color={manual ? theme.primary : lc.textMuted}
          />
        </View>
      )}

      <View style={styles.nameWrap}>
        <Text style={[styles.name, { color: lc.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        {manual ? (
          <Text
            style={[styles.manualBadge, { color: theme.primary }]}
            accessibilityLabel="Producto manual"
          >
            *
          </Text>
        ) : null}
      </View>

      <View style={styles.qtyControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.quantity <= 1
              ? `Eliminar ${item.name} de la lista`
              : `Quitar uno de ${item.name}`
          }
          onPress={decrementHold.onPress}
          onPressIn={decrementHold.onPressIn}
          onPressOut={decrementHold.onPressOut}
          style={styles.qtyBtnPressable}
        >
          <Animated.View
            style={[
              styles.qtyBtn,
              { backgroundColor: lc.surfaceElevated, borderColor: lc.border },
              { transform: [{ scale: minusBtnScale }] },
            ]}
          >
            <Text style={[styles.qtySymbol, { color: lc.text }]}>−</Text>
          </Animated.View>
        </Pressable>

        <Animated.Text
          style={[
            styles.qty,
            { color: lc.text, transform: [{ scale: qtyScaleAnim }] },
          ]}
        >
          {item.quantity}
        </Animated.Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Agregar uno de ${item.name}`}
          onPress={incrementHold.onPress}
          onPressIn={incrementHold.onPressIn}
          onPressOut={incrementHold.onPressOut}
          style={styles.qtyBtnPressable}
        >
          <Animated.View
            style={[
              styles.qtyBtn,
              { backgroundColor: theme.primary, borderColor: theme.primary },
              { transform: [{ scale: plusBtnScale }] },
            ]}
          >
            <Text style={[styles.qtySymbol, { color: theme.textOnPrimary }]}>+</Text>
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.totalWrap}>
        {priceChange ? (
          <Ionicons
            name={priceChange === 'down' ? 'arrow-down' : 'arrow-up'}
            size={Math.max(10, c.totalFontSize - 3)}
            color={priceChange === 'down' ? PRICE_DOWN_COLOR : PRICE_UP_COLOR}
            accessibilityLabel={priceChange === 'down' ? 'Precio bajó' : 'Precio subió'}
          />
        ) : null}
        <CartPriceText
          amount={lineTotal}
          style={[styles.total, { color: lc.text }]}
          unavailableStyle={[styles.total, styles.totalUnavailable]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar precio de ${item.name}`}
        onPress={onEdit}
        hitSlop={6}
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: lc.surfaceElevated },
          pressed && styles.editPressed,
        ]}
      >
        <Ionicons name="pencil" size={c.editIconSize} color={lc.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(c: ReturnType<typeof import('@/theme/scaledCartMetrics').createScaledCartMetrics>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: c.rowPaddingV,
      paddingHorizontal: 2,
      minHeight: c.rowMinHeight,
      borderRadius: 6,
      gap: Math.max(2, c.gap - 1),
      width: '100%',
    },
    thumb: {
      width: c.thumbSize,
      height: c.thumbSize,
      borderRadius: 6,
      backgroundColor: 'transparent',
      flexShrink: 0,
    },
    thumbPlaceholder: {
      width: c.thumbSize,
      height: c.thumbSize,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingRight: 2,
      minWidth: 0,
    },
    name: {
      flex: 1,
      flexShrink: 1,
      fontSize: c.nameFontSize,
      fontWeight: '600',
      lineHeight: Math.round(c.nameFontSize * 1.12),
    },
    manualBadge: {
      marginTop: 1,
      marginLeft: 2,
      fontSize: Math.max(9, c.nameFontSize - 3),
      fontWeight: '900',
      lineHeight: Math.max(10, c.nameFontSize - 2),
      flexShrink: 0,
    },
    qtyControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
      maxWidth: c.qtyColWidth,
    },
    qtyBtnPressable: {
      flexShrink: 0,
    },
    qtyBtn: {
      width: c.qtyBtnSize,
      height: c.qtyBtnSize,
      borderRadius: c.qtyBtnSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    qtySymbol: {
      fontSize: c.qtySymbolSize,
      fontWeight: '800',
      lineHeight: c.qtySymbolSize + 2,
    },
    qty: {
      minWidth: Math.max(14, c.qtyFontSize),
      textAlign: 'center',
      fontSize: c.qtyFontSize,
      fontWeight: '800',
      flexShrink: 0,
    },
    totalWrap: {
      width: c.totalColWidth,
      minWidth: c.totalColWidth,
      maxWidth: c.totalColWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
      flexShrink: 0,
    },
    total: {
      flexShrink: 0,
      textAlign: 'right',
      fontSize: c.totalFontSize,
      fontWeight: '800',
    },
    totalUnavailable: {
      fontSize: Math.max(8, c.totalFontSize - 4),
      fontWeight: '600',
      fontStyle: 'italic',
      color: lc.textMuted,
      lineHeight: Math.max(10, c.totalFontSize - 2),
    },
    editBtn: {
      width: c.editBtnSize,
      height: c.editBtnSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: c.editBtnSize / 2,
      flexShrink: 0,
    },
    editPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.94 }],
    },
  });
}
