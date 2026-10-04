import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';

export function BibliaScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.label}>📖  Bíblia</Text>
      <Text style={s.sub}>Em construção</Text>
    </View>
  );
}

export function BuscaScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.label}>🔍  Busca</Text>
      <Text style={s.sub}>Em construção</Text>
    </View>
  );
}

export function PerfilScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.label}>○  Perfil</Text>
      <Text style={s.sub}>Em construção</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg.base,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
  },
  label: {
    color:      colors.text.primary,
    fontSize:   typography.size.xl,
    fontWeight: typography.weight.semibold,
  },
  sub: {
    color:    colors.text.muted,
    fontSize: typography.size.sm,
  },
});
