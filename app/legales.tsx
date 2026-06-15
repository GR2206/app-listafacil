import { useMemo } from 'react';

import { View, Text, StyleSheet, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import {
  DATA_SOURCES_DISCLAIMER,
  SUPERMARKET_PUBLIC_SOURCES,
} from '@/data/supermarketPublicSources';
import { homeColors } from '@/theme/home';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { openExternalUrl } from '@/utils/safeLinking';

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
        sourceRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.spacingSm,
          paddingVertical: 8,
        },
        sourceName: {
          flex: 1,
          fontSize: m.caption,
          fontWeight: '700',
          color: homeColors.text,
        },
        sourceLink: {
          fontSize: m.caption,
          fontWeight: '600',
          color: homeColors.logoRing,
          textDecorationLine: 'underline',
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: homeColors.border,
        },
      }),
    [m]
  );

  const openSource = (url: string, name: string) => {
    void openExternalUrl(url, {
      failTitle: 'No se pudo abrir el enlace',
      failMessage: `No pudimos abrir el sitio de ${name}. Copiá la URL desde la sección Legales.`,
    });
  };

  return (
    <MenuScreenLayout title="Legales">
      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionTitle}>Fuentes de datos</Text>
        <Text style={styles.body}>{DATA_SOURCES_DISCLAIMER}</Text>
      </View>

      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionTitle}>Sitios públicos de cada supermercado</Text>
        <Text style={[styles.body, { marginBottom: m.spacingSm }]}>
          Los catálogos y precios orientativos se obtienen de las plataformas oficiales o públicas de
          cada cadena. Podés consultarlas directamente en:
        </Text>

        {SUPERMARKET_PUBLIC_SOURCES.map((source, index) => (
          <View key={source.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Abrir sitio de ${source.name}`}
              onPress={() => openSource(source.websiteUrl, source.name)}
              style={({ pressed }) => [styles.sourceRow, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.sourceName}>{source.name}</Text>
              <Text style={styles.sourceLink}>{source.websiteLabel}</Text>
              <Ionicons name="open-outline" size={16} color={homeColors.logoRing} />
            </Pressable>
          </View>
        ))}
      </View>

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
          localmente en tu dispositivo. La consulta de productos utiliza Firebase para sincronizar
          información de catálogo derivada de fuentes públicas de cada supermercado.
        </Text>
      </View>

      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionTitle}>Responsabilidad</Text>
        <Text style={styles.body}>
          Verificá siempre precios y disponibilidad en el supermercado antes de pagar en caja. Los
          reportes de precio enviados por usuarios serán moderados antes de impactar la base de datos.
          Los productos nuevos cargados por usuarios requieren revisión y aprobación administrativa.
        </Text>
      </View>

      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionTitle}>Precios en caja</Text>
        <Text style={styles.body}>
          Lista Fácil no se hace responsable si el costo final en caja difiere del mostrado en la app o
          no coincide con el total esperado. Los productos sufren modificaciones de precio de forma
          continua debido a la inflación del país y pueden presentar desfasaje respecto de los valores
          exhibidos en góndola o en las etiquetas del supermercado.
        </Text>
      </View>
    </MenuScreenLayout>
  );
}
