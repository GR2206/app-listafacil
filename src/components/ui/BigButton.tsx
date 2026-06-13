import {
  Pressable,
  Text,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { colors, typography, radii, touchTargets } from '@/theme';

interface BigButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  style?: ViewStyle;
}

export function BigButton({
  label,
  variant = 'primary',
  style,
  disabled,
  ...rest
}: BigButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, variant === 'outline' && styles.labelOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargets.huge,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.accent,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.button,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  labelOutline: {
    color: colors.primary,
  },
});
