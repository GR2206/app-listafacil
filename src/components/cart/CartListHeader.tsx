import { View, Text, StyleSheet, Platform } from 'react-native';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';

import { SUPERMARKET_LOGO_DISCS } from '@/components/home/supermarketOrbTheme';

import { useSupermarketTheme } from '@/context/ThemeContext';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';

import { useLiveSupermarketSyncStatus } from '@/hooks/useLiveSupermarketSyncStatus';

import { useCartStore } from '@/store/cartStore';

import { formatLastUpdateDateTime } from '@/utils/formatPriceSync';



const LOGO_SIZE = 36;



function getLogoDiscBackground(marketId: string): string {

  const disc = SUPERMARKET_LOGO_DISCS[marketId];

  if (disc?.color) return disc.color;

  return 'rgba(255, 255, 255, 0.24)';

}



export function CartListHeader() {

  const { theme } = useSupermarketTheme();

  const supermarketId = useCartStore((s) => s.supermarketId) ?? 'carrefour';

  const supermarketName = useCartStore((s) => s.supermarketName);

  const market = MOCK_SUPERMARKETS.find((m) => m.id === supermarketId);

  const displayName = supermarketName ?? market?.name ?? 'Supermercado';

  const discBorder = SUPERMARKET_LOGO_DISCS[supermarketId]?.border;



  const { lastUpdatedTimestamp, loading: loadingSync } =
    useLiveSupermarketSyncStatus(supermarketId);

  const lastUpdateLabel = loadingSync

    ? '…'

    : formatLastUpdateDateTime(lastUpdatedTimestamp);



  return (

    <View style={styles.row}>

      <View style={styles.titleBlock}>

        <Text style={[styles.title, { color: theme.textOnPrimary }]}>Mi Lista</Text>

        <Text

          style={[styles.lastUpdateLine, { color: theme.textOnPrimary }]}

          numberOfLines={1}

        >

          Última actualización:

        </Text>

        <Text

          style={[styles.lastUpdateLine, { color: theme.textOnPrimary }]}

          numberOfLines={1}

          accessibilityLabel={`Última actualización de precios: ${lastUpdateLabel}`}

        >

          {lastUpdateLabel}

        </Text>

      </View>



      <View style={styles.brandRow}>

        <View

          style={[

            styles.logoDisc,

            {

              width: LOGO_SIZE,

              height: LOGO_SIZE,

              borderRadius: LOGO_SIZE / 2,

              backgroundColor: getLogoDiscBackground(supermarketId),

              borderColor: discBorder ?? 'rgba(255, 255, 255, 0.35)',

            },

            styles.logoShadow,

          ]}

        >

          <SupermarketOrbLogo marketId={supermarketId} orbSize={LOGO_SIZE} />

        </View>



        <Text

          style={[styles.marketName, { color: theme.textOnPrimary }]}

          numberOfLines={1}

          accessibilityLabel={`Supermercado ${displayName}`}

        >

          {displayName}

        </Text>

      </View>

    </View>

  );

}



export const cartListHeaderTitleContainerStyle = {

  flex: 1 as const,

  marginHorizontal: Platform.OS === 'ios' ? 4 : 12,

  maxWidth: undefined as undefined,

};



const styles = StyleSheet.create({

  row: {

    flex: 1,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-start',

    width: '100%',

    minHeight: 44,

    gap: 6,

    paddingTop: 1,

  },

  titleBlock: {

    flex: 1,

    minWidth: 0,

    maxWidth: '62%',

    alignItems: 'flex-start',

    justifyContent: 'flex-start',

  },

  title: {

    fontSize: 17,

    fontWeight: '700',

    letterSpacing: 0.2,

    lineHeight: 20,

  },

  lastUpdateLine: {

    fontSize: 8.5,

    fontWeight: '500',

    opacity: 0.62,

    letterSpacing: 0,

    lineHeight: 10,

  },

  brandRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    flexShrink: 0,

    maxWidth: '38%',

    paddingTop: 2,

  },

  logoDisc: {

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    overflow: 'hidden',

    flexShrink: 0,

  },

  logoShadow: {

    shadowColor: '#000000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.28,

    shadowRadius: 4,

    elevation: 5,

  },

  marketName: {

    fontSize: 13,

    fontWeight: '600',

    flexShrink: 1,

    lineHeight: 16,

  },

});


