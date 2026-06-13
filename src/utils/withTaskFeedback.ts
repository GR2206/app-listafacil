import { fireInstantFeedback } from '@/utils/fireInstantFeedback';
import { triggerHaptic, type HapticType } from '@/utils/triggerHaptic';

export function withTaskHaptic(
  handler?: () => void,
  haptic: HapticType = 'medium'
): () => void {
  return () => {
    triggerHaptic(haptic);
    handler?.();
  };
}

/** Acción principal de tarea: tecla + háptico antes de ejecutar la acción. */
export function withTeclaTaskFeedback(
  handler?: () => void,
  haptic: HapticType = 'medium'
): () => void {
  return () => {
    fireInstantFeedback({ sound: 'tecla', haptic });
    handler?.();
  };
}

export function withTaskHapticAndClick(
  handler?: () => void,
  haptic: HapticType = 'medium'
): () => void {
  return withTeclaTaskFeedback(handler, haptic);
}
