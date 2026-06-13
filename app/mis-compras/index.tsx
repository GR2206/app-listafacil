import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { HistoricoTickets } from '@/components/history/HistoricoTickets';
import { listCompletedPurchases } from '@/db/database';
import type { CompletedPurchaseRecord } from '@/db/database';

export default function MisComprasScreen() {
  const [purchases, setPurchases] = useState<CompletedPurchaseRecord[]>([]);

  const reload = useCallback(() => {
    void listCompletedPurchases().then(setPurchases);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <MenuScreenLayout title="Mis Compras">
      <HistoricoTickets purchases={purchases} />
    </MenuScreenLayout>
  );
}
