import { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { TicketDetailView } from '@/components/history/TicketDetailView';
import { deleteCompletedPurchase, getCompletedPurchase } from '@/db/database';
import type { CompletedPurchaseRecord } from '@/db/database';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { formatCurrency } from '@/utils/formatCurrency';
import { withClickSound } from '@/utils/withClickSound';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [purchase, setPurchase] = useState<CompletedPurchaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { styles: menuContentStyles, m } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        deleteBtn: {
          marginTop: m.spacingMd,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 12,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: 'rgba(193, 18, 31, 0.55)',
          backgroundColor: 'rgba(193, 18, 31, 0.12)',
        },
        deleteBtnPressed: {
          opacity: 0.85,
        },
        deleteBtnText: {
          fontSize: m.body,
          fontWeight: '800',
          color: '#FF8A8A',
        },
      }),
    [m]
  );

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

  const confirmDelete = () => {
    if (!purchase) return;
    Alert.alert(
      'Eliminar ticket',
      `¿Borrar la compra de ${purchase.supermarketName} (${formatCurrency(purchase.total)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteCompletedPurchase(purchase.id);
              router.back();
            })();
          },
        },
      ]
    );
  };

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
          <Text style={menuContentStyles.emptyText}>No encontramos este ticket.</Text>
        </View>
      </MenuScreenLayout>
    );
  }

  return (
    <MenuScreenLayout title="Ticket">
      <TicketDetailView purchase={purchase} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Eliminar este ticket de compra"
        onPress={withClickSound(confirmDelete)}
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
      >
        <Ionicons name="trash-outline" size={18} color="#FF8A8A" />
        <Text style={styles.deleteBtnText}>Eliminar ticket</Text>
      </Pressable>
    </MenuScreenLayout>
  );
}
