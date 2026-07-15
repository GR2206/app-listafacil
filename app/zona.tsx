import { useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';

import { getAppSetting, setAppSetting } from '@/db/database';

import { APP_ZONES, SELECTED_ZONE_SETTING_KEY } from '@/config/zones';

import { detectZoneFromDevice, showZoneDetectFailure } from '@/services/zoneLocation';

import { homeColors } from '@/theme/home';

import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';

export default function ZonaScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const { styles: menuContentStyles, m, MENU_SECTION_GAP } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hintPanel: {
          marginBottom: MENU_SECTION_GAP,
        },
        hint: {
          fontSize: m.caption,
          color: homeColors.textMuted,
          lineHeight: Math.round(m.caption * 1.35),
        },
        detectBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: m.spacingSm,
          marginBottom: MENU_SECTION_GAP,
          borderColor: homeColors.logoRing,
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
        },
        detectBtnPressed: {
          opacity: 0.82,
        },
        detectBtnText: {
          fontSize: m.body,
          fontWeight: '700',
          color: homeColors.text,
        },
        option: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: m.spacingSm + 4,
        },
        optionActive: {
          borderColor: homeColors.logoRing,
        },
        optionText: {
          fontSize: m.body,
          color: homeColors.text,
          fontWeight: '600',
        },
        optionTextActive: {
          fontWeight: '800',
        },
      }),
    [m, MENU_SECTION_GAP]
  );

  useEffect(() => {
    void getAppSetting(SELECTED_ZONE_SETTING_KEY).then(setSelected);
  }, []);

  const selectZone = async (zone: string) => {
    setSelected(zone);
    await setAppSetting(SELECTED_ZONE_SETTING_KEY, zone);
  };

  const detectZone = async () => {
    if (detectingLocation) return;

    setDetectingLocation(true);
    try {
      const result = await detectZoneFromDevice();
      if (!result.ok) {
        showZoneDetectFailure(result);
        return;
      }

      await selectZone(result.zone);
      Alert.alert('Zona detectada', `Te asignamos: ${result.zone}`);
    } finally {
      setDetectingLocation(false);
    }
  };

  return (
    <MenuScreenLayout title="Cambiar de Zona">
      <View style={[menuContentStyles.panel, styles.hintPanel]}>
        <Text style={styles.hint}>
          Elegí tu ciudad o detectala con GPS. En Rosario ves supers locales; en otras ciudades
          aparecen las cadenas nacionales (Coto, Carrefour, Jumbo). Solo usamos la ubicación
          cuando tocás el botón; no rastreamos en segundo plano.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Detectar mi zona con GPS"
        disabled={detectingLocation}
        onPress={() => void detectZone()}
        style={({ pressed }) => [
          menuContentStyles.card,
          styles.detectBtn,
          pressed && !detectingLocation && styles.detectBtnPressed,
        ]}
      >
        {detectingLocation ? (
          <ActivityIndicator size="small" color={homeColors.logoRing} />
        ) : (
          <Ionicons name="locate-outline" size={m.iconMd} color={homeColors.logoRing} />
        )}
        <Text style={styles.detectBtnText}>
          {detectingLocation ? 'Detectando ubicación…' : 'Detectar mi zona con GPS'}
        </Text>
      </Pressable>

      {APP_ZONES.map((zone) => {
        const active = selected === zone;

        return (
          <Pressable
            key={zone}
            onPress={() => void selectZone(zone)}
            style={[menuContentStyles.card, styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{zone}</Text>
            {active ? (
              <Ionicons name="checkmark-circle" size={m.iconMd} color={homeColors.logoRing} />
            ) : null}
          </Pressable>
        );
      })}
    </MenuScreenLayout>
  );
}
