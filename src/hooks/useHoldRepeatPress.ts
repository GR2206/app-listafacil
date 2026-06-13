import { useCallback, useEffect, useRef } from 'react';

const HOLD_DELAY_MS = 300;
const REPEAT_START_MS = 95;
const REPEAT_MIN_MS = 50;
const REPEAT_ACCEL_MS = 3;
const REPEAT_ACTION_MIN_MS = 130;

interface UseHoldRepeatPressOptions {
  /** Una pulsación corta (sin mantener). */
  onSinglePress: () => void;
  /** Cada tick al mantener; devuelve false solo para frenar por lógica (ej. cantidad mínima). */
  onRepeatTick: () => boolean;
  /** Feedback en tap corto o al iniciar repetición. */
  onAction?: () => void;
  /** Feedback mientras se mantiene (limitado para no saturar audio/háptico). */
  onRepeatAction?: () => void;
  holdDelayMs?: number;
  repeatActionMinIntervalMs?: number;
}

function runRepeatTick(onRepeatTick: () => boolean): boolean {
  try {
    return onRepeatTick();
  } catch {
    return true;
  }
}

export function useHoldRepeatPress({
  onSinglePress,
  onRepeatTick,
  onAction,
  onRepeatAction,
  holdDelayMs = HOLD_DELAY_MS,
  repeatActionMinIntervalMs = REPEAT_ACTION_MIN_MS,
}: UseHoldRepeatPressOptions) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didRepeatRef = useRef(false);
  const isRepeatingRef = useRef(false);
  const lastRepeatActionAtRef = useRef(0);
  const intervalMsRef = useRef(REPEAT_START_MS);
  const onSinglePressRef = useRef(onSinglePress);
  const onRepeatTickRef = useRef(onRepeatTick);
  const onActionRef = useRef(onAction);
  const onRepeatActionRef = useRef(onRepeatAction);

  onSinglePressRef.current = onSinglePress;
  onRepeatTickRef.current = onRepeatTick;
  onActionRef.current = onAction;
  onRepeatActionRef.current = onRepeatAction;

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (repeatTimerRef.current) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    isRepeatingRef.current = false;
  }, []);

  const emitActionFeedback = useCallback(() => {
    if (isRepeatingRef.current) {
      const repeatAction = onRepeatActionRef.current ?? onActionRef.current;
      if (!repeatAction) return;

      const now = Date.now();
      if (now - lastRepeatActionAtRef.current < repeatActionMinIntervalMs) return;
      lastRepeatActionAtRef.current = now;
      try {
        repeatAction();
      } catch {
        // Sin errores visibles por feedback saturado.
      }
      return;
    }

    try {
      onActionRef.current?.();
    } catch {
      // Sin errores visibles por feedback.
    }
  }, [repeatActionMinIntervalMs]);

  const scheduleRepeatTick = useCallback(() => {
    repeatTimerRef.current = setTimeout(() => {
      emitActionFeedback();
      const shouldContinue = runRepeatTick(onRepeatTickRef.current);
      if (!shouldContinue) {
        clearTimers();
        return;
      }

      intervalMsRef.current = Math.max(
        REPEAT_MIN_MS,
        intervalMsRef.current - REPEAT_ACCEL_MS
      );
      scheduleRepeatTick();
    }, intervalMsRef.current);
  }, [clearTimers, emitActionFeedback]);

  const onPressIn = useCallback(() => {
    didRepeatRef.current = false;
    isRepeatingRef.current = false;
    lastRepeatActionAtRef.current = 0;
    intervalMsRef.current = REPEAT_START_MS;
    clearTimers();

    holdTimerRef.current = setTimeout(() => {
      didRepeatRef.current = true;
      isRepeatingRef.current = true;
      emitActionFeedback();
      const shouldContinue = runRepeatTick(onRepeatTickRef.current);
      if (shouldContinue) {
        scheduleRepeatTick();
      } else {
        clearTimers();
      }
    }, holdDelayMs);
  }, [clearTimers, emitActionFeedback, holdDelayMs, scheduleRepeatTick]);

  const onPressOut = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const onPress = useCallback(() => {
    if (!didRepeatRef.current) {
      isRepeatingRef.current = false;
      emitActionFeedback();
      try {
        onSinglePressRef.current();
      } catch {
        // Sin errores visibles en tap corto.
      }
    }
    didRepeatRef.current = false;
    isRepeatingRef.current = false;
  }, [emitActionFeedback]);

  useEffect(() => clearTimers, [clearTimers]);

  return { onPressIn, onPressOut, onPress };
}
