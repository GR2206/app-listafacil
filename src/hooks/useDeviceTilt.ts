import { useEffect, useRef, useState } from 'react';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';

const SMOOTHING = 0.12;
const UPDATE_MS = 48;

export interface DeviceTilt {
  x: number;
  y: number;
}

export function useDeviceTilt(enabled = true): DeviceTilt {
  const [tilt, setTilt] = useState<DeviceTilt>({ x: 0, y: 0 });
  const smoothed = useRef<DeviceTilt>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    void (async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (!available || !mounted) return;

      Accelerometer.setUpdateInterval(UPDATE_MS);
      subscription = Accelerometer.addListener((measurement: AccelerometerMeasurement) => {
        const targetX = Math.max(-1, Math.min(1, measurement.x)) * 0.35;
        const targetY = Math.max(-1, Math.min(1, -measurement.y)) * 0.28;

        smoothed.current = {
          x: smoothed.current.x + (targetX - smoothed.current.x) * SMOOTHING,
          y: smoothed.current.y + (targetY - smoothed.current.y) * SMOOTHING,
        };

        setTilt({ ...smoothed.current });
      });
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [enabled]);

  return tilt;
}
