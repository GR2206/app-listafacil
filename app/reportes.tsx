import { useEffect, useMemo, useState } from 'react';



import { View, Text, StyleSheet } from 'react-native';



import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';



import { listPriceReports } from '@/db/database';



import type { PriceReportRecord } from '@/db/database';



import { formatCurrency } from '@/utils/formatCurrency';



import { homeColors } from '@/theme/home';



import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';



export default function ReportesScreen() {

  const [reports, setReports] = useState<PriceReportRecord[]>([]);

  const { styles: menuContentStyles, m } = useMenuContentStyles();



  const styles = useMemo(

    () =>

      StyleSheet.create({

        name: {

          fontSize: m.body,

          fontWeight: '700',

          color: homeColors.text,

        },

        priceLine: {

          fontSize: m.caption,

          color: homeColors.text,

          marginTop: 6,

          fontWeight: '600',

        },

        meta: {

          fontSize: Math.max(9, m.caption - 2),

          color: homeColors.textMuted,

          marginTop: 4,

        },

      }),

    [m]

  );



  useEffect(() => {

    void listPriceReports().then(setReports);

  }, []);



  return (

    <MenuScreenLayout title="Mis Reportes">

      {reports.length === 0 ? (

        <View style={menuContentStyles.emptyPanel}>

          <Text style={menuContentStyles.emptyText}>No enviaste reportes de precio todavía.</Text>

        </View>

      ) : (

        reports.map((report) => (

          <View key={report.id} style={menuContentStyles.card}>

            <Text style={styles.name} numberOfLines={2}>

              {report.productName}

            </Text>

            <Text style={styles.priceLine}>

              {formatCurrency(report.previousPrice)} → {formatCurrency(report.reportedPrice)}

            </Text>

            <Text style={styles.meta}>

              {report.status} · {new Date(report.createdAt).toLocaleDateString('es-AR')}

            </Text>

          </View>

        ))

      )}

    </MenuScreenLayout>

  );

}


