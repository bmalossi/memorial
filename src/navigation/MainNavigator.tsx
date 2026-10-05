import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { LinhasagradaScreen } from '../screens/main/LinhasagradaScreen';
import { BibliaScreen } from '../screens/main/BibliaScreen';
import { BuscaScreen } from '../screens/main/BuscaScreen';
import { PerfilScreen } from '../screens/main/PerfilScreen';

export type MainTabParamList = {
  LinhaSagrada: undefined;
  Biblia: {
    book_slug?: string;
    chapter?: number;
    verse?: number;
    highlight_source?: 'conexao' | 'marco';
    connection_explanation?: string;
    marco_title?: string;
  } | undefined;
  Busca:        undefined;
  Perfil:       undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICONS: Record<string, FeatherName> = {
  LinhaSagrada: 'bookmark',
  Biblia:       'book-open',
  Busca:        'search',
  Perfil:       'user',
};

const TAB_LABELS: Record<string, string> = {
  LinhaSagrada: 'Linha Sagrada',
  Biblia:       'Bíblia',
  Busca:        'Busca',
  Perfil:       'Perfil',
};

export function MainNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopWidth:  StyleSheet.hairlineWidth,
          borderTopColor:  colors.border.DEFAULT,
          height:          Platform.OS === 'ios' ? 84 : 66,
          paddingTop:      8,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 10,
          elevation:       12,
          shadowColor:     isDark ? '#000' : '#3A3228',
          shadowOffset:    { width: 0, height: -2 },
          shadowOpacity:   isDark ? 0.3 : 0.08,
          shadowRadius:    8,
        },
        tabBarActiveTintColor:   colors.amber.DEFAULT,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarShowLabel: true,
        tabBarIcon: ({ color }) => (
          <Feather
            name={TAB_ICONS[route.name]}
            size={20}
            color={color}
          />
        ),
        tabBarLabel: ({ focused, color }) => (
          <Text style={[tabLabelStyle, { color, fontWeight: focused ? '600' : '400' }]}>
            {TAB_LABELS[route.name]}
          </Text>
        ),
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: colors.bg.surface }} />
        ),
      })}
    >
      <Tab.Screen name="LinhaSagrada" component={LinhasagradaScreen} />
      <Tab.Screen name="Biblia"       component={BibliaScreen} />
      <Tab.Screen name="Busca"        component={BuscaScreen} />
      <Tab.Screen name="Perfil"       component={PerfilScreen} />
    </Tab.Navigator>
  );
}

const tabLabelStyle: any = {
  fontSize:      11,
  marginTop:     2,
  letterSpacing: 0.2,
};
