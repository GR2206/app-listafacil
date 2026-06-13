import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors, typography, touchTargets, radii } from '@/theme';



type KeyDef = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | '0' | 'del' | '';



const KEYS: KeyDef[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];



interface NumericKeypadProps {

  value: string;

  onChange: (value: string) => void;

  allowDecimal?: boolean;

}



export function NumericKeypad({

  value,

  onChange,

  allowDecimal = true,

}: NumericKeypadProps) {

  const handleKey = (key: KeyDef) => {

    if (key === '') return;



    if (key === 'del') {

      onChange(value.slice(0, -1));

      return;

    }



    if (key === '.') {

      if (!allowDecimal || value.includes('.')) return;

      onChange(value.length === 0 ? '0.' : `${value}.`);

      return;

    }



    if (value.length >= 10) return;



    if (value === '0') {

      onChange(key);

      return;

    }



    onChange(value + key);

  };



  return (

    <View style={styles.grid}>

      {KEYS.map((key, index) => {

        if (key === '') {

          return <View key={`empty-${index}`} style={styles.keyEmpty} />;

        }



        const isDelete = key === 'del';



        return (

          <Pressable

            key={`${key}-${index}`}

            accessibilityRole="button"

            accessibilityLabel={isDelete ? 'Borrar' : key === '.' ? 'Punto decimal' : `Tecla ${key}`}

            onPress={() => handleKey(key)}

            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}

          >

            {isDelete ? (

              <Ionicons name="backspace-outline" size={28} color={colors.text} />

            ) : (

              <Text style={styles.keyText}>{key}</Text>

            )}

          </Pressable>

        );

      })}

    </View>

  );

}



const styles = StyleSheet.create({

  grid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent: 'center',

    gap: 10,

  },

  key: {

    width: '30%',

    minHeight: touchTargets.huge,

    backgroundColor: colors.surface,

    borderRadius: radii.lg,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: colors.border,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.08,

    shadowRadius: 3,

    elevation: 2,

  },

  keyEmpty: {

    width: '30%',

    minHeight: touchTargets.huge,

  },

  keyPressed: {

    backgroundColor: colors.primaryLight,

    transform: [{ scale: 0.97 }],

  },

  keyText: {

    fontSize: 28,

    fontWeight: '700',

    color: colors.text,

  },

});


