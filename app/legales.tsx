import { useMemo } from 'react';

import { View, Text, StyleSheet } from 'react-native';



import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';



import { homeColors } from '@/theme/home';



import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';



export default function LegalesScreen() {

  const { styles: menuContentStyles, m } = useMenuContentStyles();



  const styles = useMemo(

    () =>

      StyleSheet.create({

        sectionTitle: {

          fontSize: m.body,

          fontWeight: '800',

          color: homeColors.text,

          marginBottom: m.spacingXs,

        },

        body: {

          fontSize: m.caption,

          color: homeColors.textMuted,

          lineHeight: Math.round(m.caption * 1.35),

        },

      }),

    [m]

  );



  return (

    <MenuScreenLayout title="Legales">

      <View style={menuContentStyles.sectionPanel}>

        <Text style={styles.sectionTitle}>Términos de uso</Text>

        <Text style={styles.body}>

          Lista Fácil es una herramienta de apoyo para armar listas de compras mediante escaneo de

          códigos de barra. Los precios mostrados son orientativos y pueden variar en el punto de

          venta.

        </Text>

      </View>



      <View style={menuContentStyles.sectionPanel}>

        <Text style={styles.sectionTitle}>Privacidad</Text>

        <Text style={styles.body}>

          No se requiere registro de usuario. Los datos de tus listas y reportes de precio se guardan

          localmente en tu dispositivo. La consulta de productos utiliza Firebase únicamente para

          obtener información pública de catálogo.

        </Text>

      </View>



      <View style={menuContentStyles.sectionPanel}>

        <Text style={styles.sectionTitle}>Responsabilidad</Text>

        <Text style={styles.body}>

          Verificá siempre precios y disponibilidad en el supermercado antes de pagar en caja. Los

          reportes de precio enviados por usuarios serán moderados antes de impactar la base de

          datos.

        </Text>

      </View>



      <View style={menuContentStyles.sectionPanel}>

        <Text style={styles.sectionTitle}>Precios en caja</Text>

        <Text style={styles.body}>

          ListaFacil no se hace responsable si el costo final en caja difiere del mostrado en la

          app o no coincide con el total esperado. Los productos sufren modificaciones de precio de

          forma continua debido a la inflación del país y pueden presentar desfasaje respecto de los

          valores exhibidos en góndola o en las etiquetas del supermercado.

        </Text>

      </View>

    </MenuScreenLayout>

  );

}


