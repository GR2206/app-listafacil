import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import { getAppSetting } from '@/db/database';

/** Zona activa (`selected_zone`), se refresca al enfocar la pantalla. */
export function useSelectedZone(): string | null {
  const [zone, setZone] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getAppSetting(SELECTED_ZONE_SETTING_KEY).then(setZone);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return zone;
}
