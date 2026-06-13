import { useMemo, type ReactNode } from 'react';



import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';



import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useRouter } from 'expo-router';



import { Ionicons } from '@expo/vector-icons';



import { AppBackground } from '@/components/layout/AppBackground';

import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';

import { homeColors } from '@/theme/home';



interface MenuScreenLayoutProps {

  title: string;

  children: ReactNode;

}



export function MenuScreenLayout({ title, children }: MenuScreenLayoutProps) {

  const insets = useSafeAreaInsets();

  const router = useRouter();

  const { styles: menuContentStyles, m, MENU_CONTENT_PADDING_H, MENU_CONTENT_PADDING_BOTTOM } =

    useMenuContentStyles();



  const styles = useMemo(

    () =>

      StyleSheet.create({

        backBtn: {

          width: Math.max(32, m.iconLg + 8),

          height: Math.max(32, m.iconLg + 8),

          alignItems: 'center',

          justifyContent: 'center',

        },

        title: {

          flex: 1,

          fontSize: m.title,

          fontWeight: '800',

          color: homeColors.text,

        },

        scroll: {

          paddingHorizontal: MENU_CONTENT_PADDING_H,

          paddingBottom: MENU_CONTENT_PADDING_BOTTOM,

        },

      }),

    [m, MENU_CONTENT_PADDING_H, MENU_CONTENT_PADDING_BOTTOM]

  );



  return (

    <AppBackground paddingTop={insets.top}>

      <View style={menuContentStyles.headerPanel}>

        <Pressable

          onPress={() => router.back()}

          accessibilityLabel="Volver"

          style={styles.backBtn}

          hitSlop={10}

        >

          <Ionicons name="arrow-back" size={m.iconMd} color={homeColors.text} />

        </Pressable>

        <Text style={styles.title}>{title}</Text>

      </View>



      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {children}

      </ScrollView>

    </AppBackground>

  );

}


