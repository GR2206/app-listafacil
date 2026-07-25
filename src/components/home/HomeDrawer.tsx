import { useEffect, useMemo, useRef, useState } from 'react';



import {

  Modal,

  View,

  Text,

  Pressable,

  StyleSheet,

  Animated,

  Dimensions,

  ScrollView,

} from 'react-native';



import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { Ionicons } from '@expo/vector-icons';



import { useRouter } from 'expo-router';



import { MerchantLoginModal } from '@/components/merchant/MerchantLoginModal';
import { ShareAppQrFooter } from '@/components/home/ShareAppQrFooter';

import { IS_ADMIN } from '@/config/admin';

import { useMerchantAuthStore } from '@/store/merchantAuthStore';

import { useCartListScale } from '@/context/CartListScaleContext';

import { createScaledMenuMetrics } from '@/theme/scaledMenuMetrics';



import { homeColors } from '@/theme/home';

import { withNavFeedback } from '@/utils/withNavFeedback';



import { radii } from '@/theme';



const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.78);



const BASE_MENU_ITEMS = [

  { id: 'mis-compras', label: 'Mis Compras', icon: 'receipt-outline' as const, href: '/mis-compras' },

  { id: 'crear-lista', label: 'Crear Lista compras', icon: 'checkbox-outline' as const, href: '/crear-lista' },

  { id: 'buscar', label: 'Buscar producto', icon: 'search-outline' as const, href: '/buscar' },

  { id: 'promos-bancarias', label: 'Hoy en mi bolsillo', icon: 'card-outline' as const, href: '/promos-bancarias' },

  { id: 'reportes', label: 'Mis Reportes', icon: 'flag-outline' as const, href: '/reportes' },

  { id: 'zona', label: 'Cambiar de Zona', icon: 'location-outline' as const, href: '/zona' },

  { id: 'contacto', label: 'Contacto', icon: 'mail-outline' as const, href: '/contacto' },

  { id: 'legales', label: 'Legales', icon: 'document-text-outline' as const, href: '/legales' },

];



const MERCHANT_MENU_ITEM = {

  id: 'comerciante',

  label: 'Dashboard Comerciante',

  icon: 'stats-chart-outline' as const,

  href: '/comerciante',

};



const ADMIN_REVISION_MENU_ITEM = {

  id: 'revision-productos',

  label: 'Revisión de productos',

  icon: 'construct-outline' as const,

  href: '/revision-productos',

};

const ORB_PREVIEW_MENU_ITEM = {
  id: 'orb-preview',
  label: 'Vista previa botones',
  icon: 'color-wand-outline' as const,
  href: '/orb-preview',
};



interface HomeDrawerProps {

  visible: boolean;

  onClose: () => void;

}



