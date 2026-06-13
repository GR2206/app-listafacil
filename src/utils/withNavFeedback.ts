import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

/** Menú principal: click + háptico antes de la acción para evitar cortes al navegar. */
export function withNavFeedback(handler?: () => void): () => void {
  return () => {
    fireInstantFeedback({ sound: 'click', haptic: 'selection' });
    handler?.();
  };
}
