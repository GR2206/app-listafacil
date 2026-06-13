import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';



import { formatPriceDisplay, PRICE_UNAVAILABLE_LABEL } from '@/utils/formatPriceDisplay';

import { isPriceAvailable } from '@/utils/resolvePrice';



interface CartPriceTextProps {

  amount: number;

  style?: StyleProp<TextStyle>;

  unavailableStyle?: StyleProp<TextStyle>;

  numberOfLines?: number;

  adjustsFontSizeToFit?: boolean;

  minimumFontScale?: number;

}



export function CartPriceText({

  amount,

  style,

  unavailableStyle,

  numberOfLines = 2,

  adjustsFontSizeToFit = false,

  minimumFontScale = 0.72,

}: CartPriceTextProps) {

  const unavailable = !isPriceAvailable(amount);



  return (

    <Text

      style={[unavailable ? [styles.unavailable, unavailableStyle] : style]}

      numberOfLines={numberOfLines}

      adjustsFontSizeToFit={adjustsFontSizeToFit}

      minimumFontScale={minimumFontScale}

      accessibilityLabel={

        unavailable ? 'Precio no disponible, consultar en góndola' : formatPriceDisplay(amount)

      }

    >

      {formatPriceDisplay(amount)}

    </Text>

  );

}



const styles = StyleSheet.create({

  unavailable: {

    fontSize: 9,

    fontWeight: '600',

    fontStyle: 'italic',

    color: '#8A8A8A',

    textAlign: 'right',

    lineHeight: 11,

  },

});



export { PRICE_UNAVAILABLE_LABEL };