export function HomeDrawer({ visible, onClose }: HomeDrawerProps) {

  const insets = useSafeAreaInsets();

  const router = useRouter();

  const { scale } = useCartListScale();
  const m = useMemo(() => createScaledMenuMetrics(scale), [scale]);

  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const canAccessMerchantPanel = useMerchantAuthStore((s) => s.canAccessMerchantPanel);

  const [loginOpen, setLoginOpen] = useState(false);



  const menuItems = canAccessMerchantPanel

    ? [

        BASE_MENU_ITEMS[0],

        BASE_MENU_ITEMS[1],

        MERCHANT_MENU_ITEM,

        ...(IS_ADMIN ? [ADMIN_REVISION_MENU_ITEM] : []),

        ...BASE_MENU_ITEMS.slice(2),

        ...(typeof __DEV__ !== 'undefined' && __DEV__ ? [ORB_PREVIEW_MENU_ITEM] : []),

      ]

    : [
        ...BASE_MENU_ITEMS,
        ...(typeof __DEV__ !== 'undefined' && __DEV__ ? [ORB_PREVIEW_MENU_ITEM] : []),
      ];



  const styles = useMemo(

    () =>

      StyleSheet.create({

        root: {

          flex: 1,

          flexDirection: 'row',

        },

        backdrop: {

          flex: 1,

          backgroundColor: 'rgba(0,0,0,0.52)',

        },

        panel: {

          position: 'absolute',

          left: 0,

          top: 0,

          bottom: 0,

          backgroundColor: homeColors.panel,

          borderRightWidth: 1,

          borderRightColor: homeColors.border,

        },

        panelInner: {

          flex: 1,

          paddingHorizontal: m.spacingMd,

        },

        menuScroll: {

          flex: 1,

        },

        panelHeader: {

          flexDirection: 'row',

          alignItems: 'center',

          justifyContent: 'space-between',

          marginBottom: m.spacingLg,

        },

        panelTitle: {

          fontSize: m.bodyLarge,

          fontWeight: '800',

          color: homeColors.text,

        },

        panelSubtitle: {

          fontSize: Math.max(9, m.caption - 2),

          fontWeight: '700',

          color: homeColors.textMuted,

          textTransform: 'uppercase',

          letterSpacing: 0.8,

          marginBottom: m.spacingSm,

        },

        menuItem: {

          flexDirection: 'row',

          alignItems: 'center',

          gap: m.spacingSm,

          paddingVertical: Math.max(8, m.spacingSm),

          paddingHorizontal: m.spacingSm,

          borderRadius: radii.md,

          marginBottom: 3,

        },

        menuItemPressed: {

          backgroundColor: homeColors.surfaceElevated,

        },

        menuLabel: {

          flex: 1,

          fontSize: m.body,

          fontWeight: '600',

          color: homeColors.text,

        },

      }),

    [m]

  );



  useEffect(() => {

    Animated.timing(slide, {

      toValue: visible ? 0 : -DRAWER_WIDTH,

      duration: 220,

      useNativeDriver: true,

    }).start();

  }, [visible, slide]);



  const navigate = (href: string) => {

    onClose();

    setTimeout(() => router.push(href as never), 180);

  };



  return (

    <>

      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>

        <View style={styles.root}>

          <Pressable

            style={styles.backdrop}

            onPress={withNavFeedback(onClose)}

            accessibilityLabel="Cerrar menú"

          />



          <Animated.View

            style={[

              styles.panel,

              {

                width: DRAWER_WIDTH,

                paddingTop: insets.top + m.spacingMd,

                paddingBottom: insets.bottom + m.spacingSm,

                transform: [{ translateX: slide }],

              },

            ]}

          >

            <View style={styles.panelInner}>

            <View style={styles.panelHeader}>

              <Pressable

                onLongPress={() => setLoginOpen(true)}

                delayLongPress={700}

                accessibilityLabel="Lista Fácil"

              >

                <Text style={styles.panelTitle}>Lista Fácil</Text>

              </Pressable>

              <Pressable onPress={withNavFeedback(onClose)} hitSlop={12} accessibilityLabel="Cerrar menú">

                <Ionicons name="close" size={m.iconLg} color={homeColors.textMuted} />

              </Pressable>

            </View>



            <Text style={styles.panelSubtitle}>Menú</Text>



            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>

            {menuItems.map((item) => (

              <Pressable

                key={item.id}

                accessibilityRole="button"

                accessibilityLabel={item.label}

                onPress={withNavFeedback(() => navigate(item.href))}

                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}

              >

                <Ionicons name={item.icon} size={m.iconMd} color={homeColors.text} />

                <Text style={styles.menuLabel}>{item.label}</Text>

                <Ionicons name="chevron-forward" size={m.iconSm} color={homeColors.textMuted} />

              </Pressable>

            ))}

            </ScrollView>

            <ShareAppQrFooter metrics={m} />

            </View>

          </Animated.View>

        </View>

      </Modal>



      <MerchantLoginModal visible={loginOpen} onClose={() => setLoginOpen(false)} />

    </>

  );

}


