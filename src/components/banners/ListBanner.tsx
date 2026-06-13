import { View, StyleSheet } from 'react-native';

import { ListCyberBanner } from '@/components/banners/ListCyberBanner';
import { useCartStore } from '@/store/cartStore';

export function ListBanner() {
  const supermarketId = useCartStore((s) => s.supermarketId) ?? 'carrefour';

  return (
    <View style={styles.wrap}>
      <ListCyberBanner supermarketId={supermarketId} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
