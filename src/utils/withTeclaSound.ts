import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

/** +/- cantidad y zoom A-/A+: feedback y acción en el mismo instante. */
export function withTeclaSound(handler?: () => void): () => void {
  return () => {
    fireInstantFeedback({ sound: 'tecla', haptic: 'light' });
    handler?.();
  };
}
