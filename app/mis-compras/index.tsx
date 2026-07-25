import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { HistoricoTickets } from '@/components/history/HistoricoTickets';
import {
  clearCompletedPurchases,
  deleteCompletedPurchase,
  listCompletedPurchases,
} from '@/db/database';
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

  const handleDeletePurchase = useCallback(
    (id: string) => {
      void (async () => {
        await deleteCompletedPurchase(id);
        setPurchases((prev) => prev.filter((item) => item.id !== id));
      })();
    },
    []
  );

  const handleClearAll = useCallback(() => {
    void (async () => {
      await clearCompletedPurchases();
      setPurchases([]);
    })();
  }, []);

  return (
    <MenuScreenLayout title="Mis Compras">
      <HistoricoTickets
        purchases={purchases}
        onDeletePurchase={handleDeletePurchase}
        onClearAll={handleClearAll}
      />
    </MenuScreenLayout>
  );
}
