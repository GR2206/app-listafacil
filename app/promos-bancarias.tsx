import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { FinanzasModule } from '@/components/home/FinanzasModule';

/** Ruta dedicada (menú) — mismo look que la página derecha del pager. */
export default function PromosBancariasScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <FinanzasModule
      width={width}
      showBackButton
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
