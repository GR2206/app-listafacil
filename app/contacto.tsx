import { useMemo } from 'react';

import { View, Text, StyleSheet, Pressable } from 'react-native';



import { Ionicons } from '@expo/vector-icons';



import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';



import { homeColors } from '@/theme/home';



import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';

import { openExternalUrl } from '@/utils/safeLinking';




const CONTACT_EMAIL = 'listafacilgr@gmail.com';



export default function ContactoScreen() {

  const { styles: menuContentStyles, m } = useMenuContentStyles();

  const styles = useMemo(

    () =>

      StyleSheet.create({

        body: {

          fontSize: m.body,

          color: homeColors.textMuted,

          lineHeight: Math.round(m.body * 1.35),

        },

        card: {

          flexDirection: 'row',

          alignItems: 'center',

          gap: m.spacingSm,

          marginBottom: 0,

        },

        email: {

          fontSize: m.body,

          fontWeight: '700',

          color: homeColors.text,

        },

      }),

    [m]

  );



  const openMail = () => {
    void openExternalUrl(`mailto:${CONTACT_EMAIL}?subject=Consulta%20Lista%20F%C3%A1cil`, {
      failTitle: 'No se pudo abrir el correo',
      failMessage: 'Configurá una app de email en tu dispositivo o escribinos a listafacilgr@gmail.com',
    });
  };



  return (

    <MenuScreenLayout title="Contacto">

      <View style={menuContentStyles.panel}>

        <Text style={styles.body}>
          ¿Tenés dudas, sugerencias o querés anunciar tu comercio? ¿Querés sumar tu súper a nuestra
          app? Escribinos y te respondemos a la brevedad.
        </Text>

      </View>



      <Pressable style={[menuContentStyles.card, styles.card]} onPress={openMail}>

        <Ionicons name="mail-outline" size={m.iconMd} color={homeColors.text} />

        <Text style={styles.email}>{CONTACT_EMAIL}</Text>

      </Pressable>

    </MenuScreenLayout>

  );

}


