import { useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { LocationPermissionExplainer } from '@/components/home/LocationPermissionExplainer';

import { getAppSetting, setAppSetting } from '@/db/database';

import { APP_ZONES, SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import { LOCATION_PERMISSION_MESSAGE } from '@/config/locationPermission';

import { detectZoneFromDevice, showZoneDetectFailure } from '@/services/zoneLocation';
import { syncPromoPushForZone } from '@/services/promoPushNotifications';

import { homeColors } from '@/theme/home';

import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';

export default function ZonaScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showLocationExplainer, setShowLocationExplainer] = useState(false);

  const { styles: menuContentStyles, m, MENU_SECTION_GAP } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hintPanel: {
          marginBottom: MENU_SECTION_GAP,
        },
        hintScroll: {
          maxHeight: Math.round(14 * 1.5 * 5),
        },
        hint: {
          fontSize: 14,
          color: homeColors.textMuted,
          lineHeight: 21,
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
    void syncPromoPushForZone(zone);
  };

  const runDetectZone = async () => {
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
        <ScrollView style={styles.hintScroll} nestedScrollEnabled showsVerticalScrollIndicator>
          <Text style={styles.hint}>{LOCATION_PERMISSION_MESSAGE}</Text>
        </ScrollView>
      </View>

      <LocationPermissionExplainer
        visible={showLocationExplainer}
        onCancel={() => setShowLocationExplainer(false)}
        onContinue={() => {
          setShowLocationExplainer(false);
          void runDetectZone();
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Detectar mi zona con GPS"
        disabled={detectingLocation}
        onPress={() => {
          if (detectingLocation) return;
          setShowLocationExplainer(true);
        }}
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
