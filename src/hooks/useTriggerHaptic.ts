import { useCallback } from 'react';

import { triggerHaptic, type HapticType } from '@/utils/triggerHaptic';

export function useTriggerHaptic() {
  return useCallback((type: HapticType) => {
    triggerHaptic(type);
  }, []);
}
