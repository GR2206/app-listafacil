import { useEffect, useState } from 'react';

import { View, Text, ActivityIndicator } from 'react-native';

import { useLocalSearchParams } from 'expo-router';



import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';

import { TicketDetailView } from '@/components/history/TicketDetailView';

import { getCompletedPurchase } from '@/db/database';

import type { CompletedPurchaseRecord } from '@/db/database';

import { homeColors } from '@/theme/home';

import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';



export default function TicketDetailScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();

  const [purchase, setPurchase] = useState<CompletedPurchaseRecord | null>(null);

  const [loading, setLoading] = useState(true);

  const { styles: menuContentStyles } = useMenuContentStyles();



  useEffect(() => {

    if (!id) {

      setLoading(false);

      return;

    }



    void getCompletedPurchase(id).then((record) => {

      setPurchase(record);

      setLoading(false);

    });

  }, [id]);



  if (loading) {

    return (

      <MenuScreenLayout title="Ticket">

        <View style={menuContentStyles.emptyPanel}>

          <ActivityIndicator color={homeColors.neonBlue} />

        </View>

      </MenuScreenLayout>

    );

  }



  if (!purchase) {

    return (

      <MenuScreenLayout title="Ticket">

        <View style={menuContentStyles.emptyPanel}>

          <Text style={menuContentStyles.emptyText}>

            No encontramos este ticket.

          </Text>

        </View>

      </MenuScreenLayout>

    );

  }



  return (

    <MenuScreenLayout title="Ticket">

      <TicketDetailView purchase={purchase} />

    </MenuScreenLayout>

  );

}


